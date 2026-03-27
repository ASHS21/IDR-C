# Audit Trail

> For compliance teams and admins: review all actions taken in Identity Radar.

## Prerequisites

- Signed in with at least Viewer role

## Action Log Timeline

The audit trail displays every action taken in the system in chronological order. Each entry records:

| Field | Description |
|-------|-------------|
| Timestamp | When the action occurred |
| Action Type | What was done (certify, revoke, acknowledge, etc.) |
| Actor | Who performed the action |
| Target | The identity or entitlement affected |
| Source | Manual, automated, or AI-recommended |
| Rationale | Why the action was taken (when provided) |

## Action Types

| Action | Description |
|--------|-------------|
| Certify Entitlement | Manager certified an access right |
| Revoke Access | Entitlement was removed |
| Approve Exception | CISO approved a policy violation exception |
| Escalate Risk | Identity flagged for elevated attention |
| Trigger Review | Access review campaign started |
| Update Tier | Identity reclassified to a different AD tier |
| Sync Source | Manual integration sync triggered |
| Acknowledge Violation | Analyst acknowledged a violation |
| Generate Recommendation | AI analysis requested |

## Filtering

Filter the audit trail by:

- **Action Type**: Select one or more action types
- **Actor**: Search by the person who performed the action
- **Target Identity**: Search by the affected identity
- **Date Range**: Start and end dates
- **Source**: Manual, automated, or AI-recommended

## Compliance Export

Click **Export** to generate a PDF audit report suitable for NCA ECC, SAMA CSF, and PDPL compliance evidence. The export includes:

- All filtered actions within the selected date range
- Actor and target details
- Rationale text for decision capture
- Timestamps in ISO 8601 format

## Verification

The audit trail contains a complete record of all actions, with no gaps in the timeline.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Audit trail is empty | Actions are logged only when users or automation take actions. Import and review data to generate entries. |
| Export fails | Ensure the date range does not exceed 12 months for a single export |
| Missing rationale | Rationale is optional for some actions. Encourage team members to provide reasons. |

## Next Steps

- [Policy Violations](./violations.md)
- [NCA ECC Compliance](../compliance/nca-ecc.md)
- [SAMA CSF Compliance](../compliance/sama-csf.md)
