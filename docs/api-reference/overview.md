# API Reference

> Identity Radar REST API documentation.

## Authentication

All API endpoints require authentication via session cookie (NextAuth) or API key (Professional/Enterprise tiers).

### Session Cookie
Authenticate via the login form at `/`. Session cookies are automatically included in subsequent requests.

### API Key
Include the API key in the `Authorization` header:
```
Authorization: Bearer idr_your_api_key_here
```

## Base URL
```
http://localhost:3000/api
```

## Response Format

### Success
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 25
}
```

### Error
```json
{
  "error": "Human-readable error message",
  "details": { ... }
}
```

## Endpoints

### Identities
- `GET /api/identities` — List identities with filters and pagination
- `GET /api/identities/:id` — Get identity with all related data

### Violations
- `GET /api/violations` — List violations with filters, summary, and exceptions

### Tiering
- `GET /api/tiering` — Get tier distribution, heatmap, violations

### Actions
- `POST /api/actions/certify` — Certify an entitlement
- `POST /api/actions/revoke` — Revoke access
- `POST /api/actions/approve-exception` — Approve a violation exception
- `POST /api/actions/escalate` — Escalate risk score
- `POST /api/actions/trigger-review` — Trigger access review
- `POST /api/actions/update-tier` — Update identity tier
- `POST /api/actions/acknowledge` — Acknowledge a violation

### AI
- `POST /api/ai/analyze` — Generate AI analysis
- `GET /api/ai/plans` — List remediation plans
- `PUT /api/ai/plans` — Approve/reject a plan

### Graph
- `GET /api/graph` — Get identity relationship graph data

### Metrics
- `GET /api/metrics/overview` — Dashboard overview metrics

### Audit
- `GET /api/audit` — Query action log with filters
