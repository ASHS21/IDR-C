# Policy Violations

> For analysts and admins: manage policy violations, exceptions, and track remediation.

## Prerequisites

- Signed in with at least Viewer role
- Policies configured and identity data imported

## Violation Types

| Type | Description |
|------|-------------|
| Tier Breach | Identity accesses resources above its classified tier |
| SoD Conflict | Identity holds conflicting permissions |
| Excessive Privilege | Identity has significantly more entitlements than peers |
| Dormant Access | Active identity not authenticated in 90+ days |
| Orphaned Identity | Non-human identity with no owner |
| Missing MFA | Account without multi-factor authentication enabled |
| Expired Certification | Entitlement certification has lapsed |
| Password Age | Password exceeds the maximum age policy |

## Dashboard Sections

### Violation Feed

A real-time list of all policy violations, sortable by severity and filterable by type and status.

### Severity Breakdown

A summary showing counts of Critical, High, Medium, and Low severity violations with trend indicators.

### Violation Type Distribution

A bar chart showing the relative frequency of each violation type, helping identify systemic issues.

### Exception Tracker

All approved exceptions with their rationale, approver, and expiry countdown. Expired exceptions are flagged for re-review.

### Remediation Rate

The percentage of violations remediated within the SLA period (configurable in Settings > Policies). Shows 90-day trailing performance.

## Actions

| Action | Required Role | Description |
|--------|--------------|-------------|
| Acknowledge | Analyst+ | Mark a violation as seen |
| Approve Exception | CISO | Accept the risk with a rationale and expiry date |
| Revoke Access | IAM Admin+ | Remove the violating entitlement |
| Escalate | Analyst+ | Flag for CISO attention |

## Verification

The violations page shows all detected violations with correct severity and type classifications.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No violations shown | Policy rules may not be configured. Go to Settings > Policies. |
| Violation count does not match expectations | The violation scanner runs every 6 hours. Wait for the next cycle. |
| Cannot approve exception | Only users with CISO role can approve exceptions. |

## Next Steps

- [AD Tiering](./tiering.md)
- [Audit Trail](./audit-trail.md)
- [AI Analysis](./ai-analysis.md)
