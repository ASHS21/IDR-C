# Connect Your First Data Source

> Link Identity Radar to Azure AD or Active Directory to import real identity data.

## Prerequisites

- Identity Radar installed and running
- Admin or IAM Admin role
- Access to your Azure Portal or Active Directory domain controller

---

## Option A: Azure AD / Entra ID

### Step 1: Create an App Registration in Azure Portal

1. Sign in to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory > App registrations > New registration**
3. Set the name to `Identity Radar`
4. Set the redirect URI to `http://localhost:3000/api/auth/callback/azure-ad` (Web)
5. Click **Register**

### Step 2: Create a Client Secret

1. In the app registration, go to **Certificates & secrets > New client secret**
2. Set an expiry (recommended: 12 months)
3. Click **Add**
4. **Copy the secret value immediately** -- it will not be shown again

### Step 3: Add API Permissions

Navigate to **API permissions > Add a permission > Microsoft Graph > Application permissions** and add:

- `User.Read.All`
- `Group.Read.All`
- `Directory.Read.All`
- `AuditLog.Read.All`

Click **Grant admin consent** for your tenant.

### Step 4: Note Your IDs

From the app registration **Overview** page, copy:

- **Application (client) ID**
- **Directory (tenant) ID**

### Step 5: Configure in Identity Radar

1. Navigate to **Integrations** in Identity Radar
2. Click **Connect New Source**
3. Select **Azure AD**
4. Enter the Tenant ID, Client ID, and Client Secret
5. Click **Test Connection**

### Step 6: Run Initial Sync

After the test succeeds, click **Sync Now**. The first sync imports all users, groups, and app registrations.

### Step 7: Verify

Navigate to **Identities** and confirm that your Azure AD users appear in the table.

---

## Option B: Active Directory (LDAP)

### Direct LDAP Connection

1. Create a service account in AD with read-only permissions to the OUs you want to monitor
2. In Identity Radar, navigate to **Integrations > Connect New Source > Active Directory**
3. Enter the LDAP server address, base DN, service account credentials, and target OUs
4. Click **Test Connection**, then **Sync Now**

### CSV Export Alternative

If direct LDAP is not possible, export from your domain controller using PowerShell:

```powershell
# Export users
Get-ADUser -Filter * -Properties DisplayName, UserPrincipalName, SamAccountName, `
  EmailAddress, Department, Manager, LastLogonDate, PasswordLastSet, MemberOf, `
  Enabled, WhenCreated, DistinguishedName |
  Select-Object DisplayName, UserPrincipalName, SamAccountName, EmailAddress, `
  Department, @{N='Manager';E={($_.Manager -split ',')[0] -replace 'CN=',''}}, `
  LastLogonDate, PasswordLastSet, `
  @{N='MemberOf';E={($_.MemberOf -join ';')}}, Enabled, WhenCreated, DistinguishedName |
  Export-Csv -Path "ad-users.csv" -NoTypeInformation

# Export groups
Get-ADGroup -Filter * -Properties Members, Description, GroupScope, GroupCategory, ManagedBy |
  Select-Object Name, Description, GroupScope, GroupCategory, `
  @{N='MemberCount';E={$_.Members.Count}}, `
  @{N='ManagedBy';E={($_.ManagedBy -split ',')[0] -replace 'CN=',''}} |
  Export-Csv -Path "ad-groups.csv" -NoTypeInformation
```

Then import the CSV files through the Identity Radar CSV import flow.

## Verification

- The Integrations page shows a green "Connected" status for your source
- The Identities page displays imported identities with correct names and attributes
- The overview dashboard metric cards reflect the imported data

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Azure AD test connection fails | Verify Tenant ID, Client ID, and secret. Confirm admin consent was granted. |
| LDAP connection timeout | Check firewall rules. Port 389 (LDAP) or 636 (LDAPS) must be reachable. |
| No users imported after sync | Verify the base DN and OU scope include the target users. |
| CSV import shows 0 records | Ensure the CSV is UTF-8 encoded with headers in the first row. |

## Next Steps

- [CSV Import Guide](./csv-import.md)
- [Your First 15 Minutes](./first-15-minutes.md)
- [Dashboard Overview](../user-guide/dashboard-overview.md)
