# Identity Explorer

> For analysts and admins: search, filter, and manage all identities in your organization.

## Prerequisites

- Signed in with at least Viewer role
- Identities imported via a connected source or CSV

## Identity Table

The explorer displays a sortable, filterable data table with these columns:

| Column | Description |
|--------|-------------|
| Name | Display name of the identity |
| Type | Human or Non-Human |
| Sub-type | Employee, contractor, service account, managed identity, etc. |
| AD Tier | Classified tier (Tier 0, 1, 2, or Unclassified) |
| Effective Tier | Highest tier actually accessed |
| Tier Violation | Badge shown when effective tier exceeds classified tier |
| Risk Score | 0-100, color-coded (green/yellow/orange/red) |
| Status | Active, inactive, disabled, dormant, orphaned, suspended |
| Source | The system this identity was imported from |
| Last Logon | Most recent authentication timestamp |
| Entitlement Count | Number of permissions held |
| Violation Count | Number of open policy violations |

## Filtering

Use the filter bar above the table to narrow results:

- **Type**: Human, Non-Human, or All
- **Sub-type**: Employee, contractor, service account, etc.
- **Tier**: Tier 0, 1, 2, Unclassified
- **Risk Score Range**: Drag the slider to set min/max
- **Status**: Active, dormant, disabled, etc.
- **Source System**: Active Directory, Azure AD, Okta, etc.
- **Tier Violations Only**: Toggle to show only identities with violations

## Bulk Actions

Select multiple identities using the checkboxes, then choose a bulk action:

- **Trigger Review**: Start an access review for selected identities
- **Update Tier**: Reclassify the tier for selected identities
- **Disable**: Disable the selected identities

Bulk actions require IAM Admin or higher role.

## Export

Click **Export** to download the current filtered results as a CSV file.

## Identity Detail

Click any row to navigate to the identity detail page with tabbed views:

- **Overview**: Key attributes, manager, owner (for NHI), department
- **Accounts**: Linked accounts across platforms with MFA status
- **Entitlements**: All permissions with tier classification and certification status
- **Group Memberships**: Direct and nested groups with tier classification
- **Violations**: Policy violations for this identity
- **Activity Timeline**: Audit log entries for this identity
- **AI Insights**: AI-generated risk narrative and recommendations

## Verification

The identity table loads and displays all imported identities with correct attributes and working filters.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Table is empty | Check that data has been imported. Go to Integrations to verify. |
| Slow loading | Use filters to narrow the result set. Pagination limits to 50 rows per page. |
| Export fails | Ensure the filtered result set is under 10,000 rows for CSV export. |

## Next Steps

- [AD Tiering](./tiering.md)
- [Entitlement Radar](./entitlements.md)
- [Non-Human Identities](./nhi.md)
