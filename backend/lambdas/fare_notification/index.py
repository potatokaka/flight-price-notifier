"""flight-fare-notification: SQS consumer that emails a fare alert via Resend.

Per message (schema written by flight-parser):
  {"email", "route", "plan_name", "target_price",
   "cheapest": {price, currency:"TWD", airline, depart_date, return_date},
   "cheapest_usd": {...USD...}   # optional}

1. Dedup against notification_history (pk="{email}#{route}", sent_at ISO-8601 UTC).
2. Render NT$ subject + html + text (optional 約 US$ line, 「立即訂購」 link).
3. POST to Resend. Only on a 2xx write the history row.
   429/5xx/network -> raise so SQS redelivers. 403/422/other 4xx -> log and drop.
"""
import html
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

UA = "Mozilla/5.0 (compatible; flight-notifier/1.0)"
FLOOR_HOURS = float(os.environ.get("NOTIFY_FLOOR_HOURS", "24"))
REALERT_PCT = Decimal(os.environ.get("REALERT_PCT", "20"))
REALERT_ABS = Decimal(os.environ.get("REALERT_ABS_TWD", "2000"))
SECRET_ID = os.environ.get("RESEND_SECRET_ID", "flight/resend")

_history = boto3.resource("dynamodb").Table("notification_history")
_sm = boto3.client("secretsmanager")
_cache = {}

CITY = {"TPE": "台北", "TYO": "東京", "SEL": "首爾"}


class Transient(Exception):
    """Retryable failure: let SQS redeliver the message."""


# ---------- rendering ----------

def _city(code):
    return CITY.get(code, code)


def _route_label(route):
    origin, _, dest = route.partition("-")
    return f"{_city(origin)} → {_city(dest)}"


def _money(n):
    return f"{int(round(float(n))):,}"


def _date(iso):
    return (iso or "")[:10]


def _ddmm(iso):
    d = _date(iso)
    return f"{d[8:10]}{d[5:7]}" if len(d) == 10 else ""


def booking_url(fare, marker=None):
    """Aviasales search deep link: ORIGIN+DDMM+DEST[+DDMM]+passengers."""
    origin, _, dest = fare["route"].partition("-")
    path = f"{origin}{_ddmm(fare.get('depart_date'))}{dest}{_ddmm(fare.get('return_date'))}1"
    url = f"https://www.aviasales.com/search/{path}"
    return f"{url}?marker={marker}" if marker else url


def subject(fare):
    return f"✈️ {_route_label(fare['route'])} 降價通知！NT${_money(fare['price'])} 已達標"


def _dates_line(fare):
    dep, ret = _date(fare.get("depart_date")), _date(fare.get("return_date"))
    if dep and ret:
        return f"去程 {dep} · 回程 {ret}"
    return f"去程 {dep}" if dep else ""


def render_text(fare, target_price, marker=None, usd_price=None):
    lines = [
        f"{_route_label(fare['route'])} 目前最低 NT${_money(fare['price'])}",
    ]
    if usd_price is not None:
        lines.append(f"（約 US${_money(usd_price)}）")
    lines += [
        f"你的目標價：NT${_money(target_price)}",
    ]
    if fare.get("airline"):
        lines.append(f"航空公司：{fare['airline']}")
    if _dates_line(fare):
        lines.append(_dates_line(fare))
    lines += ["", f"立即訂購：{booking_url(fare, marker)}", "",
              "票價隨時變動，以訂票網站顯示為準。", "— Flight Price Notifier"]
    return "\n".join(lines)


def render_html(fare, target_price, marker=None, usd_price=None):
    e = html.escape
    usd = (f'<p style="margin:4px 0 0;color:#4f6782;font-size:15px">約 US${_money(usd_price)}</p>'
           if usd_price is not None else "")
    airline = (f'<p style="margin:4px 0;color:#4f6782">航空公司：{e(str(fare["airline"]))}</p>'
               if fare.get("airline") else "")
    dates = (f'<p style="margin:4px 0;color:#4f6782">{e(_dates_line(fare))}</p>'
             if _dates_line(fare) else "")
    return f"""<!doctype html>
<html lang="zh-Hant"><body style="margin:0;padding:24px;background:#f8fafc;font-family:'Noto Sans TC',-apple-system,'Segoe UI',sans-serif;color:#17324f">
<div style="max-width:480px;margin:0 auto">
<p style="margin:0 0 8px;font-size:15px">{e(_route_label(fare['route']))} 票價已達到你的目標！</p>
<p style="margin:0;font-size:32px;font-weight:700">NT${_money(fare['price'])}</p>
{usd}
<p style="margin:16px 0 4px">你的目標價：NT${_money(target_price)}</p>
{airline}{dates}
<p style="margin:24px 0">
<a href="{e(booking_url(fare, marker))}" style="display:inline-block;padding:12px 24px;background:#2c6db0;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">立即訂購</a>
</p>
<p style="margin:0;font-size:12px;color:#4f6782">票價隨時變動，以訂票網站顯示為準。<br>— Flight Price Notifier</p>
</div></body></html>"""


# ---------- dedup ----------

def should_send(last, new_price, now=None):
    """last: latest notification_history row or None."""
    if not last:
        return True
    now = now or datetime.now(timezone.utc)
    sent_at = datetime.fromisoformat(last["sent_at"].replace("Z", "+00:00"))
    if now - sent_at >= timedelta(hours=FLOOR_HOURS):
        return True
    last_price, new = Decimal(str(last["price"])), Decimal(str(new_price))
    return new <= last_price * (1 - REALERT_PCT / 100) or (last_price - new) >= REALERT_ABS


def _last_sent(pk):
    items = _history.query(KeyConditionExpression=Key("pk").eq(pk),
                           ScanIndexForward=False, Limit=1).get("Items", [])
    return items[0] if items else None


# ---------- sending ----------

def _resend():
    if "resend" not in _cache:
        _cache["resend"] = json.loads(_sm.get_secret_value(SecretId=SECRET_ID)["SecretString"])
    return _cache["resend"]


def send_email(api_key, frm, to, subj, html_body, text_body):
    """Returns the Resend id on 2xx, None for a permanent failure; raises Transient."""
    payload = {"from": frm, "to": to, "subject": subj, "html": html_body, "text": text_body}
    req = urllib.request.Request(
        "https://api.resend.com/emails", data=json.dumps(payload).encode(), method="POST",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json",
                 "User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read() or b"{}").get("id", "ok")
    except urllib.error.HTTPError as ex:
        detail = ex.read().decode(errors="replace")[:300]
        if ex.code == 429 or ex.code >= 500:
            raise Transient(f"resend {ex.code}: {detail}")
        print(f"RESEND_DROP {ex.code} (permanent) to={to}: {detail}")
        return None
    except (urllib.error.URLError, TimeoutError) as ex:
        raise Transient(f"resend network error: {ex}")


def process(msg, now=None):
    email, route = msg["email"], msg["route"]
    tw = msg["cheapest"]
    fare = dict(tw, route=route)
    pk = f"{email}#{route}"

    last = _last_sent(pk)
    if not should_send(last, tw["price"], now):
        print(f"skipped (deduped) {pk} new={tw['price']} last={last and last.get('price')}")
        return "skipped"

    usd = (msg.get("cheapest_usd") or {}).get("price")
    secret = _resend()
    sent_id = send_email(secret["api_key"], secret.get("from", "onboarding@resend.dev"), email,
                         subject(fare), render_html(fare, msg["target_price"], usd_price=usd),
                         render_text(fare, msg["target_price"], usd_price=usd))
    if not sent_id:
        return "dropped"

    _history.put_item(Item={"pk": pk, "sent_at": (now or datetime.now(timezone.utc)).isoformat(),
                            "email": email, "route": route,
                            "price": Decimal(str(tw["price"])), "currency": "TWD",
                            "resend_id": str(sent_id)})
    print(f"RESEND_OK {pk} NT${tw['price']} id={sent_id}")
    return "sent"


def handler(event, context):
    results = []
    for record in event.get("Records", []):
        try:
            msg = json.loads(record["body"])
        except ValueError:
            print("dropping unparseable message:", record.get("body", "")[:200])
            continue
        results.append(process(msg))  # Transient propagates -> SQS redelivers the batch
    return {"ok": True, "results": results}
