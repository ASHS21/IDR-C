# Entitlement Radar

> For analysts and admins: find over-provisioned identities, toxic combinations, and unused entitlements.

## Prerequisites

- Signed in with at least Viewer role
- Entitlements imported via connected sources or CSV

## Dashboard Sections

### Over-Provisioned Identities

Identities with an entitlement count exceeding 2x the organizational median. These are prime candidates for access right-sizing.

### Toxic Combinations

Pairs or sets of entitlements that violate Separation of Duties (SoD) policies. For example, an identity that can both create and approve financial transactions.

### Unused Entitlements

Permissions that have not been used in over 90 days. These are candidates for revocation -- reducing attack surface with minimal business impact.

### Entitlement Distribution

A chart showing the breakdown of permission types by frequency: role assignments, group memberships, direct assignments, inherited, and delegated.

### Certification Status Breakdown

A pie chart showing the certification status of all entitlements:

| Status | Meaning |
|--------|---------|
| Certified | Reviewed and approved within the certification period |
| Pending | Awaiting review |
| Expired | Certification period has lapsed |
| Revoked | Access revoked after review |

## Actions

From the entitlement radar, you can:

1. **Certify**: Confirm an entitlement is still appropriate
2. **Revoke**: Remove an entitlement (requires IAM Admin role)
3. **Trigger Review**: Start a certification campaign for a group of entitlements

## Verification

The entitlement radar displays accurate counts and correctly identifies over-provisioned and unused entitlements.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No over-provisioned identities shown | All identities may have similar entitlement counts. Check the median value. |
| Unused entitlements not detected | The `last_used_at` field must be populated. Ensure sign-in logs are being imported. |
| Toxic combinations empty | SoD policies must be configured in Settings > Policies. |

## Next Steps

- [Access Certifications](./certifications.md)
- [Policy Violations](./violations.md)
- [AI Analysis](./ai-analysis.md)
