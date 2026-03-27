# Port Reference

> All network ports used by Identity Radar.

## Port Table

| Port | Protocol | Service | Direction | Required | Configurable |
|------|----------|---------|-----------|----------|--------------|
| 3000 | TCP | Application UI (Next.js) | Inbound | Yes | Via `NEXT_PUBLIC_APP_URL` in `.env.local` |
| 5432 | TCP | PostgreSQL database | Internal | Yes | Via `DATABASE_URL` in `.env.local` |
| 12434 | TCP | Docker Model Runner (local AI) | Internal | Yes | Via `OLLAMA_URL` in `.env.local` |
| 80 | TCP | Caddy HTTP (redirects to 443) | Inbound | Production only | Via `docker-compose.prod.yml` |
| 443 | TCP | Caddy HTTPS (TLS termination) | Inbound | Production only | Via `DOMAIN` in `.env.local` |
| 587 | TCP | SMTP (outbound email) | Outbound | Optional | Via `SMTP_PORT` in `.env.local` |

## Firewall Rules

### Development (localhost only)

No inbound firewall rules needed. All services are accessed via `localhost`.

### Production (network-accessible)

| Rule | Source | Destination | Port | Action |
|------|--------|-------------|------|--------|
| HTTPS access | Any | Server | 443 | Allow |
| HTTP redirect | Any | Server | 80 | Allow |
| PostgreSQL | App container | DB container | 5432 | Allow (internal) |
| AI Model | App container | Model Runner | 12434 | Allow (internal) |

### Outbound (if not air-gapped)

| Destination | Port | Purpose |
|-------------|------|---------|
| `graph.microsoft.com` | 443 | Azure AD integration |
| `*.okta.com` | 443 | Okta integration |
| Your LDAP server | 389/636 | Active Directory integration |
| SMTP server | 587 | Email notifications |

## Air-Gapped Deployment

No outbound ports are required. All services run locally within Docker containers.

## Next Steps

- [Configuration Reference](./config-reference.md)
- [System Requirements](./system-requirements.md)
