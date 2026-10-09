# Elastic Beanstalk settings — `Whizz-Away-env`

`deploy-and-logs.json` is applied with `aws elasticbeanstalk update-environment --option-settings file://...` (applied 2026-10-09).

- **Immutable deploys.** Each deploy starts a fresh instance with the new version. It only takes traffic once it passes health checks, and only then is the old instance terminated. A broken build never replaces the working one, and there's no outage during deploys. Deploys take about 5–8 minutes instead of about 1. Old and new instances serve traffic side by side for a short time. That's safe because auth comes from the JWT (stable `JWT_SECRET`), not the in-memory session. The rollingupdate settings make config changes that replace instances immutable too.
- **4xx health rules disabled.** These had been turned on, so bot traffic (failed logins, and WAF-blocked requests, which count as load balancer 4xx) pushed environment health to *Severe*. An immutable deploy that ran during such traffic could fail because of it. 5xx and real health failures still count.
- **Log streaming** to CloudWatch under `/aws/elasticbeanstalk/Whizz-Away-env/...`, with 30-day retention, kept if the environment is terminated. Logs survive instance replacement, and you no longer need to request a log bundle to investigate.

Settings applied through the API override `.ebextensions`. If the environment is rebuilt, apply this file again (and re-associate the WAF; see `../waf/README.md`).
