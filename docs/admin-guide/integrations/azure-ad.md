# Azure AD / Entra ID Integration

> For IAM admins: connect Identity Radar to Azure AD using Microsoft Graph API.

## Prerequisites

- Signed in with IAM Admin or Admin role
- Global Administrator or Application Administrator in your Azure tenant
- Azure Portal access

## Step 1: Create an App Registration

1. Sign in to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory > App registrations**
3. Click **New registration**
4. Set the name to **Identity Radar**
5. Under Supported account types, select **Accounts in this organizational directory only**
6. Set the redirect URI to `http://localhost:3000/api/auth/callback/azure-ad` (Web platform)
7. Click **Register**

## Step 2: Create a Client Secret

1. In the app registration, navigate to **Certificates & secrets**
2. Click **New client secret**
3. Set a description (e.g., "Identity Radar Production")
4. Set expiry to 12 months (or per your organization's policy)
5. Click **Add**
6. **Copy the secret value immediately** -- it is shown only once

## Step 3: Add API Permissions

1. Navigate to **API permissions > Add a permission**
2. Select **Microsoft Graph > Application permissions**
3. Add these permissions:

| Permission | Purpose |
|-----------|---------|
| `User.Read.All` | Read all user profiles |
| `Group.Read.All` | Read all groups and memberships |
| `Directory.Read.All` | Read directory data including roles |
| `AuditLog.Read.All` | Read sign-in and audit logs |
| `Application.Read.All` | Read app registrations (for NHI detection) |

4. Click **Grant admin consent for [Your Tenant]**
5. Verify all permissions show a green checkmark under "Status"

## Step 4: Note Your IDs

From the app registration **Overview** page, copy:

- **Application (client) ID**
- **Directory (tenant) ID**

## Step 5: Configure in Identity Radar

1. Navigate to **Integrations > Connect New Source > Azure AD**
2. Enter the configuration:

| Field | Value |
|-------|-------|
| Tenant ID | Your directory (tenant) ID |
| Client ID | Your application (client) ID |
| Client Secret | The secret value from Step 2 |
| Sync Frequency | Every 4 hours (default) |

3. Click **Test Connection**

## Step 6: Run Initial Sync

After the test succeeds, click **Sync Now**. The first sync imports:

- All users (mapped to human identities)
- App registrations and managed identities (mapped to NHIs)
- Groups and role assignments
- Sign-in logs (last 30 days)

## Step 7: Verify

- Navigate to **Identities** and confirm Azure AD users appear
- Check that app registrations appear as non-human identities
- Navigate to **Integrations** and confirm the status shows "Connected" with a recent sync timestamp

## Verification

The integration shows Connected status, and Azure AD users, groups, and app registrations appear in the identity explorer.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Test connection fails | Verify Tenant ID and Client ID. Check that admin consent was granted. |
| 403 Forbidden errors | Ensure all required API permissions are added and admin consent is granted |
| No app registrations imported | Verify `Application.Read.All` permission is granted |
| Sign-in logs missing | `AuditLog.Read.All` requires Azure AD Premium P1 or P2 license |
| Secret expired | Create a new client secret in Azure Portal and update the configuration |

## Next Steps

- [Active Directory Integration](./active-directory.md)
- [Okta Integration](./okta.md)
- [Identities Explorer](../../user-guide/identities.md)
