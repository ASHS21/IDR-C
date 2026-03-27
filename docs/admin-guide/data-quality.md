# Data Quality

> For IAM admins: monitor and improve the quality of identity data.

## Prerequisites

- Signed in with IAM Admin or Admin role
- Identity data imported

## Quality Score

The data quality score ranges from 0-100 and is computed from three dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Completeness | 40% | Percentage of key fields populated across all identities |
| Freshness | 30% | How recently data was synced from source systems |
| Accuracy | 30% | Consistency of data across sources and absence of conflicts |

## Field Coverage

The field coverage breakdown shows which identity fields are populated and at what percentage:

- Display Name, UPN, Email (typically 90%+)
- Department, Manager, AD Tier (varies by data source)
- Last Logon, Password Last Set (requires sign-in log data)

## Identity Resolution

Identity Radar automatically detects potential duplicate identities using:

| Method | Description |
|--------|-------------|
| Deterministic | Exact match on UPN, email, or SAM account name |
| Fuzzy | Similar names with matching departments |
| AI-Matched | AI-detected matches based on attribute patterns |

### Review Queue

Potential duplicates appear in the Review Queue. For each pair:

1. Review the matched attributes
2. Click **Same Person** to merge, or **Different People** to dismiss
3. Confirmed matches create identity aliases

## AI Enrichment Suggestions

The AI engine suggests data improvements:

- Missing tier classifications based on group memberships
- Department assignments based on peer analysis
- Owner assignments for orphaned NHIs

Click **Apply** to accept a suggestion or **Reject** to dismiss it.

## Verification

The data quality score increases after resolving duplicates and applying enrichment suggestions.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Low completeness score | Import additional data fields from your sources. Check CSV mapping for unmapped columns. |
| False duplicate matches | Dismiss incorrect matches. The AI improves with feedback. |
| Quality score not updating | Scores recalculate after data syncs. Trigger a manual sync to refresh. |

## Next Steps

- [CSV Import](./integrations/csv-import.md)
- [Identities Explorer](../user-guide/identities.md)
- [AI Analysis](../user-guide/ai-analysis.md)
