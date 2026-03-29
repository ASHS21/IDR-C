# Identity Radar — Customer Demo Setup Guide

> Set up Identity Radar on a customer's device to analyze their real Active Directory data.
> Works on Windows, macOS, and Linux. No cloud. No seed data. Customer's data only.
>
> **Total time**: 15-20 minutes
> **Result**: Customer sees their own identities, tier violations, risk scores, and AI analysis

---

## Prerequisites

Install these **before** the customer meeting. All are free.

### 1. Docker Desktop

Docker runs the PostgreSQL database.

| OS | Install |
|----|---------|
| **Windows** | Download from https://docker.com/products/docker-desktop → Run installer → **Enable WSL2** when prompted → Restart if asked → Launch Docker Desktop → Wait until it shows "Running" (green icon in system tray) |
| **macOS** | Download from https://docker.com/products/docker-desktop → Drag to Applications → Launch → Grant permissions → Wait until it shows "Running" (whale icon in menu bar) |
| **Linux (Ubuntu)** | Run: `curl -fsSL https://get.docker.com \| sh && sudo usermod -aG docker $USER && newgrp docker` |

**Verify**: Open a terminal and run:
```bash
docker --version
```
You should see `Docker version 24+` or higher.

### 2. Node.js 20+

Node.js runs the Identity Radar application.

| OS | Install |
|----|---------|
| **Windows** | Download from https://nodejs.org (LTS version) → Run installer → Check "Add to PATH" → Restart terminal |
| **macOS** | Run: `brew install node` or download from https://nodejs.org |
| **Linux (Ubuntu)** | Run: `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install -y nodejs` |

**Verify**:
```bash
node --version    # Should show v20+ or v22+
npm --version     # Should show 10+
```

### 3. Ollama (AI Engine)

Ollama runs the AI model locally on CPU. No GPU required.

| OS | Install |
|----|---------|
| **Windows** | Download from https://ollama.com/download → Run installer |
| **macOS** | Run: `brew install ollama` or download from https://ollama.com/download |
| **Linux** | Run: `curl -fsSL https://ollama.com/install.sh \| sh` |

**Verify**:
```bash
ollama --version
```

### 4. Git

| OS | Install |
|----|---------|
| **Windows** | Download from https://git-scm.com → Run installer → Use defaults |
| **macOS** | Already installed. Or run: `xcode-select --install` |
| **Linux** | Run: `sudo apt install git` |

---

## Step 1: Download Identity Radar (2 minutes)

Open a terminal:
- **Windows**: Open **PowerShell** (search "PowerShell" in Start menu)
- **macOS**: Open **Terminal** (Cmd+Space → type "Terminal")
- **Linux**: Open your terminal app

```bash
git clone https://github.com/ASHS21/IDR-C.git
cd IDR-C
```

**If git is not available or blocked**, download the ZIP:
1. Go to https://github.com/ASHS21/IDR-C
2. Click the green **"Code"** button → **"Download ZIP"**
3. Extract the ZIP file
4. Open terminal in the extracted folder

---

## Step 2: Pull the AI Model (2-3 minutes)

This downloads a 1 GB AI model that runs entirely on the local CPU.

```bash
ollama pull qwen2.5:1.5b
```

**What you should see**:
```
pulling manifest
pulling xxxxxxx... 100% ██████████████████ 1.0 GB
success
```

**If this fails** (no internet):
- Skip this step — Identity Radar will work without AI, but the AI Analysis and AI Chat features will show "AI unconfigured"
- You can pull the model later when internet is available

---

## Step 3: Start the Database (1 minute)

```bash
docker compose up -d
```

**What you should see**:
```
✔ Container identity-radar-db  Started
```

**If you see "port 5432 already in use"**:
- Another PostgreSQL is running. Stop it first:
  - Windows: `net stop postgresql-x64-16` (or whatever version)
  - macOS/Linux: `sudo systemctl stop postgresql` or `brew services stop postgresql`
- Or change the port in `docker-compose.yml` from `5432:5432` to `5433:5432`

**Wait 5 seconds** for PostgreSQL to initialize, then verify:
```bash
docker ps
```
You should see `identity-radar-db` with status `Up` and `(healthy)`.

---

## Step 4: Install Dependencies (2-3 minutes)

```bash
npm install --legacy-peer-deps
```

**What you should see** (after 1-3 minutes):
```
added 700+ packages in Xm
```

**If you see permission errors on Linux**:
```bash
sudo chown -R $(whoami) ~/.npm
npm install --legacy-peer-deps
```

**If you see ENOTEMPTY errors on Windows** (rare):
```bash
rmdir /s /q node_modules
npm install --legacy-peer-deps
```

---

## Step 5: Set Up the Database Schema (30 seconds)

```bash
npm run db:push
```

**What you should see**:
```
[✓] Changes applied
```

This creates all the database tables (identities, groups, entitlements, violations, etc.) but does NOT insert any data. The database is empty and ready for the customer's data.

---

## Step 6: Configure Environment (30 seconds)

Create the configuration file:

**macOS / Linux**:
```bash
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/identity_radar
NEXTAUTH_SECRET=customer-demo-session-key-2026
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b
EOF
```

**Windows (PowerShell)**:
```powershell
@"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/identity_radar
NEXTAUTH_SECRET=customer-demo-session-key-2026
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b
"@ | Out-File -Encoding UTF8 .env.local
```

---

## Step 7: Start Identity Radar (30 seconds)

Make sure Ollama is running first:

**macOS/Linux** (if Ollama isn't running as a service):
```bash
ollama serve &
```

**Windows**: Ollama should already be running (check system tray). If not, open the Ollama app.

Then start Identity Radar:
```bash
npm run dev
```

**What you should see**:
```
▲ Next.js 14.2.35
- Local: http://localhost:3000
✓ Ready in 2.1s
```

**Leave this terminal open.** Do not close it — the app runs in this terminal.

---

## Step 8: Create an Account (1 minute)

1. Open a browser and go to: **http://localhost:3000**
2. You will see the **login page**
3. Click **"Sign up"** (or go to http://localhost:3000/signup)
4. Enter:
   - **Name**: Customer's name (or "Admin")
   - **Email**: customer@company.com
   - **Password**: A strong password
5. Click **"Sign up"**
6. You will be redirected to the **onboarding wizard**
7. Fill in:
   - **Organization name**: Customer's company name
   - **Industry**: Select from dropdown
   - **Domain**: customer.com
   - **Regulatory frameworks**: Select applicable (NCA ECC, SAMA CSF, PDPL)
8. Click through the wizard (skip the "Connect Source" and "Invite Team" steps)
9. You arrive at the **empty dashboard**

---

## Step 9: Export Customer's AD Data (5 minutes)

The customer needs to run these commands on a **Domain Controller** as a **Domain Admin**.

### Command 1: Export Users (Required)

```powershell
Get-ADUser -Filter * -Properties DisplayName,SamAccountName,
UserPrincipalName,EmailAddress,Department,Manager,MemberOf,
Enabled,LastLogonDate,PasswordLastSet,WhenCreated,
UserAccountControl,DistinguishedName,Description,Title |
Select-Object DisplayName,SamAccountName,UserPrincipalName,
EmailAddress,Department,
@{N='Manager';E={($_.Manager -split ',')[0] -replace 'CN=',''}},
@{N='MemberOf';E={($_.MemberOf | ForEach-Object {
  ($_ -split ',')[0] -replace 'CN=','' }) -join ';'}},
Enabled,
@{N='LastLogon';E={if($_.LastLogonDate){$_.LastLogonDate.ToString('yyyy-MM-dd')}}},
@{N='PasswordLastSet';E={if($_.PasswordLastSet){$_.PasswordLastSet.ToString('yyyy-MM-dd')}}},
@{N='WhenCreated';E={$_.WhenCreated.ToString('yyyy-MM-dd')}},
UserAccountControl,DistinguishedName,Description,Title |
Export-Csv -Path C:\ir-users.csv -NoTypeInformation -Encoding UTF8
```

**Output**: `C:\ir-users.csv`

### Command 2: Export Groups (Required)

```powershell
Get-ADGroup -Filter * -Properties Members,Description,
GroupScope,GroupCategory,ManagedBy,DistinguishedName |
Select-Object Name,
@{N='Members';E={($_.Members | ForEach-Object {
  ($_ -split ',')[0] -replace 'CN=','' }) -join ';'}},
Description,GroupScope,GroupCategory,
@{N='ManagedBy';E={($_.ManagedBy -split ',')[0] -replace 'CN=',''}},
DistinguishedName |
Export-Csv -Path C:\ir-groups.csv -NoTypeInformation -Encoding UTF8
```

**Output**: `C:\ir-groups.csv`

### Command 3: Export GPO Permissions (Optional — unlocks shadow admin detection)

```powershell
Get-GPO -All | ForEach-Object {
  $gpo = $_
  Get-GPPermissions -Guid $_.Id -All | ForEach-Object {
    [PSCustomObject]@{
      GPOName = $gpo.DisplayName
      Trustee = $_.Trustee.Name
      Permission = $_.Permission
      TrusteeType = $_.Trustee.SidType
    }
  }
} | Export-Csv -Path C:\ir-permissions.csv -NoTypeInformation -Encoding UTF8
```

**Output**: `C:\ir-permissions.csv`

### Transfer the files

Copy `ir-users.csv` and `ir-groups.csv` (and optionally `ir-permissions.csv`) from the Domain Controller to the laptop running Identity Radar. Use a USB drive, network share, or any file transfer method.

---

## Step 10: Import the Data (3-5 minutes)

1. In Identity Radar, click **"Import Data"** in the left sidebar
2. Click **"Step 2: Upload Files"** tab
3. **Upload Users**: Drag `ir-users.csv` into the "Users & Service Accounts" upload area
   - AI will auto-detect the columns (takes 5-10 seconds)
   - Review the column mapping — it should look correct
   - Click **"Import X Records"**
4. **Upload Groups**: Drag `ir-groups.csv` into the "Groups & Memberships" upload area
   - AI auto-detects → confirm → import
5. (Optional) **Upload Permissions**: Drag `ir-permissions.csv`
6. Click **"Review Results"** tab to see what was imported

---

## Step 11: Explore the Dashboard (The Demo)

The dashboard is now populated with the customer's real data. Walk them through:

### Overview Dashboard (`/dashboard`)
- Total identities (human vs NHI breakdown)
- Active violations count
- Tier violations (the key metric)
- Top 5 riskiest identities
- Risk posture trend

### AD Tiering (`/dashboard/tiering`)
- Tier pyramid: how many identities at each tier
- **Red cells in the heatmap = tier violations** — Tier 2 users with Tier 0 access
- Click any violation to see the identity and their path to Tier 0

### Identity Explorer (`/dashboard/identities`)
- Full searchable table of every identity
- Filter by tier, status, risk score, type
- Click any identity → 360° detail view with tabs

### AI Analysis (`/dashboard/ai`)
- Click **"Generate Analysis"**
- AI runs locally (5-15 seconds on CPU)
- Shows: ranked remediation actions, projected risk reduction, quick wins

### Graph Explorer (`/dashboard/graph`)
- Visual map of identity relationships
- Try Cypher queries: `MATCH (i:Identity {adTier: "tier_0"})`
- Click nodes to see details

---

## What Each Upload Unlocks

| Uploaded | Feature | Status |
|----------|---------|--------|
| Users only | Identity inventory, dormancy, NHI detection | ⚠️ Partial |
| Users + Groups | **AD Tiering, tier violations, risk scores, graph** | ✅ Full ISPM |
| Users + Groups + Permissions | **Shadow admins, GPO risks, attack path enrichment** | ✅ Full ISPM + advanced |

**Minimum for a meaningful demo**: Users + Groups (Commands 1 and 2)

---

## Stopping and Cleanup

### Stop Identity Radar (keep data for next time)

Press `Ctrl+C` in the terminal running `npm run dev`, then:
```bash
docker compose down
```

### Restart later

```bash
docker compose up -d
npm run dev
```

### Delete everything (complete cleanup)

```bash
# Stop and remove database + all data
docker compose down -v

# Remove the project folder
cd ..
rm -rf IDR-C
```

**On Windows**:
```powershell
docker compose down -v
cd ..
Remove-Item -Recurse -Force IDR-C
```

---

## Troubleshooting

| Problem | OS | Solution |
|---------|-----|----------|
| `docker: command not found` | All | Install Docker Desktop. On Linux: `curl -fsSL https://get.docker.com \| sh` |
| `node: command not found` | All | Install Node.js from https://nodejs.org. Restart terminal after install |
| `ollama: command not found` | All | Install from https://ollama.com/download. On Linux: `curl -fsSL https://ollama.com/install.sh \| sh` |
| Docker Desktop won't start | Windows | Enable virtualization in BIOS (VT-x/AMD-V). Enable WSL2: `wsl --install` in PowerShell as Admin |
| Docker Desktop won't start | macOS | Grant permissions in System Preferences → Privacy & Security |
| `Port 5432 already in use` | All | Another PostgreSQL is running. Stop it or change port in `docker-compose.yml` |
| `Port 3000 already in use` | All | Another app on port 3000. Stop it or run: `PORT=3001 npm run dev` |
| `npm install` fails | Windows | Delete `node_modules` folder and retry. Use PowerShell, not CMD |
| `npm install` fails | macOS | If iCloud Desktop, move project to `/tmp/IDR-C` first |
| `db:push` fails with connection error | All | Wait 10 seconds after `docker compose up -d`. Check: `docker ps` shows healthy |
| AI features say "unconfigured" | All | Ensure Ollama is running: `ollama serve`. Check `.env.local` has `AI_PROVIDER=ollama` |
| AI responses are slow (30+ sec) | All | Normal on CPU. The 1.5b model takes 5-15 sec. Larger models take longer |
| CSV upload shows wrong columns | All | Click "Remove" and re-upload. Manually adjust the column dropdown mappings |
| Dashboard is empty after import | All | Refresh the page (Ctrl+R). Check the Import page → Step 3 tab for import results |
| Login error "too many attempts" | All | Rate limiter. Stop the app (Ctrl+C), restart: `npm run dev` |
| Browser shows "Connection refused" | All | Wait 10 seconds. The app may still be starting |
| MissingSecret auth error | All | Check `.env.local` exists and has `NEXTAUTH_SECRET` set |

---

## Quick Reference Card

```
SETUP (one-time):
  git clone https://github.com/ASHS21/IDR-C.git && cd IDR-C
  ollama pull qwen2.5:1.5b
  npm install --legacy-peer-deps
  docker compose up -d
  npm run db:push
  [create .env.local — see Step 6]
  npm run dev

START (returning):
  cd IDR-C
  docker compose up -d
  ollama serve &          # if not running as service
  npm run dev

STOP:
  Ctrl+C
  docker compose down

OPEN:
  http://localhost:3000

IMPORT:
  Sidebar → Import Data → Upload ir-users.csv + ir-groups.csv
```
