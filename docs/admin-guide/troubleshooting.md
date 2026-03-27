# Troubleshooting

> For admins: resolve common issues with Identity Radar.

## Prerequisites

- Shell access to the server running Identity Radar
- Docker Compose available

## Quick Diagnostics

```bash
# Check container status
docker compose ps

# View application logs
docker compose logs app --tail 50

# View database logs
docker compose logs db --tail 50

# Check disk space
df -h
```

## Common Issues

### Dashboard Shows Blank Page After Login

**Cause**: Authentication session expired or database connection lost.

**Solution**:
1. Clear browser cookies for `localhost:3000`
2. Check the application container is running: `docker compose ps`
3. Check database connectivity: `docker compose logs app | grep "database"`
4. Restart the application: `docker compose restart app`

### Docker Desktop Not Starting (Windows)

**Cause**: WSL 2 not properly configured or Hyper-V conflict.

**Solution**:
1. Open PowerShell as Administrator
2. Run `wsl --update`
3. Run `wsl --set-default-version 2`
4. Restart Docker Desktop
5. If the issue persists, reboot the machine

### AI Not Responding

**Cause**: The local AI model is not loaded or the model runner is not running.

**Solution**:
1. Check the model runner status: `docker compose ps` (look for the model runner service)
2. Check model runner logs: `docker compose logs model-runner --tail 20`
3. Verify the model is downloaded: check disk space and model volume
4. If using Anthropic API fallback, verify `ANTHROPIC_API_KEY` is set in `.env.local`

### Integration Sync Failing

**Cause**: Source system credentials expired or network connectivity issue.

**Solution**:
1. Navigate to **Integrations** and check the error message
2. For Azure AD: verify the client secret has not expired in Azure Portal
3. For LDAP: verify network connectivity to the domain controller
4. For Okta: verify the API token is still valid
5. Click **Test Connection** to diagnose, then **Sync Now** to retry

### Rate Limit Errors

**Cause**: Too many API requests to external services (Microsoft Graph, Okta).

**Solution**:
1. Wait 60 seconds and retry
2. Reduce the sync frequency in **Integrations** settings
3. The application includes automatic retry logic with exponential backoff

### Forgot Admin Password

**Cause**: Password lost with no other admin accounts.

**Solution**:

Reset via the database directly:

```bash
# Generate a new bcrypt hash (replace 'newpassword' with your desired password)
docker compose exec app node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('newpassword', 10).then(h => console.log(h))"

# Update the password in the database
docker compose exec db psql -U postgres identity_radar -c "UPDATE users SET hashed_password = '<paste_hash_here>' WHERE email = 'admin@acmefs.sa';"
```

### Database Connection Errors

**Cause**: PostgreSQL container not running or connection string misconfigured.

**Solution**:
1. Check container status: `docker compose ps db`
2. Verify `DATABASE_URL` in `.env.local`
3. Restart the database: `docker compose restart db`
4. Wait 10 seconds, then restart the app: `docker compose restart app`

### High Memory Usage

**Cause**: AI model and database consuming too much RAM.

**Solution**:
1. Check memory usage: `docker stats`
2. If the AI model uses too much memory, consider switching to a smaller model in `.env.local`
3. Reduce PostgreSQL shared buffers if necessary
4. Upgrade to 32 GB RAM for optimal performance

### HTTPS/SSL Not Working (Production)

**Cause**: Caddy cannot obtain a Let's Encrypt certificate.

**Solution**:
1. Verify the `DOMAIN` variable in `.env.local` points to a valid FQDN
2. Ensure ports 80 and 443 are open and reachable from the internet
3. Check Caddy logs: `docker compose logs caddy --tail 20`
4. Verify DNS points to your server's IP address

## Getting Logs for Support

If you need to report an issue, collect these logs:

```bash
# Application logs
docker compose logs app > app-logs.txt

# Database logs
docker compose logs db > db-logs.txt

# Container status
docker compose ps > container-status.txt

# System info
uname -a > system-info.txt
docker --version >> system-info.txt
```

## Next Steps

- [System Requirements](../getting-started/system-requirements.md)
- [Backup and Restore](./backup-restore.md)
- [FAQ](../reference/faq.md)
