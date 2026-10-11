"""flight-parser-wrapper: EventBridge target (every 30 min).

Reads flight-routes.json from the config bucket and fans out one async
flight-parser invocation per route.
"""
import json
import os

import boto3

_s3 = boto3.client("s3")
_lambda = boto3.client("lambda")
PARSER = os.environ.get("PARSER_FUNCTION", "flight-parser")


def handler(event, context):
    obj = _s3.get_object(Bucket=os.environ["CONFIG_BUCKET"], Key="flight-routes.json")
    routes = json.loads(obj["Body"].read())
    launched = []
    for r in routes:
        payload = {"origin": r["origin"], "destination": r["destination"],
                   "route": f"{r['origin']}-{r['destination']}", "plan": r.get("plan")}
        _lambda.invoke(FunctionName=PARSER, InvocationType="Event",
                       Payload=json.dumps(payload).encode())
        launched.append(payload["route"])
    print("fanned out:", ", ".join(launched))
    return {"ok": True, "routes": launched}
