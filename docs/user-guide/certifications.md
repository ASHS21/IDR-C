# Access Certifications

> For managers and admins: review and certify identity access rights.

## Prerequisites

- Signed in with Manager, IAM Admin, or CISO role
- Entitlements imported and certification policies configured

## Certification Overview

Access certification is the process of periodically reviewing whether each identity's permissions are still appropriate. Identity Radar tracks certification status for every entitlement:

| Status | Meaning |
|--------|---------|
| Certified | Reviewed and approved within the policy period |
| Pending | Awaiting review |
| Expired | The certification period has lapsed without review |
| Revoked | Access removed during certification |

## Starting a Campaign

1. Navigate to **Certifications**
2. Click **Start Campaign** (IAM Admin+ required)
3. Configure the campaign scope: select identities by department, tier, or source system
4. Set the review deadline
5. Click **Launch**

The campaign creates review tasks assigned to each identity's manager.

## Reviewing Entitlements

As a reviewer (manager):

1. Open your pending certification tasks
2. For each entitlement, review the permission name, scope, tier, and last-used date
3. Choose an action:
   - **Certify**: Confirm the access is still needed
   - **Revoke**: Remove the access
   - **Flag for Review**: Escalate to the IAM team

## Bulk Certification

For large reviews, use the bulk certification feature:

1. Select all entitlements that should be certified
2. Click **Certify Selected**
3. Confirm the bulk action

## Progress Tracking

The certification dashboard shows:

- Total entitlements in the campaign
- Percentage certified, pending, revoked
- Progress by department and manager
- Overdue reviews highlighted in red

## Verification

Certification campaigns create review tasks, and completed certifications update the entitlement certification status.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot start campaign | Only IAM Admin and CISO roles can launch campaigns |
| No entitlements to review | Ensure entitlements have been imported and are marked as certifiable |
| Manager has no tasks | Check that identities have manager assignments |

## Next Steps

- [Entitlement Radar](./entitlements.md)
- [Audit Trail](./audit-trail.md)
- [Policy Violations](./violations.md)
