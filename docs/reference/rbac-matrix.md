# RBAC Matrix

> Full role-to-action permission matrix for Identity Radar.

## Roles

| Role | Level | Description |
|------|-------|-------------|
| Viewer | 0 | Read-only access to all dashboards |
| Analyst | 1 | Viewer + acknowledge violations, trigger reviews |
| IAM Admin | 2 | Analyst + certify, revoke, update tiers, manage integrations |
| CISO | 3 | Full access including approve exceptions and AI plans |
| Admin | 4 | CISO + organization settings, user management |

Roles are hierarchical: each role inherits all permissions from lower levels.

## Permission Matrix

| Action | Viewer | Analyst | IAM Admin | CISO | Admin |
|--------|--------|---------|-----------|------|-------|
| View dashboards | Yes | Yes | Yes | Yes | Yes |
| View identities | Yes | Yes | Yes | Yes | Yes |
| View violations | Yes | Yes | Yes | Yes | Yes |
| View audit trail | Yes | Yes | Yes | Yes | Yes |
| Export data (CSV) | Yes | Yes | Yes | Yes | Yes |
| Acknowledge violation | No | Yes | Yes | Yes | Yes |
| Trigger review | No | Yes | Yes | Yes | Yes |
| Escalate risk | No | Yes | Yes | Yes | Yes |
| Certify entitlement | No | No | Yes | Yes | Yes |
| Revoke access | No | No | Yes | Yes | Yes |
| Update tier | No | No | Yes | Yes | Yes |
| Manage integrations | No | No | Yes | Yes | Yes |
| Trigger sync | No | No | Yes | Yes | Yes |
| Import CSV | No | No | Yes | Yes | Yes |
| Approve exception | No | No | No | Yes | Yes |
| Approve AI plan | No | No | No | Yes | Yes |
| Manage policies | No | No | No | Yes | Yes |
| Generate AI analysis | No | Yes | Yes | Yes | Yes |
| Manage users | No | No | No | No | Yes |
| Organization settings | No | No | No | No | Yes |
| API key management | No | No | No | No | Yes |

## Enforcement Layers

RBAC is enforced at three levels:

1. **Database (Row-Level Security)**: Organization isolation -- users can only see data belonging to their organization
2. **API Routes (Middleware)**: Role checks before action execution -- unauthorized requests return 403
3. **UI (Conditional Rendering)**: Action buttons are hidden for users without the required role

## Next Steps

- [User Management](../admin-guide/user-management.md)
- [Policies](../admin-guide/policies.md)
