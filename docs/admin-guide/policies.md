# Policies

> For CISOs and admins: configure policy rules that drive violation detection and risk scoring.

## Prerequisites

- Signed in with CISO or Admin role

## Policy Types

| Type | Description |
|------|-------------|
| Access Policy | Rules governing who can access what resources |
| Tiering Rule | Rules enforcing AD tier boundaries |
| SoD Rule | Separation of Duties conflict definitions |
| Password Policy | Password age, complexity, and rotation requirements |
| MFA Policy | Multi-factor authentication requirements by tier/role |
| Lifecycle Policy | Rules for dormancy detection and account expiration |
| Certification Policy | Certification period and scope rules |

## Creating a Policy

1. Navigate to **Settings > Policies**
2. Click **Create Policy**
3. Fill in the policy details:
   - **Name**: Descriptive name (e.g., "Tier 0 MFA Requirement")
   - **Type**: Select from the types above
   - **Severity**: Critical, High, Medium, or Low
   - **Rule Definition**: JSON rule logic (varies by type)
   - **Framework Mappings**: Link to NCA ECC, SAMA CSF, or PDPL controls
4. Click **Save**

## Policy Rule Examples

### Tiering Rule

Detect Tier 2 identities with Tier 0 access:

```json
{
  "condition": "identity.ad_tier == 'tier_2' AND entitlement.ad_tier_of_permission == 'tier_0'",
  "action": "create_violation",
  "violation_type": "tier_breach"
}
```

### Dormancy Rule

Flag active identities with no logon in 90 days:

```json
{
  "condition": "identity.status == 'active' AND days_since(identity.last_logon_at) > 90",
  "action": "create_violation",
  "violation_type": "dormant_access"
}
```

### MFA Policy

Require MFA for all Tier 0 and Tier 1 accounts:

```json
{
  "condition": "identity.ad_tier IN ('tier_0', 'tier_1') AND account.mfa_enabled == false",
  "action": "create_violation",
  "violation_type": "missing_mfa"
}
```

## Configuring Thresholds

In **Settings > Policies > Thresholds**, configure global values:

| Threshold | Default | Description |
|-----------|---------|-------------|
| Dormancy threshold | 90 days | Days without logon before flagging |
| Certification period | 90 days | Maximum time between certifications |
| Password max age | 90 days | Maximum password age |
| Over-privilege multiplier | 2x median | Entitlement count threshold |
| NHI ownership | Required | Whether NHIs must have an owner |

## Verification

After creating a policy, the violation scanner detects matching conditions on the next scan cycle (every 6 hours).

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Policy not detecting violations | Verify the rule JSON syntax. Check that the scan has run after policy creation. |
| Too many false positives | Adjust the rule conditions to be more specific. Consider raising the severity threshold. |
| Cannot create policy | Only CISO and Admin roles can create policies. |

## Next Steps

- [Policy Violations](../user-guide/violations.md)
- [NCA ECC Compliance](../compliance/nca-ecc.md)
- [Risk Scoring Reference](../reference/risk-scoring.md)
