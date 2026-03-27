# CSV Format Reference

> Column specifications and sample data for identity and group CSV imports.

## Identity CSV

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| DisplayName | Full name of the identity | Ahmed Al-Rashidi |

### Optional Columns

| Column | Description | Example |
|--------|-------------|---------|
| UserPrincipalName | UPN | ahmed@acmefs.sa |
| SamAccountName | SAM account name | a.alrashidi |
| Email | Email address | ahmed@acmefs.sa |
| Department | Department | Information Technology |
| Manager | Manager name or DN | Sara Al-Otaibi |
| Status | Identity status | active |
| ADTier | Tier classification | tier_2 |
| LastLogonDate | Last logon timestamp | 2026-03-15 |
| PasswordLastSet | Password change date | 2025-11-01 |
| MemberOf | Groups (semicolon-separated) | Domain Admins;IT-Staff |
| Enabled | Boolean | TRUE |
| WhenCreated | Account creation date | 2023-06-01 |
| DistinguishedName | Full AD DN | CN=Ahmed,OU=Users,DC=acmefs,DC=local |
| Type | human or non_human | human |
| SubType | employee, service_account, etc. | employee |
| SourceId | External ID (objectGUID, etc.) | a1b2c3d4-... |

### Sample Identity CSV

```csv
DisplayName,UserPrincipalName,SamAccountName,Email,Department,Status,ADTier,LastLogonDate,Enabled,Type,SubType
"Ahmed Al-Rashidi",ahmed@acmefs.sa,a.alrashidi,ahmed@acmefs.sa,IT,active,tier_2,2026-03-15,TRUE,human,employee
"Sara Al-Otaibi",sara@acmefs.sa,s.alotaibi,sara@acmefs.sa,Finance,active,tier_2,2026-03-14,TRUE,human,employee
"svc-backup",svc-backup@acmefs.sa,svc-backup,,IT,active,tier_1,2026-03-15,TRUE,non_human,service_account
"app-crm-prod",,app-crm-prod,,IT,active,tier_1,2026-03-10,TRUE,non_human,app_registration
```

## Group CSV

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| Name | Group name | Domain Admins |

### Optional Columns

| Column | Description | Example |
|--------|-------------|---------|
| Description | Group description | Designated administrators of the domain |
| GroupScope | DomainLocal, Global, Universal | Global |
| GroupCategory | Security, Distribution | Security |
| MemberCount | Number of members | 5 |
| ManagedBy | Owner display name | Ahmed Al-Rashidi |
| ADTier | Tier classification | tier_0 |

### Sample Group CSV

```csv
Name,Description,GroupScope,GroupCategory,MemberCount,ManagedBy,ADTier
"Domain Admins","Designated administrators of the domain",Global,Security,3,"Ahmed Al-Rashidi",tier_0
"IT-Staff","IT department staff",Global,Security,25,"Sara Al-Otaibi",tier_2
"Server Operators","Can administer domain servers",DomainLocal,Security,5,,tier_1
"Finance-Users","Finance department users",Global,Security,40,,tier_2
```

## Date Formats

The CSV import accepts these date formats (auto-detected):

| Format | Example |
|--------|---------|
| ISO 8601 | 2026-03-15 |
| ISO 8601 with time | 2026-03-15T10:30:00Z |
| US format | 03/15/2026 |
| European format | 15/03/2026 |
| Long format | March 15, 2026 |

ISO 8601 is recommended for best compatibility.

## Next Steps

- [CSV Import Guide](../getting-started/csv-import.md)
- [CSV Import (Admin)](../admin-guide/integrations/csv-import.md)
- [Identities Explorer](../user-guide/identities.md)
