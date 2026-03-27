# Microsoft Defender for Identity Integration

Connect Identity Radar to Microsoft Defender for Identity to pull identity threat signals, lateral movement profiles, sensitive identity classifications, and security alerts.

## Prerequisites

- An Azure AD / Entra ID tenant with Microsoft Defender for Identity deployed
- An Azure AD app registration with appropriate Microsoft 365 Defender API permissions
- Network connectivity from Identity Radar to Microsoft 365 Defender API endpoints

## Data Pulled

| Data Type | API Endpoint | Description |
|-----------|-------------|-------------|
| Users / Identities | `GET /api/users` | Lateral movement profiles with account names, domains, first/last seen timestamps |
| Sensitive Identities | `GET /api/users?$filter=isSensitive eq true` | Identities marked sensitive in Defender (mapped to Tier 0) |
| Alerts | `GET /api/alerts` | Unresolved identity threat alerts (reconnaissance, lateral movement, credential access, etc.) |

## Step 1: Register an Azure AD Application

1. Go to the **Azure Portal** > **Azure Active Directory** > **App registrations**.
2. Click **New registration**.
3. Name the application (e.g., `Identity Radar - Defender Integration`).
4. Select **Accounts in this organizational directory only**.
5. Click **Register**.
6. Note the **Application (client) ID** and **Directory (tenant) ID**.

## Step 2: Configure API Permissions

Add the following application permissions:

| Permission | Type | Description |
|-----------|------|-------------|
| `SecurityAlert.Read.All` | Application | Read security alerts |
| `User.Read.All` | Application | Read user profiles (for identity enrichment) |
| `AdvancedHunting.Read.All` | Application | Advanced hunting queries (optional, for custom queries) |

To add permissions:
1. In the app registration, go to **API permissions** > **Add a permission**.
2. Select **APIs my organization uses** > search for **Microsoft Threat Protection** (or **Microsoft 365 Defender**).
3. Select **Application permissions** and add the permissions listed above.
4. Click **Grant admin consent** for the permissions.

## Step 3: Create a Client Secret

1. Go to **Certificates & secrets** > **New client secret**.
2. Set a description and expiry period.
3. Click **Add** and copy the secret value immediately.

## Step 4: Connect in Identity Radar

1. Navigate to **Settings** > **Integrations** > **Connect New Source**.
2. Select **Microsoft Defender for Identity**.
3. Enter the following:
   - **Tenant ID**: Your Azure AD tenant ID
   - **Client ID**: The application (client) ID from Step 1
   - **Client Secret**: The secret value from Step 3
4. Click **Test Connection** to verify.
5. Click **Save** to enable the integration.

## Tier Classification

| Defender Classification | Identity Radar Tier |
|------------------------|-------------------|
| `isSensitive = true` | Tier 0 |
| All other users | Unclassified (enriched by other sources) |

## Alert Severity Mapping

| Defender Severity | Identity Radar Severity |
|------------------|----------------------|
| High | Critical |
| Medium | High |
| Low | Medium |
| Informational | Low |

## Alert Categories

Alerts are categorized by MITRE ATT&CK kill chain phase:

- **Reconnaissance**: Enumeration attacks, account discovery
- **Credential Access**: Kerberoasting, AS-REP roasting, password spray
- **Lateral Movement**: Pass-the-hash, pass-the-ticket, overpass-the-hash
- **Domain Dominance**: DCSync, Golden Ticket, skeleton key
- **Persistence**: Malicious modifications to security groups or GPOs

## Sync Frequency

- **Recommended**: Every 60 minutes (alerts are time-sensitive)
- **Rate Limit**: 100 requests per minute

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `403 Forbidden` | Verify API permissions are granted and admin consent is provided |
| `401 Unauthorized` | Check client secret has not expired; regenerate if needed |
| No users returned | Verify Defender for Identity sensors are deployed on domain controllers |
| No alerts returned | Check that Defender for Identity is actively monitoring; verify alert filters |
| Token request fails | Confirm tenant ID, client ID, and client secret are correct |
