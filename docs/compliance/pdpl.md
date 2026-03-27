# PDPL Compliance

> Identity Radar features supporting Saudi Arabia's Personal Data Protection Law.

## Prerequisites

- Familiarity with PDPL requirements
- Identity Radar deployed with identity data imported

## Overview

Saudi Arabia's Personal Data Protection Law (PDPL) governs the collection, processing, and protection of personal data. Identity Radar supports PDPL compliance through access governance, audit trails, and data handling controls.

## Relevant PDPL Articles and Identity Radar Features

### Article 4: Lawful Processing

| Requirement | Identity Radar Feature |
|-------------|----------------------|
| Process data only for specified purposes | Entitlement governance tracks who has access to what data and why |
| Minimize data collection | Data quality scoring identifies unnecessary data accumulation |

### Article 5: Consent and Transparency

| Requirement | Identity Radar Feature |
|-------------|----------------------|
| Maintain records of processing activities | Full audit trail with decision capture |
| Demonstrate lawful basis for access | Certification campaigns document access justification |

### Article 10: Access Rights

| Requirement | Identity Radar Feature |
|-------------|----------------------|
| Implement appropriate access controls | RBAC, tier enforcement, least privilege monitoring |
| Review access periodically | Certification campaigns, dormancy detection |
| Remove unnecessary access | Unused entitlement detection, revocation workflow |

### Article 14: Data Breach Notification

| Requirement | Identity Radar Feature |
|-------------|----------------------|
| Detect breaches promptly | ITDR threat detection, canary identities |
| Identify affected data subjects | Blast radius analysis, identity graph |

### Article 19: Security Measures

| Requirement | Identity Radar Feature |
|-------------|----------------------|
| Protect personal data from unauthorized access | MFA enforcement, tier violation detection |
| Implement technical security measures | Risk scoring, policy enforcement, shadow admin detection |

### Article 29: Data Protection Impact Assessment

| Requirement | Identity Radar Feature |
|-------------|----------------------|
| Assess risks to personal data | AI risk analysis with projected impact |
| Document risk mitigation measures | Remediation plans with approval workflow |

## Data Handling in Identity Radar

Identity Radar itself handles identity metadata (names, emails, department, access rights). It does not process or store business data.

| Data Type | Stored | Purpose |
|-----------|--------|---------|
| Identity names and emails | Yes | Identity correlation and management |
| Access rights and entitlements | Yes | Posture assessment and governance |
| Authentication timestamps | Yes | Dormancy detection and anomaly analysis |
| Business/operational data | No | Not in scope |

## Data Export for PDPL Compliance

For data subject access requests (DSARs), use the data export feature:

1. Navigate to **Settings > Audit & Compliance > Data Export**
2. Search for the data subject by name or email
3. Export all stored data for that identity as a JSON file

## Verification

Identity Radar provides audit evidence and access governance capabilities that support PDPL compliance for identity-related processing activities.

## Next Steps

- [NCA ECC Compliance](./nca-ecc.md)
- [SAMA CSF Compliance](./sama-csf.md)
- [Audit Trail](../user-guide/audit-trail.md)
