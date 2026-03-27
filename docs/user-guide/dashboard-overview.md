# Dashboard Overview

> For all users: understand the main dashboard metrics and navigate to detailed views.

## Prerequisites

- Signed in to Identity Radar
- At least one data source connected or CSV imported

## Layout

The overview dashboard is divided into six sections:

### Hero Metric Cards

Four cards at the top summarize your posture at a glance:

| Card | Description |
|------|-------------|
| Total Identities | Count of all identities, split by human and non-human |
| Active Violations | Open policy violations requiring attention |
| Tier Violations | Identities with cross-tier access (highest priority risk) |
| Critical Risk | Identities scoring 80-100 on the risk scale |

Click any card to navigate to the corresponding detail page.

### Risk Posture Trend

A line chart showing your aggregate risk score over the last 30, 60, or 90 days. A declining trend indicates improving posture. Data points are generated every 6 hours by the risk scorer.

### Tier Compliance Gauge

A percentage gauge showing how many identities have no tier violations. Target is 100%. The gauge is color-coded:

- Green: 90%+ compliant
- Yellow: 70-89% compliant
- Red: Below 70% compliant

### Top 5 Riskiest Identities

Cards showing the five highest-risk identities with risk score, violation count, and tier status. Click any card to open the identity detail page.

### Pending Actions

A summary of items requiring human action:

- Certifications due for review
- Violations not yet acknowledged
- Access reviews pending

### Integration Health Strip

A row of colored indicators showing the sync status of each connected data source:

- Green: Connected, last sync successful
- Yellow: Syncing or minor delay
- Red: Error or disconnected

## Verification

The dashboard loads within 3 seconds and all sections display current data.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| All metrics show zero | Ensure you have imported data via a connected source or CSV |
| Risk trend chart is empty | Risk scores are recalculated every 6 hours. Wait for the first cycle or trigger a manual recalculation. |
| Integration strip shows red | Navigate to Integrations to diagnose the connection issue |

## Next Steps

- [Identity Explorer](./identities.md)
- [AD Tiering](./tiering.md)
- [Policy Violations](./violations.md)
