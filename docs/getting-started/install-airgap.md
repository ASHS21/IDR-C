# Air-Gapped Installation

> Install Identity Radar on a machine with no internet access by preparing a USB transfer package.

## Prerequisites

- An internet-connected machine (the "build machine") with Docker and PowerShell/Bash
- A USB drive or network share with at least 30 GB free space
- The target air-gapped machine meeting all [system requirements](./system-requirements.md)
- Docker Desktop installed on the air-gapped machine (pre-installed or via offline installer)

## Step 1: Prepare the USB on the Build Machine

### Windows

```powershell
.\scripts\build-airgap-usb.ps1 -OutputPath E:\IdentityRadar
```

### Linux / macOS

```bash
./scripts/build-airgap-usb.sh --output /mnt/usb/IdentityRadar
```

The script packages:

1. All Docker images as `.tar` archives
2. The AI model files
3. Application source code and configuration
4. The offline installer script

**Estimated time**: 15-30 minutes. **Output size**: approximately 25 GB.

## Step 2: Transfer to the Air-Gapped Machine

Copy the entire `IdentityRadar` folder from the USB drive to the air-gapped machine. Recommended location:

- Windows: `C:\IdentityRadar`
- Linux: `/opt/identity-radar`

## Step 3: Run the Offline Installer

### Windows

```powershell
cd C:\IdentityRadar
.\airgap-install.ps1
```

### Linux

```bash
cd /opt/identity-radar
chmod +x airgap-install.sh
./airgap-install.sh
```

The installer:

1. Loads Docker images from the `.tar` archives
2. Copies the AI model to the Docker Model Runner volume
3. Generates secrets and creates `.env.local`
4. Starts all containers
5. Runs database migrations and seeds the admin account

## Step 4: Verify Without Internet

Open a browser on the air-gapped machine and navigate to **http://localhost:3000**.

Sign in with:

- **Email**: `admin@acmefs.sa`
- **Password**: `admin123`

## Verification

1. The dashboard loads fully without any network errors in the browser console
2. Navigate to **AI Analysis** and run a test analysis -- the local AI model should respond
3. All pages render without attempting external network calls

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Docker images fail to load | Verify the `.tar` files are not corrupted. Re-copy from USB. |
| AI model not responding | Check that Docker Model Runner is running: `docker compose ps` |
| Missing files on USB | Re-run the build script on the internet machine and verify output. |
| Database errors | Ensure the PostgreSQL container started. Check logs: `docker compose logs db` |

## Updating an Air-Gapped Installation

1. On the build machine, pull the latest version and re-run the USB build script
2. Transfer the updated USB package to the air-gapped machine
3. Run `airgap-upgrade.ps1` (Windows) or `airgap-upgrade.sh` (Linux)

## Next Steps

- [First Login and Onboarding](./first-login.md)
- [Connect Your First Data Source](./connect-first-source.md)
