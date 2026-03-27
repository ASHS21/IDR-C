# Non-Human Identities

> For analysts and admins: manage service accounts, managed identities, API keys, and other machine identities.

## Prerequisites

- Signed in with at least Viewer role
- Non-human identities imported via connected sources or CSV

## NHI Inventory Table

The NHI page displays all non-human identities with these columns:

| Column | Description |
|--------|-------------|
| Name | Display name or service principal name |
| Sub-type | Service account, managed identity, app registration, API key, bot, machine, certificate |
| Tier | AD tier classification |
| Risk Score | 0-100 risk score |
| Status | Active, inactive, disabled, dormant, orphaned |
| Expiry | Expiration date (if set) |
| Owner | The human identity responsible for this NHI |

## Dashboard Sections

### Ownership Status

A breakdown showing:

- **Owned**: NHIs with an active, valid owner
- **Orphaned**: NHIs with no owner assigned
- **Owner Disabled**: NHIs whose owner has been disabled or terminated

### Expiry Tracker

NHIs approaching their expiration date or already expired but still active. Expired active NHIs are high-risk findings.

### Privilege Analysis

NHIs with admin or privileged access, sorted by risk score. Service accounts with Domain Admin or equivalent access appear at the top.

### Password/Secret Age

NHIs with credentials older than the policy threshold. Stale credentials increase the risk of undetected compromise.

## Actions

| Action | Required Role | Description |
|--------|--------------|-------------|
| Assign Owner | IAM Admin+ | Set or change the human owner |
| Disable | IAM Admin+ | Disable the NHI |
| Trigger Review | Analyst+ | Start an access review for the NHI |
| Update Tier | IAM Admin+ | Reclassify the tier |

## Verification

The NHI page displays all non-human identities with correct ownership status and expiry information.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| All NHIs show as orphaned | Owner mapping requires the `owner_identity_id` field. Check your data source configuration. |
| Expiry dates missing | Not all NHI types have expiry dates. API keys and certificates typically do. |
| NHIs not appearing | Ensure your import includes non-human identity types. Check sub-type filters. |

## Next Steps

- [Supply Chain Risk](../user-guide/identities.md)
- [Entitlement Radar](./entitlements.md)
- [Access Certifications](./certifications.md)
