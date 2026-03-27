# Your First 15 Minutes

> A guided walkthrough of Identity Radar after importing your first data.

## Prerequisites

- Identity Radar installed and running
- At least one data source connected or a CSV imported
- Signed in with an admin account

## Minute 1-3: Understand the Overview Dashboard

Navigate to **Dashboard**. The overview page shows:

- **Total Identities**: Count of human and non-human identities. Click to go to the Identity Explorer.
- **Active Violations**: Open policy violations. Red means critical issues need attention.
- **Tier Violations**: Identities accessing resources above their classified tier. This is the primary risk signal.
- **Critical Risk**: Identities with a risk score of 80-100.

The **Risk Posture** chart shows your trend over the last 30 days. A downward trend means your posture is improving.

## Minute 3-5: Explore Your Riskiest Identity

The **Top Riskiest Identities** section shows the five identities with the highest risk scores. Click on the top identity to open its detail page.

On the identity detail page, review:

- **Risk Score Gauge**: A 0-100 score with color coding (green/yellow/orange/red)
- **Overview Tab**: Key attributes, manager, last logon date
- **Entitlements Tab**: All permissions this identity holds, with tier classification
- **Violations Tab**: Specific policy violations for this identity

## Minute 5-8: Check AD Tiering Compliance

Navigate to **AD Tiering**. This page shows:

- **Tier Pyramid**: Visual breakdown of identities per tier. Tier 0 should be the smallest group.
- **Violation Heatmap**: A matrix showing where cross-tier access exists. Red cells indicate violations.
- **Tier 0 Inventory**: Every identity and resource in your crown jewels tier. Review this carefully.

Look for Tier 2 identities accessing Tier 0 resources -- these are the highest-priority violations.

## Minute 8-10: Review Policy Violations

Navigate to **Violations**. The violation feed shows all open issues:

- **Tier Breach**: Cross-tier access violations
- **Excessive Privilege**: Identities with more access than peers
- **Dormant Access**: Active accounts not used in 90+ days
- **Missing MFA**: Accounts without multi-factor authentication

Sort by severity (Critical first) to prioritize your response.

## Minute 10-12: Take Your First Action

Pick the highest-severity violation and take action:

**To acknowledge a violation**: Click the violation, then click **Acknowledge**. This marks it as seen without remediation.

**To approve an exception**: If the access is justified, click **Approve Exception**, enter a rationale, and set an expiry date.

**To revoke access**: Click the identity, go to the Entitlements tab, select the violating entitlement, and click **Revoke**.

All actions are logged in the Audit Trail with your identity, timestamp, and rationale.

## Minute 12-15: Run Your First AI Analysis

Navigate to **AI Analysis** and click **Generate New Analysis**.

Configure:
- **Timeline**: 30 days (how quickly you want to remediate)
- **Risk Appetite**: Start with Moderate

Click **Generate Analysis**. The AI engine analyzes your identity posture and produces:

- A ranked list of recommended actions
- Projected risk reduction percentage
- Quick wins (low-effort, high-impact actions)

Review the plan and click **Approve** to convert recommendations into actionable tasks.

## Verification

After 15 minutes, you should have:

- Reviewed your overall identity posture on the dashboard
- Examined at least one high-risk identity in detail
- Understood your AD tiering compliance status
- Taken at least one action on a policy violation
- Generated your first AI remediation plan

## Next Steps

- [Dashboard Overview Guide](../user-guide/dashboard-overview.md)
- [Identity Explorer](../user-guide/identities.md)
- [AD Tiering Guide](../user-guide/tiering.md)
- [AI Analysis Guide](../user-guide/ai-analysis.md)
