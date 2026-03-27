# Active Directory Integration

> For IAM admins: connect Identity Radar to your Active Directory domain.

## Prerequisites

- Signed in with IAM Admin or Admin role
- Network access from the Identity Radar server to your domain controller (port 389 LDAP or 636 LDAPS)
- A service account with read-only access to the target OUs

## Option 1: LDAP Connection

### Step 1: Create a Service Account

On your domain controller, create a dedicated service account for Identity Radar:

- Name: `svc-identityradar`
- Type: Standard user account
- Permissions: Read access to target OUs (delegate "Read All Properties" at the OU level)
- Password policy: Non-expiring or aligned with your rotation schedule

### Step 2: Configure in Identity Radar

1. Navigate to **Integrations > Connect New Source > Active Directory**
2. Fill in the connection details:

| Field | Example Value |
|-------|--------------|
| LDAP Server | `ldap://dc01.acmefs.local` or `ldaps://dc01.acmefs.local` |
| Base DN | `DC=acmefs,DC=local` |
| Bind DN | `CN=svc-identityradar,OU=ServiceAccounts,DC=acmefs,DC=local` |
| Bind Password | The service account password |
| Target OUs | `OU=Users,DC=acmefs,DC=local; OU=ServiceAccounts,DC=acmefs,DC=local` |
| Sync Frequency | Every 6 hours (default) |

3. Click **Test Connection**

### Step 3: Run Initial Sync

After the test succeeds, click **Sync Now**. The first sync imports users, groups, and group memberships.

### Step 4: Verify

Navigate to **Identities** and confirm your AD users appear with correct attributes.

## Option 2: CSV Export

If direct LDAP connectivity is not possible, export data from PowerShell on your domain controller.

### Export Users

```powershell
Get-ADUser -Filter * -Properties DisplayName, UserPrincipalName, SamAccountName, `
  EmailAddress, Department, Manager, LastLogonDate, PasswordLastSet, MemberOf, `
  Enabled, WhenCreated, DistinguishedName |
  Select-Object DisplayName, UserPrincipalName, SamAccountName, EmailAddress, `
  Department, @{N='Manager';E={($_.Manager -split ',')[0] -replace 'CN=',''}}, `
  LastLogonDate, PasswordLastSet, `
  @{N='MemberOf';E={($_.MemberOf -join ';')}}, Enabled, WhenCreated, DistinguishedName |
  Export-Csv -Path "C:\Exports\ad-users.csv" -NoTypeInformation -Encoding UTF8
```

### Export Groups

```powershell
Get-ADGroup -Filter * -Properties Members, Description, GroupScope, GroupCategory, ManagedBy |
  Select-Object Name, Description, GroupScope, GroupCategory, `
  @{N='MemberCount';E={$_.Members.Count}}, `
  @{N='ManagedBy';E={($_.ManagedBy -split ',')[0] -replace 'CN=',''}} |
  Export-Csv -Path "C:\Exports\ad-groups.csv" -NoTypeInformation -Encoding UTF8
```

### Import the CSVs

Transfer the CSV files to a machine with browser access to Identity Radar, then use the [CSV Import](../../getting-started/csv-import.md) flow.

## Verification

- The Integrations page shows a green "Connected" status
- Identities display correct AD attributes (UPN, SAM account name, department)
- Group memberships are populated
- The sync log shows successful record counts

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Connection timeout | Verify firewall allows port 389 (LDAP) or 636 (LDAPS) from the Identity Radar server |
| Authentication failed | Verify the bind DN and password. Test with `ldapsearch` or `ldp.exe`. |
| No users imported | Check the base DN and target OUs. Ensure the service account has read access. |
| TLS/SSL errors | For LDAPS, ensure the domain controller's certificate is trusted or add it to the trust store. |
| Partial sync | Check the sync log for specific errors. Common cause: objects in OUs without read permission. |

## Next Steps

- [Azure AD Integration](./azure-ad.md)
- [CSV Import Formats](../../reference/csv-formats.md)
- [Identities Explorer](../../user-guide/identities.md)
