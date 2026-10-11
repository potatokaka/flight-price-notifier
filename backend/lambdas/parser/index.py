"""flight-parser: one route per invocation.

Event: {"origin": "TPE", "destination": "TYO", "route": "TPE-TYO", "plan": "tokyo"}

1. Read the Travelpayouts token from Secrets Manager (flight/travelpayouts).
2. Fetch next month's cheapest fare in TWD (the gate). Empty / 429 -> log and stop.
3. Best-effort fetch in USD for the email's supplementary line (never blocks).
4. Scan `subscriptions` for this route (M1: no status filter - every row is eligible).
5. Enqueue one SQS message per subscriber whose target_price >= cheapest TWD price.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr

UA = "Mozilla/5.0 (compatible; flight-notifier/1.0)"
SECRET_ID = os.environ.get("TP_SECRET_ID", "flight/travelpayouts")
QUEUE_NAME = os.environ.get("FARE_QUEUE_NAME", "flight-fare-queue")

_ddb = boto3.resource("dynamodb").Table("subscriptions")
_sqs = boto3.client("sqs")
_sm = boto3.client("secretsmanager")
_cache = {}


def _token():
    if "token" not in _cache:
        raw = _sm.get_secret_value(SecretId=SECRET_ID)["SecretString"]
        try:
            parsed = json.loads(raw)
            _cache["token"] = parsed["token"] if isinstance(parsed, dict) else str(parsed)
        except ValueError:
            _cache["token"] = raw.strip()  # tolerate a bare-string secret
    return _cache["token"]


def _queue_url():
    if "qurl" not in _cache:
        _cache["qurl"] = os.environ.get("FARE_QUEUE_URL") or _sqs.get_queue_url(QueueName=QUEUE_NAME)["QueueUrl"]
    return _cache["qurl"]


def next_month(now=None):
    now = now or datetime.now(timezone.utc)
    year, month = (now.year + 1, 1) if now.month == 12 else (now.year, now.month + 1)
    return f"{year:04d}-{month:02d}"


def fetch_cheapest(origin, destination, month, token, currency):
    """Cheapest offer for the month, or None (empty result, 429, or network error)."""
    q = urllib.parse.urlencode({"origin": origin, "destination": destination,
                                "depart_date": month, "currency": currency, "token": token})
    req = urllib.request.Request(f"https://api.travelpayouts.com/v1/prices/cheap?{q}",
                                 headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = json.loads(r.read())
    except urllib.error.HTTPError as ex:
        print(f"travelpayouts {currency} HTTP {ex.code} for {origin}-{destination}")
        return None
    except (urllib.error.URLError, TimeoutError, ValueError) as ex:
        print(f"travelpayouts {currency} error for {origin}-{destination}: {ex}")
        return None
    if not body.get("success") or not body.get("data"):
        return None
    offers = body["data"].get(destination, {})
    if not offers:
        return None
    best = min(offers.values(), key=lambda o: o["price"])
    # Real keys are departure_at / return_at (not depart_date / return_date).
    return {"price": best["price"], "currency": currency.upper(), "airline": best.get("airline"),
            "depart_date": best.get("departure_at"), "return_date": best.get("return_at")}


def _subscribers(route):
    kwargs = {"FilterExpression": Attr("route").eq(route)}
    while True:
        page = _ddb.scan(**kwargs)
        yield from page.get("Items", [])
        if "LastEvaluatedKey" not in page:
            return
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]


def handler(event, context):
    origin, destination = event["origin"], event["destination"]
    route = event.get("route") or f"{origin}-{destination}"
    month = next_month()
    token = _token()

    tw = fetch_cheapest(origin, destination, month, token, "twd")
    if not tw:
        print(f"no TWD fare for {route} {month} (empty/429) - skipping")
        return {"ok": True, "route": route, "matched": 0}
    us = fetch_cheapest(origin, destination, month, token, "usd")  # may be None - never block on it
    print(f"{route} {month} cheapest {tw['price']} TWD" + (f" / {us['price']} USD" if us else " (no USD)"))

    cheapest = Decimal(str(tw["price"]))
    matched = 0
    for item in _subscribers(route):
        target = item.get("target_price")
        if target is None or Decimal(str(target)) < cheapest:
            continue
        body = {"email": item["email"], "route": route, "plan_name": item.get("plan_name"),
                "target_price": int(Decimal(str(target))), "cheapest": tw}
        if us:
            body["cheapest_usd"] = us
        _sqs.send_message(QueueUrl=_queue_url(), MessageBody=json.dumps(body, ensure_ascii=False))
        matched += 1
    print(f"{route}: {matched} subscriber(s) matched at <= target")
    return {"ok": True, "route": route, "month": month, "cheapest_twd": tw["price"], "matched": matched}
