# Trae Preflight

This folder is prepared for `wangxt-1027-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18327
- API_PORT: 19327
- WEB_PORT: 20327
- DB_PORT: 21327
- REDIS_PORT: 22327

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
