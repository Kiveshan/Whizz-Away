# WAF — `whizz-away-alb`

AWS WAF web ACL (REGIONAL, af-south-1) attached to the prod Elastic Beanstalk ALB. Added 2026-10-09 after a credential-spraying bot (~3k requests) hit the auth endpoints.

| Priority | Rule | Action | Why |
|---|---|---|---|
| 0 | `BlockUnknownHost` | **Count** (trial) | Real users only use `ksm-whizz-away.co.za`. Scanners hit the raw ALB/EC2 hostname or IP. |
| 1 | `AuthRateLimit` | Block → 429 | More than 100 requests per IP in 5 min to `/login`, `/register` or `/check-email`. The response body matches the app's own `RATE_LIMITED` JSON. Outer layer only; the in-app limiter (20 failures per 15 min) still applies. |
| 2 | `AWS-IpReputationList` | Block | AWS-curated botnet and scanner IPs. |
| 3 | `AWS-KnownBadInputs` | Block | Log4j, Java deserialisation and similar exploit payloads. |
| 4 | `AWS-CommonRuleSet` | **Count** (trial) | OWASP-style rules. Before switching to block, override `SizeRestrictions_BODY` to Count: it blocks request bodies over 8 KB, which would break document uploads and large instruction saves. |

Logs go to the CloudWatch log group `aws-waf-logs-whizz-away` (30-day retention).

**Caveats**
- The ALB is created and owned by the EB environment. If the environment is ever rebuilt or replaced, the ALB ARN changes and the web ACL has to be associated again (`aws wafv2 associate-web-acl`).
- `aws wafv2` commands that take these JSON files need `--cli-binary-format raw-in-base64-out`. Otherwise CLI v2 reads `SearchString` as base64.
- To change rules: edit `rules.json`, then run `aws wafv2 update-web-acl` with the current `--lock-token` from `aws wafv2 get-web-acl`.
