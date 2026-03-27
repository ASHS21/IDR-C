# AD Tiering Compliance

> For security analysts and admins: monitor and enforce Active Directory tiering model compliance.

## Prerequisites

- Signed in with at least Viewer role
- Identities imported with tier classifications

## Tier Model Overview

Identity Radar enforces a three-tier model:

| Tier | Scope | Examples |
|------|-------|----------|
| Tier 0 | Identity plane control | Domain Controllers, AD DS, Azure AD Connect, PKI, Enterprise Admins |
| Tier 1 | Server and application control | Member servers, application service accounts, Server Operators |
| Tier 2 | Workstation and end-user | Workstations, standard user accounts, helpdesk |

A **tier violation** occurs when an identity classified at a lower tier has access to higher-tier resources.

## Dashboard Sections

### Tier Pyramid

A visual pyramid showing the count of identities in each tier. Tier 0 should be the smallest group at the top. Click any tier level to filter the identity explorer to that tier.

### Tier Violation Heatmap

A matrix showing classified tier (rows) vs. accessed tier (columns). Cells with violations are highlighted in red. The number in each cell shows how many identities have that cross-tier access pattern.

### Cross-Tier Access Paths

A table listing all identities with tier violations, sorted by severity. Columns include:

- Identity name and type
- Assigned tier
- Effective tier (highest accessed)
- Risk score
- Number of cross-tier entitlements

### Tier 0 Inventory

A dedicated section listing every Tier 0 identity and resource. This is the crown jewels view. Review this list regularly to ensure no unauthorized identities have Tier 0 access.

### Unclassified Identities

Identities not yet assigned a tier. Use the **Auto-Classify** action to assign tiers based on group memberships and resource access patterns.

## Verification

The tiering page loads with accurate tier counts matching your imported data, and tier violations are correctly detected.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| All identities show unclassified | Tier classification requires group membership data. Ensure your import includes group information. |
| Tier violations not detected | The tier violation scanner runs every 6 hours. Wait for the next cycle or check the risk scorer status. |
| Pyramid counts do not add up | Some identities may be in the unclassified category. Check the unclassified queue. |

## Next Steps

- [Policy Violations](./violations.md)
- [Entitlement Radar](./entitlements.md)
- [Tier Classification Reference](../reference/tier-classification.md)
