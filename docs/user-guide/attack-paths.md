# Attack Paths

> For analysts and CISOs: discover and analyze privilege escalation paths to Tier 0 assets.

## Prerequisites

- Signed in with at least Analyst role
- Identity, group, and entitlement data imported
- Active Directory delegation and ACL data available for best results

## Attack Surface Summary

The top of the page shows key metrics:

| Metric | Description |
|--------|-------------|
| Total Paths | Number of discovered escalation paths |
| Critical Paths | Paths with risk score 80+ |
| Average Length | Mean number of hops across all paths |
| Shortest to DA | Fewest hops from any non-admin identity to Domain Admin |

## Running a Scan

1. Click **Run Scan** to discover attack paths
2. The scanner analyzes group memberships, delegations, ACL entries, and entitlements
3. Results appear as a table of discovered paths

## Path Details

Each discovered path shows:

| Field | Description |
|-------|-------------|
| Source | The starting identity (potential attacker) |
| Target | The destination (typically a Tier 0 asset) |
| Length | Number of hops in the path |
| Risk Score | Computed severity (0-100) |
| Technique | Attack technique used at each hop (e.g., Kerberoasting, DCSync) |
| MITRE ID | Corresponding MITRE ATT&CK technique identifier |

Click a path to see the full visualization and AI narrative.

## Interactive Path Graph

The detail view shows an interactive graph with:

- Nodes representing identities, groups, and resources
- Edges showing the escalation relationships
- Color coding by tier (red for Tier 0, orange for Tier 1, blue for Tier 2)

## AI Narrative

Click **Generate Narrative** to get an AI-generated explanation of:

- How an attacker would traverse this path
- Why each step is possible
- Specific remediation recommendations to break the path
- Estimated effort and impact of remediation

## Verification

The attack path scanner discovers paths that match known escalation techniques in your environment.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No paths discovered | Ensure AD delegation and group membership data is imported |
| Scan takes too long | Large environments may take several minutes. Check scan progress. |
| Path visualization does not load | Refresh the page. Complex graphs may need a moment to render. |

## Next Steps

- [AD Tiering](./tiering.md)
- [AI Analysis](./ai-analysis.md)
- [Policy Violations](./violations.md)
