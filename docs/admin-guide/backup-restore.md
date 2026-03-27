# Backup and Restore

> For admins: back up Identity Radar data and restore from backups.

## Prerequisites

- Signed in with Admin role (for UI-based export)
- Shell access to the server (for database-level backups)

## Option 1: Application Data Export

### Export

Use the built-in export script:

```powershell
# Windows
.\scripts\export-data.ps1 -OutputPath C:\Backups\identity-radar

# Linux/macOS
./scripts/export-data.sh --output /backups/identity-radar
```

The export includes:
- All identities, entitlements, groups, and resources
- Policy configurations
- Violation history
- AI remediation plans
- Audit trail

### Restore

```powershell
# Windows
.\scripts\import-data.ps1 -InputPath C:\Backups\identity-radar

# Linux/macOS
./scripts/import-data.sh --input /backups/identity-radar
```

## Option 2: Database-Level Backup

### Using pg_dump

```bash
# Create a full database dump
docker compose exec db pg_dump -U postgres identity_radar > backup_$(date +%Y%m%d).sql

# Compressed backup
docker compose exec db pg_dump -U postgres -Fc identity_radar > backup_$(date +%Y%m%d).dump
```

### Restore from pg_dump

```bash
# From SQL file
docker compose exec -T db psql -U postgres identity_radar < backup_20260327.sql

# From compressed dump
docker compose exec -T db pg_restore -U postgres -d identity_radar backup_20260327.dump
```

## Scheduled Backups

Create a cron job for automated daily backups:

```bash
# Add to crontab (crontab -e)
0 2 * * * cd /opt/identity-radar && docker compose exec -T db pg_dump -U postgres -Fc identity_radar > /backups/ir_$(date +\%Y\%m\%d).dump
```

Retain at least 30 days of backups. Clean old backups:

```bash
find /backups -name "ir_*.dump" -mtime +30 -delete
```

## Verification

After restoring a backup:

1. Start the application and verify the login page loads
2. Check that the identity count matches the pre-backup count
3. Verify the audit trail contains entries up to the backup date
4. Confirm integration configurations are intact

## Troubleshooting

| Problem | Solution |
|---------|----------|
| pg_dump fails | Ensure the database container is running: `docker compose ps` |
| Restore errors | Drop and recreate the database before restoring: `DROP DATABASE identity_radar; CREATE DATABASE identity_radar;` |
| Missing data after restore | Verify the backup file is not corrupted. Check the file size matches expectations. |

## Next Steps

- [Upgrade](./upgrade.md)
- [Troubleshooting](./troubleshooting.md)
