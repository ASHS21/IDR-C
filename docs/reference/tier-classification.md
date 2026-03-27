# Tier Classification Reference

> Active Directory tiering model definitions, examples, and auto-classification rules.

## Tier Definitions

### Tier 0 -- Identity Plane Control

Tier 0 contains assets that control the identity infrastructure itself. Compromise of a Tier 0 asset means total domain compromise.

**Examples**:
- Domain Controllers (DCs)
- Active Directory Domain Services (AD DS)
- Azure AD Connect servers
- Public Key Infrastructure (PKI) / Certificate Authority
- Active Directory Federation Services (ADFS)
- Schema Admins group members
- Enterprise Admins group members
- Domain Admins group members
- Tier 0 admin accounts
- KRBTGT account
- Azure AD Global Administrators

### Tier 1 -- Server and Application Control

Tier 1 contains servers, applications, and the accounts that manage them. Compromise of Tier 1 gives an attacker control over business applications and data.

**Examples**:
- Member servers (file, print, application, database)
- Application servers (ERP, CRM, HRIS)
- Tier 1 admin accounts
- Server Operators group members
- Service accounts for enterprise applications
- SQL Server service accounts
- Exchange Server administrators
- SCCM/MECM administrators

### Tier 2 -- Workstation and End-User

Tier 2 contains workstations and standard user accounts. This is the broadest tier with the most identities.

**Examples**:
- Workstations and laptops
- Standard user accounts
- Helpdesk accounts
- Contractor accounts
- VPN-only accounts

## Auto-Classification Rules

Identity Radar automatically classifies identities based on group memberships and resource access:

| Condition | Assigned Tier |
|-----------|--------------|
| Member of Domain Admins, Enterprise Admins, or Schema Admins | Tier 0 |
| Has write access to a Domain Controller | Tier 0 |
| Member of Server Operators, Account Operators, or Backup Operators | Tier 1 |
| Has admin access to member servers | Tier 1 |
| Service account for enterprise application | Tier 1 |
| All other accounts | Tier 2 |
| Cannot be determined | Unclassified |

## Tier Violations

A tier violation occurs when an identity's effective tier (highest tier actually accessed) exceeds its classified tier:

| Scenario | Classified | Effective | Violation? |
|----------|-----------|-----------|------------|
| Standard user with no elevated access | Tier 2 | Tier 2 | No |
| Standard user with server admin access | Tier 2 | Tier 1 | Yes |
| Standard user with Domain Admin | Tier 2 | Tier 0 | Yes (Critical) |
| Server admin with DC access | Tier 1 | Tier 0 | Yes |
| Domain Admin accessing DCs | Tier 0 | Tier 0 | No |

## Next Steps

- [AD Tiering Dashboard](../user-guide/tiering.md)
- [Risk Scoring](./risk-scoring.md)
- [Glossary](./glossary.md)
