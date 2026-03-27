# CSV Import (Admin Guide)

> For IAM admins: import identity and group data from CSV files of various formats.

## Prerequisites

- Signed in with IAM Admin or Admin role
- CSV files in UTF-8 encoding with headers in the first row

## Supported Formats

Identity Radar recognizes these common export formats automatically:

| Format | Source | Key Headers |
|--------|--------|-------------|
| AD PowerShell | `Get-ADUser` export | DisplayName, UserPrincipalName, SamAccountName |
| Azure AD Export | Azure Portal CSV export | displayName, userPrincipalName, mail |
| Generic Identity | Custom CSV | Requires at least a name column |

## Column Specifications

### Identity CSV

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| DisplayName | Yes | Full name | "Ahmed Al-Rashidi" |
| UserPrincipalName | No | UPN | "ahmed@acmefs.sa" |
| SamAccountName | No | SAM name | "a.alrashidi" |
| Email | No | Email address | "ahmed@acmefs.sa" |
| Department | No | Department name | "Information Technology" |
| Status | No | active, disabled, etc. | "active" |
| AD Tier | No | tier_0, tier_1, tier_2 | "tier_2" |
| LastLogonDate | No | Last authentication date | "2026-01-15" |
| PasswordLastSet | No | Password change date | "2025-11-01" |
| MemberOf | No | Group memberships (semicolon-separated) | "Domain Admins;IT-Staff" |

### Group CSV

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| Name | Yes | Group name | "Domain Admins" |
| Description | No | Group description | "Designated administrators of the domain" |
| GroupScope | No | DomainLocal, Global, Universal | "Global" |
| GroupCategory | No | Security, Distribution | "Security" |
| MemberCount | No | Number of members | "5" |
| ManagedBy | No | Group owner | "Ahmed Al-Rashidi" |

## Sample Files

See [CSV Format Reference](../../reference/csv-formats.md) for downloadable sample files.

## Import Process

1. Navigate to **Integrations > Connect New Source > CSV Import**
2. Drag and drop the CSV file
3. Review the AI-detected column mapping
4. Adjust any incorrect mappings
5. Click **Confirm & Import**

## Verification

After import, verify:
- Identity count matches the CSV row count (minus headers and duplicates)
- Key fields (name, UPN, department) are populated correctly
- Risk scores are calculated for all imported identities

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Encoding errors | Save the CSV as UTF-8 with BOM in your spreadsheet application |
| Column detection fails | Ensure headers are in the first row with no blank rows above |
| Duplicate identities | The system de-duplicates by UPN and email. Existing records are updated. |
| Date parsing errors | Use ISO 8601 format (YYYY-MM-DD) for best results |

## Next Steps

- [Active Directory Integration](./active-directory.md)
- [CSV Format Reference](../../reference/csv-formats.md)
- [Data Quality](./data-quality.md)
