# Identity Radar — Product Overview

## What it is

**Identity Radar is an AI-powered Identity Security Posture Management (ISPM) and Identity Threat Detection & Response (ITDR) platform for Active Directory** — built to run **fully on-premises and air-gapped**, with an Arabic/English interface and compliance mapped to Saudi and Gulf regulatory frameworks.

It connects to Active Directory, builds a single inventory of **every identity — human and non-human** (employees, contractors, service accounts, machine/managed identities), scores their risk, maps how an attacker could move from any account to the most privileged assets, and identifies the **fewest changes that shut the most attack paths down** — without sending a single byte to a cloud.

## Who it's for

- **CISOs** — a board- and regulator-ready view of identity risk and compliance posture.
- **IAM engineers** — enforce Active Directory tiering (Tier 0/1/2), find toxic permissions, clean up standing access.
- **Security analysts / SOC** — investigate attack paths, triage exposures, work findings to closure.

Primary market: **regulated organizations in Saudi Arabia and the Gulf** — banks under **SAMA CSF**, government and enterprises under **NCA ECC** and **PDPL** — where data sovereignty makes foreign cloud security tools a non-starter.

## The problem it solves

Most identity attacks don't break in — they **log in and escalate**: a low-privilege account → a misconfigured permission → a service account → Domain Admin. That escalation surface is invisible in normal AD tooling. The mature tools that expose it (BloodHound Enterprise, PingCastle, Microsoft Defender for Identity) are Western, cloud-oriented, English-only, and map to ISO/NIST — none fit an air-gapped Gulf bank that needs Arabic and can't use SaaS.

---

## What makes it stand out

| Standout | Why it matters | Who else does this |
|---|---|---|
| **Fully air-gapped / sovereign** | Runs on-prem with zero external calls — data never leaves the environment | Competitors are cloud or cloud-tethered |
| **On-prem local AI** (Ollama) or off | Risk narration/triage/reporting without sending identity data to a cloud | Competitors' AI is cloud-only |
| **Arabic + English (RTL)** | First-class bilingual UI and reports | Rare/absent in this category |
| **Gulf compliance native** | NCA ECC · SAMA CSF · PDPL mapped and scored | Western tools do ISO/NIST/PCI |
| **Fix-First choke-point + What-If** | The few fixes that break the most attack paths; preview a change before touching prod | This is BloodHound Enterprise's premium feature — here self-hosted & air-gapped |
| **All-in-one** | ISPM + ITDR + attack graph + issues + compliance in one pane | Market is point tools |
| **Identity-first unified model** | Human and non-human identities in one model | Most tools are human-centric |
| **Self-hosted, no per-seat SaaS** | Own your data, flat cost | Per-seat cloud licensing |

**The moat, in one line:** the attack-path and posture power of the best Western tools — but running offline, with local AI, an Arabic UI, and Gulf-regulator compliance built in.

---

## The features

### 🛡 Posture (ISPM)
- **AD ingestion** — live over LDAP(S), or CSV for fully offline sites
- **Unified identity inventory** — human + non-human, with risk scoring
- **AD tiering** — Tier 0/1/2 classification + cross-tier violation detection
- **Entitlements** — permission/access inventory feeding tiering & risk
- **AD Exposures** — findings grouped by attack impact, with an exposure score & 30-day trend
  - *Live from AD:* Kerberoastable, AS-REP roastable, unconstrained/constrained/RBCD delegation, reversible encryption, password-not-required/never-expires, stale privileged accounts
  - *Preview (collector not yet enabled):* ADCS (ESC1–8), GPO, exposed secrets

### 🕸 Attack Surface
- **Attack Paths** — escalation chains into Tier 0 (MITRE-mapped)
- **Blast Radius** — lateral-movement reach from a compromised identity
- **Graph** — full interactive, force-directed identity/permission graph
- **Graph Explorer** — query library (Who can DCSync, paths to Tier 0, dangerous ACLs, Kerberoastable…) + PathFinder (shortest path between any two entities)
- **Fix-First (Choke-Point) + What-If** — ranked highest-ROI fixes and a before/after impact simulator

### 📋 Findings & Compliance
- **Issues** — managed workflow: mitigation steps, remediation scripts, status, cross-scan timeline
- **Violations** — policy-violation feed (tier breach, dormant, orphaned, MFA…)
- **Compliance** — control mapping & scoring for NCA ECC, SAMA CSF, PDPL

### ⚙ Operations
- **Import** (CSV) · **Integrations** (LDAP/AD, CSV) · **Audit** (immutable action log → SIEM) · **Settings** (org, RBAC, API keys, sessions)

### Cross-cutting
- **Bilingual EN/AR (RTL)** · **RBAC** (viewer → analyst → iam_admin → ciso → admin) · **optional local-AI** narration/triage · **air-gapped operation**

---

## How it runs

A self-contained Docker stack (PostgreSQL + the Next.js app + Caddy HTTPS, with optional local Ollama).

- **Online** — can use network connectors and cloud AI.
- **Offline / air-gapped** — runs with zero external calls; the intended mode for sovereign deployments.

One `docker compose up`, no per-seat SaaS licensing, your data never leaves your environment.
