# Upgrade

> For admins: upgrade Identity Radar to a new version.

## Prerequisites

- Signed in with Admin role
- Current installation is running and healthy
- Backup completed before upgrading (see [Backup and Restore](./backup-restore.md))

## Step 1: Back Up Your Data

Always create a backup before upgrading:

```bash
docker compose exec db pg_dump -U postgres -Fc identity_radar > backup_pre_upgrade.dump
```

## Step 2: Pull the Latest Version

### Windows

```powershell
.\scripts\upgrade.ps1
```

### Linux/macOS

```bash
git pull origin main
./scripts/upgrade.sh
```

The upgrade script:

1. Pulls the latest Docker images
2. Runs database migrations (schema updates)
3. Restarts all containers
4. Verifies the application health

## Step 3: Verify the Upgrade

1. Open the application in your browser
2. Check the version number in **Settings** (bottom of the page)
3. Navigate through key pages (Dashboard, Identities, Violations) to confirm functionality
4. Check **Integrations** to verify source connections are intact

## Manual Upgrade Steps

If the automated script fails, perform the upgrade manually:

```bash
# 1. Stop the application
docker compose down

# 2. Pull latest code
git pull origin main

# 3. Pull latest images
docker compose pull

# 4. Run database migrations
npm run db:migrate

# 5. Start the application
docker compose up -d

# 6. Verify health
docker compose ps
```

## Migration Handling

Database migrations run automatically during upgrade. If a migration fails:

1. Check the migration log output for specific errors
2. Ensure the database is accessible
3. Retry with `npm run db:migrate`
4. If the migration continues to fail, restore from backup and contact support

## Verification

After upgrading:
- Application loads without errors
- Version number is updated
- All data is intact
- Integrations sync successfully

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Migration failure | Check the error output. Restore from backup if needed. |
| Application does not start | Check Docker logs: `docker compose logs app` |
| Version not updated | Ensure `git pull` succeeded. Check for merge conflicts. |
| Integration connections lost | Re-enter connection credentials in Integrations settings |

## Next Steps

- [Backup and Restore](./backup-restore.md)
- [Troubleshooting](./troubleshooting.md)
