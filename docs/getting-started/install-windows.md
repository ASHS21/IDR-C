# Install on Windows

> Step-by-step guide for installing Identity Radar on Windows 10/11 or Windows Server 2022+.

## Prerequisites

- Windows 10 21H2 or later, Windows 11, or Windows Server 2022+
- 16 GB RAM minimum (32 GB recommended)
- 50 GB free disk space
- Docker Desktop 4.40+ installed with WSL 2 backend enabled
- Administrator privileges for installation

## Step 1: Download the Installer

Download `IdentityRadar-Setup.exe` from your organization's distribution portal or the releases page.

**What you should see**: A single `.exe` file approximately 5 MB in size.

**Troubleshooting**: If your browser blocks the download, click "Keep" or allow the download in your browser's security settings.

## Step 2: Run as Administrator

Right-click `IdentityRadar-Setup.exe` and select **Run as administrator**.

**What you should see**: A User Account Control (UAC) prompt asking for permission.

**Troubleshooting**: If the UAC prompt does not appear, right-click the file, select Properties, and check "Unblock" if present.

## Step 3: Installation Wizard

The wizard guides you through four screens:

1. **License Agreement** -- Read and accept the Apache 2.0 license.
2. **System Requirements Check** -- The installer verifies Docker, RAM, and disk space. All items should show green checkmarks.
3. **Configuration** -- Set the admin email and organization name. Defaults work for most deployments.
4. **Install Location** -- Accept the default (`C:\IdentityRadar`) or choose a custom path. Avoid paths with spaces.

**What you should see**: All system checks passing with green checkmarks before proceeding.

**Troubleshooting**:

| Problem | Solution |
|---------|----------|
| Docker check fails | Ensure Docker Desktop is running. Open Docker Desktop and wait for the engine to start. |
| RAM check fails | Close memory-intensive applications or upgrade to 16 GB. |
| Disk check fails | Free at least 50 GB on the target drive. |

## Step 4: Wait for Setup

The installer performs these automated steps:

1. Pulls Docker images for PostgreSQL, the application, and Caddy reverse proxy
2. Downloads the local AI model (~20 GB) via Docker Model Runner
3. Runs database migrations
4. Seeds initial configuration
5. Starts all containers

This step takes **10-30 minutes** depending on your internet speed and hardware.

**What you should see**: A progress bar advancing through each stage with status messages. The final message reads "Identity Radar is ready."

**Troubleshooting**:

| Problem | Solution |
|---------|----------|
| Download stalls | Check your internet connection. The installer resumes automatically. |
| Docker error during pull | Restart Docker Desktop and re-run the installer. |
| AI model download fails | Ensure at least 25 GB free disk space. The model is large. |

## Step 5: Open Your Browser

Navigate to **http://localhost:3000** in your browser.

**What you should see**: The Identity Radar login page with the Identity Radar logo and a sign-in form.

**Troubleshooting**:

| Problem | Solution |
|---------|----------|
| Page does not load | Wait 30 seconds for containers to finish starting, then refresh. |
| Connection refused | Verify containers are running: open Docker Desktop and check the Identity Radar stack. |
| Port conflict | Another application is using port 3000. Stop it or change the port in the `.env.local` file. |

## Step 6: First Login

Sign in with the default credentials:

- **Email**: `admin@acmefs.sa`
- **Password**: `admin123`

You will be prompted to change your password immediately.

**What you should see**: A password change form, followed by the onboarding wizard.

**Troubleshooting**:

| Problem | Solution |
|---------|----------|
| Invalid credentials | Ensure you are using the exact default email and password above. |
| Blank screen after login | Clear browser cache and cookies, then try again. |

## Verification

After logging in, confirm all services are healthy:

1. The dashboard loads without errors
2. Navigate to **Settings** and verify your organization name appears
3. Navigate to **Integrations** and confirm the page loads (no sources connected yet is expected)

## Next Steps

- [First Login and Onboarding](./first-login.md)
- [Connect Your First Data Source](./connect-first-source.md)
- [Your First 15 Minutes](./first-15-minutes.md)
