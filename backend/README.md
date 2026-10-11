# M1 backend (AWS Lambda, us-east-1)

Code for the Milestone 1 free notifier. Written ahead of deployment; deploy with the
`m1-flight-price-checker` skill once AWS access is available.

| Folder | Lambda | Trigger | Deploy method |
|---|---|---|---|
| `lambdas/save_subscription` | `flight-save-subscription` | `POST /subscribe` (API Gateway) | inline CloudFormation (≤4096 chars) |
| `lambdas/list_subscriptions` | `flight-list-subscriptions` | `GET /subscriptions?email=` | inline CloudFormation (≤4096 chars) |
| `lambdas/parser_wrapper` | `flight-parser-wrapper` | EventBridge `rate(30 minutes)` | `flight-seed` S3 bridge |
| `lambdas/parser` | `flight-parser` | async invoke from the wrapper | `flight-seed` S3 bridge |
| `lambdas/fare_notification` | `flight-fare-notification` | SQS `flight-fare-queue` | `flight-seed` S3 bridge |

`config/flight-routes.json` goes to `s3://flight-config-<ACCOUNT_ID>/flight-routes.json`.

All handlers are `index.handler`, Python 3.12, stdlib + boto3 only, shared role `flight-lambda-role`.

## Environment variables

- `flight-parser-wrapper`: `CONFIG_BUCKET=flight-config-<ACCOUNT_ID>`
- `flight-parser`: optional `FARE_QUEUE_URL` (otherwise looks up `flight-fare-queue`, needs `sqs:GetQueueUrl`)
- `flight-fare-notification`: `NOTIFY_FLOOR_HOURS=24`, `REALERT_PCT=20`, `REALERT_ABS_TWD=2000`

## Secrets read at runtime

- `flight/travelpayouts` → `{"token": "..."}` (parser)
- `flight/resend` → `{"api_key": "re_...", "from": "onboarding@resend.dev", "test_to": "..."}` (notification)

## Rules these handlers follow

- No `subscription_status` anywhere (the paywall is M2).
- DynamoDB numbers are `Decimal`, converted back to `int` for JSON.
- TWD is the gate and the headline; USD is best-effort and only adds a 「約 US$」 line.
- Dedup against `notification_history` before sending; write the history row only after a Resend 2xx.
- Resend 429/5xx → raise so SQS redelivers; 403/422 → log and drop.
