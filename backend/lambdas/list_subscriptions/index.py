import json, re, boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
table = boto3.resource("dynamodb").Table("subscriptions")


def plain(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    raise TypeError(type(value).__name__)


def reply(status, body):
    return {"statusCode": status, "headers": {"content-type": "application/json"},
            "body": json.dumps(body, ensure_ascii=False, default=plain)}


def handler(event, context):
    # NOTE: trusts the client-supplied email (no auth) - fine for the course;
    # production would verify the Supabase JWT here first.
    email = str((event.get("queryStringParameters") or {}).get("email", "")).strip().lower()
    if not EMAIL.match(email):
        return reply(400, {"error": "invalid email"})
    items = table.query(KeyConditionExpression=Key("email").eq(email)).get("Items", [])
    rows = [{k: it.get(k) for k in ("route", "plan_name", "origin", "destination",
                                    "target_price", "currency", "updated_at")} for it in items]
    return reply(200, {"items": rows})
