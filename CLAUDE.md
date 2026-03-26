# Identity Radar — Master System Prompt for Claude Code

**Purpose**: This document serves as both the `CLAUDE.md` project root file AND the phased build prompt for constructing the Identity Radar platform using Claude Code.

> **Stack Change**: The database layer has been changed from Supabase to local PostgreSQL + Drizzle ORM + NextAuth.js + Docker Compose. All references to "Supabase" in the original spec should be read as "PostgreSQL via Drizzle ORM". Auth is handled by NextAuth.js v5 instead of Supabase Auth.

## System Identity
Identity Radar is an AI-powered Identity and Access Management (IAM) posture management platform built on a three-layer ontology architecture (modeled after Palantir Foundry's Semantic/Kinetic/Dynamic pattern). It provides unified visibility across all identity types (human and non-human), enforces Active Directory tiering compliance, and integrates with enterprise IAM solutions (Azure AD/Entra ID, SSO providers, Active Directory, IGA platforms like SailPoint).
The platform serves CISOs, IAM Engineers, and Security Analysts in organizations operating under NCA ECC, SAMA CSF, and PDPL regulatory frameworks in Saudi Arabia.

## Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 03 — DYNAMIC (Decisions & Learning)                  │
│  AI risk scoring, access recommendations, anomaly           │
│  detection, decision capture, posture simulation            │
│  ─────────────────────────────────────────────────────────── │
│  Engine: Anthropic API (claude-sonnet-4-20250514)           │
│  Runtime: Cloudflare Workers                                │
├─────────────────────────────────────────────────────────────┤
│  LAYER 02 — KINETIC (Actions & Automation)                  │
│  Access reviews, provisioning workflows, policy             │
│  enforcement, certification campaigns, escalations          │
│  ─────────────────────────────────────────────────────────── │
│  Engine: Next.js API Routes + Cloudflare Workers + Cron     │
├─────────────────────────────────────────────────────────────┤
│  LAYER 01 — SEMANTIC (Ontology Core)                        │
│  Identity objects, AD tiering model, entitlements,          │
│  group memberships, roles, resources, policies              │
│  ─────────────────────────────────────────────────────────── │
│  Engine: Supabase (Postgres + RLS + Auth + Realtime)        │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack (Zero-Cost Tier Targets)
Layer
Technology
Purpose
Frontend
Next.js 14 (App Router)
Dashboard UI, SSR pages
Styling
Tailwind CSS + shadcn/ui
Design system
Database
Supabase (Postgres)
Semantic layer store + RLS + Auth
Realtime
Supabase Realtime
Live dashboard updates
Workers
Cloudflare Workers
Kinetic actions, cron jobs, AI proxy
AI
Anthropic API (claude-sonnet-4-20250514)
Dynamic layer reasoning
Validation
Zod
All boundary schemas
State
React Query (TanStack)
Server state management
Auth
Supabase Auth + JWT
Session management + RBAC
Charts
Recharts
Dashboard visualizations

## Domain Model — The Identity Ontology

### Core Principle: Identity-First Architecture
Every entity in the system resolves to a single concept: Identity. An Identity can be:
Human Identity: Employee, contractor, vendor, partner
Non-Human Identity (NHI): Service account, managed identity, app registration, API key, bot account, machine identity, certificate-based identity
This is the single object that everything else links to. There is no separate "user" and "service account" table — there is identities with a type discriminator.
### Active Directory Tiering Model
The AD tiering model is a FIRST-CLASS concept in the ontology, not an afterthought:
Tier
Scope
Examples
Risk Level
Tier 0
Identity plane control
Domain Controllers, AD DS, Azure AD Connect, PKI, ADFS, Tier 0 admin accounts, Schema Admins, Enterprise Admins, Domain Admins
CRITICAL
Tier 1
Server & application control
Member servers, application servers, Tier 1 admin accounts, Server Operators, service accounts for enterprise apps
HIGH
Tier 2
Workstation & end-user
Workstations, end-user devices, standard user accounts, helpdesk accounts
STANDARD
Tiering violations (e.g., a Tier 2 account with Tier 0 access, or a Tier 1 service account with Domain Admin privileges) are the primary risk signal in the Identity Radar.
### Object Types (Semantic Layer Schema)
identities
├── id (uuid, PK)
├── display_name (text)
├── type (enum: 'human' | 'non_human')
├── sub_type (enum: 'employee' | 'contractor' | 'vendor' | 'service_account' | 'managed_identity' | 'app_registration' | 'api_key' | 'bot' | 'machine' | 'certificate')
├── status (enum: 'active' | 'inactive' | 'disabled' | 'dormant' | 'orphaned' | 'suspended')
├── ad_tier (enum: 'tier_0' | 'tier_1' | 'tier_2' | 'unclassified')
├── effective_tier (enum) — computed: highest tier accessed
├── tier_violation (boolean) — computed: effective_tier < ad_tier
├── risk_score (integer, 0-100)
├── risk_factors (jsonb) — array of contributing risk signals
├── source_system (enum: 'active_directory' | 'azure_ad' | 'okta' | 'sailpoint' | 'cyberark' | 'manual')
├── source_id (text) — external system identifier (objectGUID, Azure Object ID, etc.)
├── upn (text) — User Principal Name
├── sam_account_name (text)
├── email (text, nullable)
├── department (text, nullable)
├── manager_identity_id (uuid, FK → identities, nullable)
├── last_logon_at (timestamptz)
├── password_last_set_at (timestamptz, nullable)
├── created_in_source_at (timestamptz)
├── owner_identity_id (uuid, FK → identities, nullable) — for NHIs: who owns this service account
├── expiry_at (timestamptz, nullable) — for NHIs: when does this identity expire
├── org_id (uuid, FK → organizations)
├── created_at (timestamptz)
├── updated_at (timestamptz)

accounts
├── id (uuid, PK)
├── identity_id (uuid, FK → identities)
├── platform (enum: 'ad' | 'azure_ad' | 'okta' | 'sailpoint' | 'cyberark' | 'aws_iam' | 'gcp_iam')
├── account_name (text)
├── account_type (enum: 'standard' | 'privileged' | 'admin' | 'service' | 'shared' | 'emergency')
├── enabled (boolean)
├── last_authenticated_at (timestamptz)
├── mfa_enabled (boolean)
├── mfa_methods (text[])
├── privileged (boolean) — has any elevated permission
├── org_id (uuid, FK)

entitlements
├── id (uuid, PK)
├── identity_id (uuid, FK → identities)
├── resource_id (uuid, FK → resources)
├── permission_type (enum: 'role' | 'group_membership' | 'direct_assignment' | 'inherited' | 'delegated')
├── permission_name (text) — e.g., "Domain Admin", "Reader", "Storage Blob Contributor"
├── permission_scope (text) — e.g., OU path, Azure subscription, resource group
├── ad_tier_of_permission (enum: 'tier_0' | 'tier_1' | 'tier_2')
├── granted_at (timestamptz)
├── granted_by (text)
├── last_used_at (timestamptz, nullable)
├── certifiable (boolean, default true)
├── certification_status (enum: 'pending' | 'certified' | 'revoked' | 'expired')
├── last_certified_at (timestamptz, nullable)
├── certified_by (uuid, FK → identities, nullable)
├── risk_tags (text[]) — e.g., ['toxic_combination', 'sod_violation', 'excessive_privilege']
├── org_id (uuid, FK)

groups
├── id (uuid, PK)
├── name (text)
├── type (enum: 'security' | 'distribution' | 'dynamic' | 'role_based' | 'privileged_access')
├── scope (enum: 'domain_local' | 'global' | 'universal')
├── ad_tier (enum: 'tier_0' | 'tier_1' | 'tier_2')
├── source_system (enum)
├── source_id (text)
├── member_count (integer)
├── nested_group_count (integer)
├── is_privileged (boolean)
├── owner_identity_id (uuid, FK → identities, nullable)
├── org_id (uuid, FK)

group_memberships
├── id (uuid, PK)
├── group_id (uuid, FK → groups)
├── identity_id (uuid, FK → identities)
├── membership_type (enum: 'direct' | 'nested' | 'dynamic')
├── added_at (timestamptz)
├── added_by (text)
├── org_id (uuid, FK)

resources
├── id (uuid, PK)
├── name (text)
├── type (enum: 'server' | 'application' | 'database' | 'file_share' | 'cloud_resource' | 'domain_controller' | 'workstation' | 'network_device' | 'saas_app')
├── ad_tier (enum: 'tier_0' | 'tier_1' | 'tier_2')
├── criticality (enum: 'critical' | 'high' | 'medium' | 'low')
├── environment (enum: 'production' | 'staging' | 'development' | 'dr')
├── owner_identity_id (uuid, FK → identities, nullable)
├── org_id (uuid, FK)

policies
├── id (uuid, PK)
├── name (text)
├── type (enum: 'access_policy' | 'tiering_rule' | 'sod_rule' | 'password_policy' | 'mfa_policy' | 'lifecycle_policy' | 'certification_policy')
├── definition (jsonb) — the rule logic
├── severity (enum: 'critical' | 'high' | 'medium' | 'low')
├── enabled (boolean)
├── framework_mappings (jsonb) — links to NCA/SAMA/PDPL controls
├── org_id (uuid, FK)

policy_violations
├── id (uuid, PK)
├── policy_id (uuid, FK → policies)
├── identity_id (uuid, FK → identities)
├── entitlement_id (uuid, FK → entitlements, nullable)
├── violation_type (enum: 'tier_breach' | 'sod_conflict' | 'excessive_privilege' | 'dormant_access' | 'orphaned_identity' | 'missing_mfa' | 'expired_certification' | 'password_age')
├── severity (enum: 'critical' | 'high' | 'medium' | 'low')
├── status (enum: 'open' | 'acknowledged' | 'remediated' | 'excepted' | 'false_positive')
├── detected_at (timestamptz)
├── remediated_at (timestamptz, nullable)
├── remediated_by (uuid, FK → identities, nullable)
├── exception_reason (text, nullable)
├── exception_approved_by (uuid, FK → identities, nullable)
├── exception_expires_at (timestamptz, nullable)
├── org_id (uuid, FK)

integration_sources
├── id (uuid, PK)
├── name (text)
├── type (enum: 'active_directory' | 'azure_ad' | 'okta' | 'sailpoint' | 'cyberark' | 'azure_logs' | 'sso_provider')
├── config (jsonb, encrypted) — connection parameters
├── sync_status (enum: 'connected' | 'syncing' | 'error' | 'disconnected')
├── last_sync_at (timestamptz)
├── last_sync_record_count (integer)
├── sync_frequency_minutes (integer)
├── org_id (uuid, FK)

action_log (kinetic writeback — every mutation recorded)
├── id (uuid, PK)
├── action_type (enum: 'assess_identity' | 'certify_entitlement' | 'revoke_access' | 'approve_exception' | 'escalate_risk' | 'trigger_review' | 'update_tier' | 'sync_source' | 'generate_recommendation' | 'acknowledge_violation')
├── actor_identity_id (uuid, FK → identities)
├── target_identity_id (uuid, FK → identities, nullable)
├── target_entitlement_id (uuid, FK → entitlements, nullable)
├── target_policy_violation_id (uuid, FK → policy_violations, nullable)
├── payload (jsonb) — full action input/output
├── rationale (text, nullable) — why this action was taken
├── source (enum: 'manual' | 'automated' | 'ai_recommended')
├── org_id (uuid, FK)
├── created_at (timestamptz)

remediation_plans (AI-generated output, Layer 03)
├── id (uuid, PK)
├── generated_at (timestamptz)
├── generated_by (enum: 'ai' | 'manual')
├── input_params (jsonb) — budget, timeline, risk appetite
├── ranked_actions (jsonb) — ordered list of recommended actions
├── executive_summary (text)
├── projected_risk_reduction (integer) — percentage
├── quick_wins (jsonb)
├── status (enum: 'draft' | 'approved' | 'in_progress' | 'completed' | 'rejected')
├── approved_by (uuid, FK → identities, nullable)
├── approved_at (timestamptz, nullable)
├── org_id (uuid, FK)

organizations
├── id (uuid, PK)
├── name (text)
├── domain (text)
├── industry (text)
├── regulatory_frameworks (text[]) — e.g., ['NCA_ECC', 'SAMA_CSF', 'PDPL']
├── ad_forest_name (text, nullable)
├── tenant_id (text, nullable) — Azure tenant
├── created_at (timestamptz)
### Computed Fields & Views
Create Postgres views for frequently queried computed states:
v_identity_risk_summary: identity + account count + entitlement count + violation count + effective tier + tier violation boolean
v_tier_violations: all identities where effective_tier > ad_tier (cross-tier access)
v_dormant_identities: identities where last_logon_at > 90 days and status = 'active'
v_orphaned_nhi: non-human identities where owner is null or owner is disabled
v_over_privileged: identities with entitlement count > org median * 2
v_certification_overdue: entitlements where certification_status = 'expired' or last_certified_at > 90 days
v_integration_health: all sources with sync status and staleness indicator

## Kinetic Action Types (Layer 02)
Every action type has: Zod input schema, Zod output schema, API route, RLS check, action_log entry.
Action Type
Trigger
Mutates
Roles Allowed
certify_entitlement
Manager certifies an access right
entitlements.certification_status
manager, iam_admin
revoke_access
Removes an entitlement
entitlements → soft delete or status change
iam_admin, ciso
approve_exception
CISO approves a policy violation exception
policy_violations.status + exception fields
ciso
escalate_risk
Auto or manual escalation of high-risk identity
Creates notification + updates risk_score
system, analyst
trigger_review
Initiates an access review campaign
Creates review tasks for managers
iam_admin, ciso
update_tier
Reclassifies an identity's AD tier
identities.ad_tier
iam_admin
sync_source
Triggers a manual sync from an integration
Bulk upsert identities/entitlements
iam_admin
acknowledge_violation
Analyst acknowledges a violation
policy_violations.status
analyst, iam_admin
generate_recommendation
Triggers AI analysis
Creates remediation_plan row
analyst, ciso
### Scheduled Kinetic Actions (Cloudflare Workers Cron)
Cron
Frequency
Action
risk-scorer
Every 6 hours
Recalculate risk_score for all identities based on violation count, tier status, dormancy, privilege level
dormancy-detector
Daily
Flag identities with no logon > 90 days, no auth > 30 days
certification-expiry
Daily
Mark entitlements where last_certified_at + policy period has elapsed
tier-violation-scanner
Every 6 hours
Recompute effective_tier and flag tier_violation
nhi-orphan-detector
Daily
Flag NHIs where owner is disabled, terminated, or null
sync-health-checker
Every 15 minutes
Ping integration sources and update sync_status

## Dynamic Layer (Layer 03) — AI Engine

### Risk Scoring Formula (Deterministic Base)
risk_score = (
  tier_violation_weight    * 30 +   // 0 or 1 × 30
  privilege_level_weight   * 20 +   // 0-1 scale × 20
  dormancy_weight          * 15 +   // 0-1 scale × 15
  violation_count_weight   * 15 +   // normalized 0-1 × 15
  missing_mfa_weight       * 10 +   // 0 or 1 × 10
  certification_overdue    * 5  +   // 0 or 1 × 5
  orphaned_nhi             * 5      // 0 or 1 × 5
)
### AI-Powered Analysis (Anthropic API via CF Worker)
Endpoint: POST /api/ai/analyze
The AI engine receives a structured context payload and returns:
Risk prioritization: Ranked list of identities to address first
Natural language justification: Why each identity is risky, in CISO-readable language
Remediation recommendations: Specific actions (revoke X, certify Y, disable Z)
Posture simulation: "If you remediate the top 10, your tier violation count drops from 47 to 12"
Toxic combination detection: Identify SoD-violating entitlement combinations
Anomaly narratives: Explain unusual access patterns in plain language
The AI NEVER writes directly to the database. It returns a remediation_plan JSON that a human approves via a kinetic action.

## Dashboard Pages (Identity Radar UI)

### Navigation Structure
/                           → Landing / login
/dashboard                  → Overview (composite risk, key metrics)
/dashboard/identities       → Identity explorer (filterable table)
/dashboard/identities/[id]  → Identity detail (360° view)
/dashboard/tiering          → AD tiering compliance dashboard
/dashboard/entitlements     → Entitlement radar (over-provisioned, toxic combos)
/dashboard/violations       → Policy violations (open, excepted, remediated)
/dashboard/certifications   → Access certification campaigns
/dashboard/nhi              → Non-human identity inventory
/dashboard/integrations     → Integration source health
/dashboard/ai               → AI analysis & remediation plans
/dashboard/audit            → Action log timeline
/dashboard/settings         → Org settings, policies, thresholds
Dashboard 1: Overview (/dashboard)
Hero metrics row: Total identities (human | NHI split), Active violations, Tier violations, Risk score distribution
Trend chart: Risk posture over last 30/60/90 days (from action_log)
Tier compliance gauge: Percentage of identities with no tier violations
Top 5 riskiest identities: Cards with risk score, violation count, tier status
Pending actions: Certifications due, violations unacknowledged, reviews pending
Integration health strip: Green/yellow/red per source
Dashboard 2: Identity Explorer (/dashboard/identities)
Filterable data table with columns: Name, Type (human/NHI), Sub-type, AD Tier, Effective Tier, Tier Violation badge, Risk Score (color-coded), Status, Source, Last Logon, Entitlement Count, Violation Count
Filters: Type, sub-type, tier, risk score range, status, source system, violation presence, dormancy
Bulk actions: Select multiple → trigger review, update tier, disable
Export: CSV export of filtered results
Click row → navigates to Identity Detail
Dashboard 3: Identity Detail (/dashboard/identities/[id])
Header card: Name, UPN, type badge, tier badge, risk score gauge, status
Tabs:
Overview: Key attributes, manager, owner (for NHI), department, last logon
Accounts: All linked accounts across platforms, MFA status per account
Entitlements: All permissions with tier classification, certification status, last used
Group memberships: Direct and nested, with group tier classification
Violations: All policy violations for this identity, status, severity
Activity timeline: Action log entries for this identity
AI insights: AI-generated risk narrative, recommendations
Action buttons: Certify All, Trigger Review, Update Tier, Disable, Request Exception
Dashboard 4: AD Tiering (/dashboard/tiering)
Tier pyramid visualization: Tier 0 (top, smallest), Tier 1 (middle), Tier 2 (bottom, largest) — counts per tier
Tier violation heatmap: Matrix showing source_tier × accessed_tier with violation counts
Cross-tier access paths: List of identities with tier violations, sorted by severity
Tier 0 inventory: Every Tier 0 identity and resource — this is the crown jewels view
Unclassified identities: Identities not yet assigned a tier
Dashboard 5: Entitlement Radar (/dashboard/entitlements)
Over-provisioned identities: Identities with entitlement count > 2× org median
Toxic combinations: Pairs/sets of entitlements that violate SoD policies
Unused entitlements: Permissions not used in > 90 days (candidates for revocation)
Entitlement distribution: Chart showing permission types by frequency
Certification status breakdown: Pie chart of certified / pending / expired / revoked
Dashboard 6: Violations (/dashboard/violations)
Violation feed: Real-time list of policy violations, filterable by type, severity, status
Severity breakdown: Critical / High / Medium / Low counts with trends
Violation types: Bar chart showing tier_breach vs sod_conflict vs excessive_privilege vs dormant vs orphaned
Exception tracker: All approved exceptions with expiry countdown
Remediation rate: Percentage of violations remediated within SLA
Dashboard 7: Non-Human Identities (/dashboard/nhi)
NHI inventory: Table of all service accounts, managed identities, app registrations, API keys
Ownership status: Owned vs orphaned vs owner-disabled breakdown
Expiry tracker: NHIs approaching expiry date, expired but still active
Privilege analysis: NHIs with admin/privileged access
Password/secret age: NHIs with credentials older than policy threshold
Dashboard 8: AI Analysis (/dashboard/ai)
Generate analysis button: Input budget (SAR), timeline (days), risk appetite slider
Remediation plan display: Ranked action list with justifications
Projected impact: Before/after risk posture visualization
Quick wins section: Low-effort, high-impact actions
Plan approval workflow: Approve → creates kinetic actions, Reject → capture rationale
Historical plans: Past AI recommendations with outcome tracking
Dashboard 9: Audit Trail (/dashboard/audit)
Full action log timeline: Every kinetic action with actor, target, timestamp, rationale
Filter by: Action type, actor, target identity, date range, source (manual/automated/AI)
Decision capture view: Focus on approve/reject/exception actions with rationale text
Export: PDF audit report generation for NCA/SAMA compliance evidence

## Integration Architecture

### Data Ingestion Pattern
All integrations follow the same pattern:
Connector (CF Worker or API route) authenticates to source system
Extractor pulls raw data (users, groups, roles, logs)
Transformer maps source schema → Identity Radar ontology schema
Loader upserts into Supabase via batch insert/update
Reconciler detects deletions (present in DB but missing from source → mark as removed)
Logger records sync metadata in integration_sources and action_log
### Source-Specific Notes
Source
Data Pulled
Frequency
Method
Active Directory
Users, groups, OUs, group memberships, last logon, password age
Every 6 hours
LDAP via proxy agent or CSV import
Azure AD / Entra ID
Users, app registrations, managed identities, roles, sign-in logs
Every 4 hours
Microsoft Graph API
Azure Sign-In Logs
Authentication events, MFA status, location, risk events
Every 1 hour
Microsoft Graph API (auditLogs)
SSO Provider (Okta)
Users, apps, assignments, MFA factors
Every 6 hours
Okta API
IGA (SailPoint)
Identities, entitlements, certifications, roles, SoD policies
Every 6 hours
SailPoint IdentityNow API or CSV
CyberArk
Privileged accounts, safe memberships, session recordings
Every 4 hours
CyberArk REST API

## File Structure
identity-radar/
├── CLAUDE.md                          # This file
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                         # Supabase + Anthropic keys
│
├── app/
│   ├── layout.tsx                     # Root layout with sidebar
│   ├── page.tsx                       # Landing / login
│   ├── dashboard/
│   │   ├── layout.tsx                 # Dashboard shell (sidebar + header)
│   │   ├── page.tsx                   # Overview dashboard
│   │   ├── identities/
│   │   │   ├── page.tsx               # Identity explorer
│   │   │   └── [id]/page.tsx          # Identity detail
│   │   ├── tiering/page.tsx           # AD tiering dashboard
│   │   ├── entitlements/page.tsx      # Entitlement radar
│   │   ├── violations/page.tsx        # Violations dashboard
│   │   ├── certifications/page.tsx    # Certification campaigns
│   │   ├── nhi/page.tsx               # Non-human identities
│   │   ├── integrations/page.tsx      # Integration health
│   │   ├── ai/page.tsx                # AI analysis
│   │   ├── audit/page.tsx             # Audit trail
│   │   └── settings/page.tsx          # Settings
│   │
│   └── api/
│       ├── identities/route.ts        # CRUD for identities
│       ├── entitlements/route.ts      # CRUD for entitlements
│       ├── violations/route.ts        # CRUD for violations
│       ├── actions/
│       │   ├── certify/route.ts
│       │   ├── revoke/route.ts
│       │   ├── approve-exception/route.ts
│       │   ├── escalate/route.ts
│       │   ├── trigger-review/route.ts
│       │   ├── update-tier/route.ts
│       │   └── acknowledge/route.ts
│       ├── ai/
│       │   ├── analyze/route.ts       # Trigger AI analysis
│       │   └── plans/route.ts         # CRUD remediation plans
│       ├── sync/
│       │   └── [source]/route.ts      # Manual sync trigger
│       └── audit/route.ts             # Query action_log
│
├── lib/
│   ├── schemas/
│   │   ├── identity.ts                # Zod schemas for identities
│   │   ├── entitlement.ts
│   │   ├── violation.ts
│   │   ├── action.ts                  # All kinetic action schemas
│   │   ├── ai.ts                      # AI request/response schemas
│   │   └── integration.ts
│   ├── supabase/
│   │   ├── client.ts                  # Browser client
│   │   ├── server.ts                  # Server client
│   │   ├── admin.ts                   # Admin client (bypasses RLS)
│   │   └── types.ts                   # Generated DB types
│   ├── hooks/
│   │   ├── use-identities.ts          # React Query hooks
│   │   ├── use-violations.ts
│   │   ├── use-entitlements.ts
│   │   ├── use-audit.ts
│   │   └── use-ai.ts
│   ├── ai/
│   │   ├── prompts.ts                 # System prompts for AI analysis
│   │   ├── context-builder.ts         # Assembles ontology state for LLM
│   │   └── parser.ts                  # Validates AI JSON output
│   ├── risk/
│   │   ├── scorer.ts                  # Deterministic risk scoring
│   │   ├── tier-analyzer.ts           # Tier violation detection
│   │   └── anomaly-detector.ts        # Statistical anomaly detection
│   └── utils/
│       ├── constants.ts
│       ├── formatters.ts
│       └── rbac.ts                    # Role-based access helpers
│
├── components/
│   ├── ui/                            # shadcn/ui components
│   ├── dashboard/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── metric-card.tsx
│   │   ├── risk-gauge.tsx
│   │   ├── tier-pyramid.tsx
│   │   ├── identity-table.tsx
│   │   ├── violation-feed.tsx
│   │   ├── action-timeline.tsx
│   │   └── integration-health-strip.tsx
│   └── charts/
│       ├── risk-trend.tsx
│       ├── tier-heatmap.tsx
│       ├── entitlement-distribution.tsx
│       └── violation-breakdown.tsx
│
├── workers/
│   ├── risk-scorer/
│   │   ├── index.ts                   # Cron: recalculate risk scores
│   │   └── wrangler.toml
│   ├── tier-scanner/
│   │   ├── index.ts                   # Cron: detect tier violations
│   │   └── wrangler.toml
│   ├── dormancy-detector/
│   │   ├── index.ts                   # Cron: flag dormant identities
│   │   └── wrangler.toml
│   ├── ai-analyzer/
│   │   ├── index.ts                   # AI analysis proxy
│   │   └── wrangler.toml
│   └── sync-health/
│       ├── index.ts                   # Cron: check integration health
│       └── wrangler.toml
│
├── supabase/
│   └── migrations/
│       ├── 001_create_organizations.sql
│       ├── 002_create_identities.sql
│       ├── 003_create_accounts.sql
│       ├── 004_create_groups.sql
│       ├── 005_create_resources.sql
│       ├── 006_create_entitlements.sql
│       ├── 007_create_policies.sql
│       ├── 008_create_violations.sql
│       ├── 009_create_integrations.sql
│       ├── 010_create_action_log.sql
│       ├── 011_create_remediation_plans.sql
│       ├── 012_create_views.sql
│       ├── 013_create_rls_policies.sql
│       ├── 014_seed_sample_data.sql
│       └── 015_create_indexes.sql
│
└── seed/
    └── generate-sample-data.ts        # Generates realistic test data

## Coding Principles (Enforced in Every Session)
Every ontology mutation goes through an action type — no direct DB writes from UI components
Every action type has a Zod schema — validate at the boundary, always
Every action creates an action_log entry — who did what, when, why
RLS enforces org isolation — users only see their organization's data
AI never writes directly to DB — it produces recommendations that humans approve
Tier classification is first-class — every identity, group, resource, and entitlement has a tier
Human and NHI share one table — discriminator pattern, not separate tables
Zero-cost infrastructure — Supabase free tier, CF free tier, Vercel free tier
Arabic/RTL support — all user-facing text must support RTL for Saudi market
Server components by default — client components only when interactivity requires it

## Build Phases for Claude Code
Execute these in order. Each phase is a separate Claude Code session.
Phase 1: Foundation (Supabase Schema + Auth)
Focus: Create all Supabase migrations, RLS policies, computed views, 
and seed data. Set up Supabase Auth with org-scoped JWT. Generate 
TypeScript types from the schema. Create all Zod schemas in lib/schemas/.
Seed with 200 sample identities (mix of human and NHI), 50 groups, 
500 entitlements, 30 policy violations, and 5 integration sources.
Phase 2: Dashboard Shell + Overview
Focus: Next.js app router layout with sidebar navigation, header with 
org selector, and the Overview dashboard page with metric cards, 
risk trend chart, tier compliance gauge, and top 5 riskiest identities.
Use shadcn/ui + Tailwind. Set up React Query provider and hooks.
Phase 3: Identity Explorer + Detail
Focus: Filterable identity data table with all columns, filters, 
sorting, and pagination. Identity detail page with tabbed view 
(overview, accounts, entitlements, groups, violations, timeline).
Action buttons that trigger kinetic actions via API routes.
Phase 4: Tiering + Violations Dashboards
Focus: AD tiering dashboard with tier pyramid, violation heatmap, 
cross-tier access paths, Tier 0 inventory. Violations dashboard 
with feed, severity breakdown, type chart, exception tracker.
Phase 5: Kinetic Layer (Action Types + Workers)
Focus: All API route handlers for kinetic actions with Zod validation, 
RLS checks, action_log writes. Cloudflare Workers for cron jobs 
(risk scorer, tier scanner, dormancy detector, certification expiry).
Phase 6: AI Engine + Recommendations
Focus: Cloudflare Worker for AI analysis proxy. Context builder that 
assembles ontology state into structured LLM prompt. AI dashboard page 
with analysis trigger, plan display, approval workflow. Decision capture.
Phase 7: NHI + Entitlements + Certifications
Focus: Non-human identity dashboard, entitlement radar, certification 
campaign pages. Bulk certification workflow, orphan detection, 
expiry tracking.
Phase 8: Integrations + Audit
Focus: Integration health dashboard, manual sync triggers, 
sync status monitoring. Audit trail page with full action log, 
filters, and PDF export for compliance evidence.
Phase 9: Polish + RTL + Dark Mode
Focus: Design system audit, RTL support for Arabic, dark mode 
consistency, mobile responsiveness, loading states, error boundaries, 
empty states. Performance optimization (pagination, virtual scrolling).

## Role-Based Access Control (RBAC)
Role
Permissions
viewer
Read-only access to all dashboards
analyst
Viewer + acknowledge violations, trigger reviews
iam_admin
Analyst + certify, revoke, update tiers, manage integrations
ciso
Full access including approve exceptions, approve AI plans, manage policies
admin
CISO + org settings, user management
RBAC is enforced at three levels:
RLS policies in Supabase (org isolation)
API route middleware (role checks before action execution)
UI conditional rendering (hide action buttons for insufficient roles)

## Environment Variables
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Cloudflare Workers
CF_ACCOUNT_ID=
CF_API_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
