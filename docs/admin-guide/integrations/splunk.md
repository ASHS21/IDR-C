# Splunk SIEM Integration

Connect Identity Radar to Splunk Enterprise or Splunk Cloud to pull identity-related security events, notable events, and authentication data for ITDR (Identity Threat Detection and Response) correlation.

## Prerequisites

- Splunk Enterprise 8.x or later, or Splunk Cloud
- A Splunk user account with appropriate roles, or a bearer token
- Network connectivity from Identity Radar to the Splunk Management API (typically HTTPS on port 8089)
- For full ITDR capabilities: Splunk Enterprise Security (ES) app installed (optional but recommended)

## Data Pulled

| Data Type | Method | Description |
|-----------|--------|-------------|
| Identities (ES) | `inputlookup identity_manager_identities_lookup` | Identity asset framework data (if ES is installed) |
| Identities (auth) | SPL query on `WinEventLog:Security` | Windows authentication events (logon events, EventCode 4624) |
| Security Alerts | `notable` macro or saved searches | Notable events and triggered alerts for ITDR |
| Custom Searches | Ad-hoc SPL queries | Flexible identity-related search capability |

## Step 1: Create a Splunk Service Account

### Option A: Username/Password

1. Log in to Splunk as an administrator.
2. Navigate to **Settings** > **Access Controls** > **Users**.
3. Click **New User**.
4. Set the following:
   - **Username**: `identity_radar_svc`
   - **Full Name**: `Identity Radar Integration`
   - **Roles**: Assign the required roles (see Step 2)
5. Set a strong password and save.

### Option B: Bearer Token (Recommended)

1. Navigate to **Settings** > **Tokens**.
2. Click **New Token**.
3. Set:
   - **User**: Select the service account user
   - **Audience**: `Identity Radar`
   - **Expiration**: Set an appropriate expiry
4. Click **Create** and copy the token value.

## Step 2: Assign Required Roles

Assign the following roles to the integration user:

| Role | Purpose |
|------|---------|
| `user` | Basic search access |
| `can_delete` | Not required (read-only integration) |
| `list_all_objects` | Access to saved searches and lookup tables |
| `schedule_search` | Create and run search jobs |

For Splunk Enterprise Security:

| Role | Purpose |
|------|---------|
| `ess_analyst` | Access to notable events and ES dashboards |
| `identity_manager` | Access to identity correlation lookups |

## Step 3: Configure Index Access

Ensure the service account has read access to relevant indexes:

- `main` (default index for Windows event logs)
- `notable` (ES notable events, if applicable)
- Any custom indexes containing authentication or identity data

## Step 4: Connect in Identity Radar

1. Navigate to **Settings** > **Integrations** > **Connect New Source**.
2. Select **Splunk SIEM**.
3. Enter the following:
   - **Splunk Management URL**: e.g., `https://splunk.example.com:8089`
   - **Username** / **Password** (Option A) or **Bearer Token** (Option B)
4. Click **Test Connection** to verify.
5. Click **Save** to enable the integration.

## Identity Extraction Strategy

Identity Radar uses a two-tier strategy for extracting identities from Splunk:

1. **Primary**: If Splunk ES is installed, it queries the `identity_manager_identities_lookup` for the authoritative identity list.
2. **Fallback**: If the lookup is unavailable, it queries Windows Security event logs (EventCode 4624) to build an identity list from authentication events.

## Security Alert Categories

When Splunk ES is available, notable events are extracted with severity mapping:

| Splunk Urgency | Identity Radar Severity |
|---------------|----------------------|
| Critical | Critical |
| High | High |
| Medium | Medium |
| Low | Low |
| Informational | Low |

## NHI Detection

Non-human identities are detected by naming convention in Splunk data:
- Usernames starting with `svc_`, `svc-`, `srv_`, `app_`
- Machine accounts ending with `$`

## Sync Frequency

- **Recommended**: Every 60 minutes (security events are time-sensitive)
- **Search Jobs**: Each extraction creates a search job that is polled until complete (timeout: 120 seconds)

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `401 Unauthorized` | Verify credentials; check if password/token has expired |
| `403 Forbidden` | Verify the user has the required roles; check index access permissions |
| Search job timeout | Increase the SPL time range or reduce result count; check Splunk resource limits |
| No identities from lookup | Verify Splunk ES is installed and the identity correlation lookup is populated |
| No identities from auth events | Verify Windows event logs are being ingested into the `main` index |
| Connection refused on port 8089 | Verify the Splunk management port is accessible; check firewall rules |
| `notable` macro not found | Splunk Enterprise Security is not installed; alerts will use saved search fallback |
