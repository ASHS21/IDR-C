# User Management

> For admins: add users, assign roles, and manage team access.

## Prerequisites

- Signed in with Admin role
- Organization created

## Roles Overview

Identity Radar uses five roles with hierarchical permissions:

| Role | Permissions |
|------|------------|
| Viewer | Read-only access to all dashboards |
| Analyst | Viewer + acknowledge violations, trigger reviews |
| IAM Admin | Analyst + certify, revoke, update tiers, manage integrations |
| CISO | Full access including approve exceptions and AI plans, manage policies |
| Admin | CISO + organization settings, user management |

## Adding a User

1. Navigate to **Settings > Team**
2. Click **Invite**
3. Enter the user's email address
4. Select a role from the dropdown
5. Click **Send Invitation**

The user receives an email invitation (if SMTP is configured) with a link to create their account. Invitations expire after 7 days.

## Managing Existing Users

From the Team section:

- **Change Role**: Click the role dropdown next to a user's name and select a new role
- **Disable User**: Click the menu button and select **Disable**. The user loses access immediately but their audit history is preserved.

## Pending Invitations

The Pending Invitations section shows all outstanding invitations with:

- Invitee email
- Assigned role
- Expiry date
- Status (pending, accepted, expired)

## Verification

1. After inviting a user, the invitation appears in the Pending Invitations list
2. After the user accepts, they appear in the Team Members list with the correct role
3. The user can access dashboards appropriate to their role level

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Invitation email not received | Verify SMTP settings in Settings. Check the recipient's spam folder. |
| User cannot see expected pages | Verify the user's role grants the required permission level |
| Cannot change user role | Only Admin role can modify user roles |

## Next Steps

- [RBAC Matrix Reference](../reference/rbac-matrix.md)
- [Settings and Policies](./policies.md)
