# Okta Integration

> For IAM admins: connect Identity Radar to Okta for SSO user and application data.

## Prerequisites

- Signed in with IAM Admin or Admin role
- Okta administrator access
- Okta org URL (e.g., `https://your-org.okta.com`)

## Step 1: Create an API Token in Okta

1. Sign in to your Okta admin console
2. Navigate to **Security > API > Tokens**
3. Click **Create Token**
4. Name the token **Identity Radar**
5. Click **Create Token**
6. **Copy the token value immediately** -- it is shown only once

## Step 2: Configure in Identity Radar

1. Navigate to **Integrations > Connect New Source > Okta**
2. Enter the configuration:

| Field | Value |
|-------|-------|
| Okta Org URL | `https://your-org.okta.com` |
| API Token | The token value from Step 1 |
| Sync Frequency | Every 6 hours (default) |

3. Click **Test Connection**

## Step 3: Run Initial Sync

After the test succeeds, click **Sync Now**. The sync imports:

- All Okta users (mapped to identities)
- Application assignments
- MFA enrollment status
- Group memberships

## Verification

- Okta users appear in the Identity Explorer
- MFA status is populated for each identity's accounts
- The integration status shows "Connected"

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Test connection fails | Verify the Okta Org URL (include `https://`). Check the API token is valid. |
| 401 Unauthorized | The API token may have expired or been revoked. Create a new one. |
| Missing MFA data | Ensure the token was created by an admin with sufficient permissions |
| Rate limiting errors | Okta enforces rate limits. The sync retries automatically. |

## Next Steps

- [Azure AD Integration](./azure-ad.md)
- [CSV Import](./csv-import.md)
- [Identities Explorer](../../user-guide/identities.md)
