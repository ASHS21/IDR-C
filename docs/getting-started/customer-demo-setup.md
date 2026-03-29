# Identity Radar — Customer Demo Setup Guide

> Set up Identity Radar on a customer's device to analyze their real Active Directory data.
> Works on Windows, macOS, and Linux. No cloud. No seed data. Customer's data only.
>
> **Total time**: 15-20 minutes
> **Result**: Customer sees their own identities, tier violations, risk scores, and AI analysis
>
> **Last updated**: 2026-03-29 (post-QA fixes applied)

---

## Before the Meeting: Preparation Checklist

Do this **before** arriving at the customer site:

- [ ] Docker Desktop installed and tested on your laptop
- [ ] Node.js 20+ installed
- [ ] Ollama installed + `qwen2.5:1.5b` model pulled
- [ ] Git installed
- [ ] Repository cloned: `git clone https://github.com/ASHS21/IDR-C.git`
- [ ] Dependencies installed: `cd IDR-C && npm install --legacy-peer-deps`
- [ ] Verified it runs: `docker compose up -d && npm run db:push && npm run dev` → http://localhost:3000 loads
- [ ] Stopped everything: `Ctrl+C` then `docker compose down`

This ensures zero delays at the customer site — everything is pre-cached.

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

**Important (macOS)**: If the project is on an iCloud-synced folder (Desktop or Documents), move it first:
```bash
mv ~/Desktop/IDR-C /tmp/IDR-C
cd /tmp/IDR-C
```

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

**If this fails** (no internet at customer site):
- If you pre-pulled the model at home, it's already cached — skip this step
- If not, Identity Radar will work without AI, but AI Analysis and AI Chat will show "AI unconfigured"

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

**If you pre-installed at home**, this step completes instantly (packages are cached).

**If you see permission errors on Linux**:
```bash
sudo chown -R $(whoami) ~/.npm
npm install --legacy-peer-deps
```

**If you see ENOTEMPTY errors on Windows** (rare):
```powershell
Remove-Item -Recurse -Force node_modules
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

**If this fails with "connection refused"**: Wait 10 seconds and retry — PostgreSQL may still be starting.

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

**Note**: No demo credentials are shown on the login page by default. If you want to show them (e.g., for internal testing), add `NEXT_PUBLIC_DEMO_MODE=true` to `.env.local`.

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
2. You will be redirected to the **login page**
3. Click **"Sign up"** (link below the login form)
4. Enter:
   - **Name**: Customer's name (or "Admin")
   - **Email**: admin@customer.com (use the customer's domain)
   - **Password**: A strong password
5. Click **"Sign up"**
6. You will be redirected to the **onboarding wizard**
7. Fill in:
   - **Organization name**: Customer's company name
   - **Industry**: Select from dropdown
   - **Domain**: customer.com
   - **Regulatory frameworks**: Select applicable (NCA ECC, SAMA CSF, PDPL)
   - **Country**: Saudi Arabia (or appropriate)
8. Click through the wizard — **skip** the "Connect Source" and "Invite Team" steps for now
9. You arrive at the **empty dashboard** with a Quick Start checklist

---

## Step 9: Export Customer's AD Data (5 minutes)

Ask the customer to run these commands on a **Domain Controller** as a **Domain Admin**. The commands are also displayed in the app on the Import Data page.

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
**Typical size**: 500 KB — 5 MB depending on directory size

### Command 2: Export Groups (Required — unlocks tiering)

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
**Why required**: Without groups, Identity Radar cannot compute AD tier classifications or detect tier violations — the #1 finding customers care about.

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

**Security note**: These CSV files contain sensitive AD data. Delete them from the USB/transfer medium after import.

---

## Step 10: Import the Data (3-5 minutes)

1. In Identity Radar, click **"Import Data"** in the left sidebar (under Operations)
2. You'll see 3 tabs: **Export from AD** | **Upload Files** | **Review & Analyze**
3. Click the **"Upload Files"** tab (or click "I have the CSV files →")
4. **Upload Users**: Drag `ir-users.csv` into the "Users & Service Accounts" upload area
   - AI will auto-detect the columns (takes 5-10 seconds on CPU)
   - Review the column mapping — green dots = high confidence, amber = review needed
   - Adjust any incorrect mappings using the dropdown
   - Click **"Import X Records"**
5. **Upload Groups**: Drag `ir-groups.csv` into the "Groups & Memberships" upload area
   - AI auto-detects → confirm mapping → click **"Import X Records"**
6. (Optional) **Upload Permissions**: Drag `ir-permissions.csv` if available
7. Click the **"Review & Analyze"** tab to see the import summary and computed analyses checklist

---

## Step 11: Explore the Dashboard (The Demo)

The dashboard is now populated with the customer's real data. Here's what to show:

### Minute 1-3: Overview Dashboard (`/dashboard`)
- **Total identities** — "We found X,XXX identities in your directory"
- **Human vs NHI split** — "XXX are service accounts that need governance"
- **Tier violations** — "XX identities have access to a higher tier than they should. This is your biggest risk."
- **Top 5 riskiest identities** — click one to show the 360° detail view

### Minute 3-5: AD Tiering (`/dashboard/tiering`)
- **Tier pyramid** — Tier 0 should be small (~1% of identities). If it's large, flag it.
- **Violation heatmap** — Red cells = Tier 2 users with Tier 0 access. Click to see who.
- **Tier 0 inventory** — "These are your crown jewels. XX accounts and XX resources."

### Minute 5-8: Identity Detail (click any identity)
- Show the **360° view** with tabs: Overview, Accounts, Entitlements, Groups, Violations, Timeline
- Point out: "This helpdesk account (Tier 2) is a member of Domain Admins (Tier 0) through nested group membership"
- Show the risk score breakdown: "Their score is 78/100 because of tier violation (+30) and missing MFA (+10)"

### Minute 8-10: AI Analysis (`/dashboard/ai`)
- Click **"Generate Analysis"**
- AI runs locally — takes 5-15 seconds on CPU
- Show: "The AI ranked your top remediation actions. If you fix the top 5, your tier violation count drops from XX to X."
- Show the **quick wins** — low effort, high impact actions

### Minute 10-12: Identity Graph (`/dashboard/graph`)
- Visual map of who has access to what
- Try a Cypher query: `MATCH (i:Identity {adTier: "tier_0"})`
- Click nodes to explore relationships
- Show group nesting paths leading to Tier 0

### Minute 12-15: Violations & Governance
- **Violations** (`/dashboard/violations`) — severity breakdown, exception tracker
- **NHI Management** (`/dashboard/nhi`) — orphaned service accounts, expired credentials
- **Results Hub** (`/dashboard/results`) — unified view of ALL findings across all categories

---

## What Each Upload Unlocks

| Uploaded | Features Enabled | Coverage |
|----------|-----------------|----------|
| Users only | Identity inventory, dormancy detection, NHI classification, basic risk scores | ⚠️ 40% |
| **Users + Groups** | **AD Tiering, tier violations, privileged group analysis, attack paths, graph** | ✅ 85% |
| Users + Groups + Permissions | Shadow admins, GPO risks, delegation analysis, attack path enrichment | ✅ 100% |

**Minimum for a meaningful demo**: Users + Groups (Commands 1 and 2)

---

## Stopping and Cleanup

### Stop Identity Radar (keep data for next time)

Press `Ctrl+C` in the terminal running `npm run dev`, then:
```bash
docker compose down
```

### Restart later (data is preserved)

```bash
cd IDR-C
docker compose up -d
ollama serve &          # if not running as service
npm run dev
```

### Delete everything (complete cleanup)

**macOS / Linux**:
```bash
docker compose down -v    # removes database + all data
cd ..
rm -rf IDR-C
```

**Windows**:
```powershell
docker compose down -v
cd ..
Remove-Item -Recurse -Force IDR-C
```

**Security note**: After a customer demo, always run the cleanup to remove their AD data from the laptop.

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
| `npm install` hangs or fails | Windows | Delete `node_modules` folder and retry. Use PowerShell (not CMD) |
| `npm install` hangs or fails | macOS | If project is on iCloud Desktop, move to `/tmp/IDR-C` first |
| `npm install` ENOTEMPTY error | All | `rm -rf node_modules && npm install --legacy-peer-deps` |
| `db:push` connection refused | All | Wait 10 seconds after `docker compose up -d`. Check: `docker ps` shows healthy |
| AI features say "unconfigured" | All | Ensure Ollama is running: `ollama serve`. Check `.env.local` has `AI_PROVIDER=ollama` |
| AI responses are slow (30+ sec) | All | Normal on CPU. The 1.5b model takes 5-15 sec per response |
| CSV upload shows wrong columns | All | Click "Remove" and re-upload. Manually adjust column mappings in the dropdown |
| Dashboard empty after import | All | Hard refresh the page (Ctrl+Shift+R). Check Import Data → Step 3 for results |
| Login page shows "too many attempts" | All | Rate limiter triggered. Wait 60 seconds or restart: `Ctrl+C` then `npm run dev` |
| Browser shows "Connection refused" | All | Wait 10 seconds. The app may still be starting |
| MissingSecret auth error | All | Check `.env.local` exists and has `NEXTAUTH_SECRET` set |
| `next.config.js` warning about serverActions | All | Ignore — harmless warning, does not affect functionality |
| Blank page after login | All | Clear browser cache (Ctrl+Shift+Delete) and refresh |

---

## Quick Reference Card

```
SETUP (one-time, do at home):
  git clone https://github.com/ASHS21/IDR-C.git && cd IDR-C
  ollama pull qwen2.5:1.5b
  npm install --legacy-peer-deps
  docker compose up -d && sleep 5 && npm run db:push
  [create .env.local — see Step 6]
  npm run dev        # verify it works
  Ctrl+C && docker compose down

AT CUSTOMER SITE:
  cd IDR-C
  docker compose up -d
  ollama serve &
  npm run dev
  → Open http://localhost:3000
  → Sign up → Onboarding → Import Data → Upload CSVs → Demo

STOP:
  Ctrl+C
  docker compose down

CLEANUP (after demo):
  docker compose down -v
  cd .. && rm -rf IDR-C

IMPORT:
  Sidebar → Import Data → Upload ir-users.csv + ir-groups.csv
```
