# AI Analysis and Remediation Plans

> For analysts and CISOs: generate AI-powered risk analysis and prioritized remediation plans.

## Prerequisites

- Signed in with Analyst, IAM Admin, or CISO role
- Identity data imported (the AI needs data to analyze)
- AI model running (local Ollama or Anthropic API configured)

## Generating an Analysis

1. Navigate to **AI Analysis**
2. Click **Generate New Analysis**
3. Configure parameters:
   - **Timeline (days)**: How quickly you want to remediate (7, 14, 30, 60, 90 days)
   - **Risk Appetite**: Conservative (fix everything), Moderate (balance effort and risk), or Aggressive (quick wins only)
4. Click **Generate Analysis**

The AI engine analyzes your current identity posture, including all violations, tier status, entitlements, and dormancy data.

## Understanding the Results

### Executive Summary

A natural-language summary of your identity risk posture written for CISO-level audiences.

### Recommended Actions

A prioritized, ranked list of specific actions. Each recommendation includes:

- **Description**: What to do (e.g., "Revoke Domain Admin from svc-backup")
- **Effort**: Low, Medium, or High
- **Impact**: Projected risk score reduction
- **Justification**: Why this action matters, in plain language

### Quick Wins

Low-effort, high-impact actions extracted from the full recommendation list. Start here for immediate posture improvement.

### Projected Impact

A before/after visualization showing:

- Current total violation count vs. projected count after remediation
- Current average risk score vs. projected score
- Current tier violation count vs. projected count

## Approval Workflow

Remediation plans require approval before execution:

1. **Review** the plan and each recommended action
2. **Approve** (CISO only): Converts recommendations to actionable tasks
3. **Reject**: Capture the rationale for rejection

Approved plans create kinetic actions that are tracked in the Audit Trail.

## Historical Plans

Previous AI analyses are stored with their outcomes:

- Which recommendations were approved and executed
- Actual vs. projected risk reduction
- Date generated, approved, and completed

## Verification

The AI analysis generates a complete remediation plan with specific, actionable recommendations tailored to your data.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Analysis fails | Check that the AI model is running. Navigate to Settings to verify AI configuration. |
| Recommendations seem generic | Ensure sufficient identity data is imported. The AI needs violation and entitlement data to personalize recommendations. |
| Cannot approve plan | Only users with CISO role can approve plans. |

## Next Steps

- [AI Chat](./ai-chat.md)
- [Policy Violations](./violations.md)
- [Audit Trail](./audit-trail.md)
