import base64, json, re, boto3
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

PLANS = {"tokyo": ("TPE", "TYO"), "seoul": ("TPE", "SEL")}
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
table = boto3.resource("dynamodb").Table("subscriptions")


def reply(status, body):
    return {"statusCode": status, "headers": {"content-type": "application/json"},
            "body": json.dumps(body, ensure_ascii=False)}


def handler(event, context):
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode()
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
    except ValueError:
        return reply(400, {"error": "invalid JSON"})

    email = str(data.get("email", "")).strip().lower()
    plan = data.get("plan_name")
    if not EMAIL.match(email):
        return reply(400, {"error": "invalid email"})
    if plan not in PLANS:
        return reply(400, {"error": "plan_name must be tokyo or seoul"})
    try:
        price = Decimal(str(data.get("target_price")))
    except (InvalidOperation, ValueError):
        return reply(400, {"error": "target_price must be a number"})
    if not price.is_finite() or price <= 0 or price != price.to_integral_value():
        return reply(400, {"error": "target_price must be a positive whole TWD amount"})

    origin, dest = PLANS[plan]
    route = f"{origin}-{dest}"
    now = datetime.now(timezone.utc).isoformat()
    # Keep created_at from an existing row; update everything else.
    table.update_item(
        Key={"email": email, "route": route},
        UpdateExpression=("SET plan_name=:p, origin=:o, destination=:d, target_price=:t, "
                          "currency=:c, updated_at=:n, created_at=if_not_exists(created_at,:n)"),
        ExpressionAttributeValues={":p": plan, ":o": origin, ":d": dest, ":t": price,
                                   ":c": "TWD", ":n": now},
    )
    return reply(200, {"ok": True, "email": email, "route": route, "plan_name": plan,
                       "target_price": int(price), "currency": "TWD"})
