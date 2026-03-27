# NCA ECC Compliance Mapping

> Map Identity Radar features to National Cybersecurity Authority Essential Cybersecurity Controls.

## Prerequisites

- Familiarity with NCA ECC framework requirements
- Identity Radar deployed with identity data imported

## Overview

The NCA Essential Cybersecurity Controls (ECC) is a regulatory framework mandated for organizations in Saudi Arabia. Identity Radar provides automated evidence collection and continuous monitoring for identity-related ECC controls.

## Control Mapping

### 1. Identity and Access Management

| ECC Control | Requirement | Identity Radar Feature |
|-------------|-------------|----------------------|
| 1-3-1 | Establish identity and access management procedures | Policy configuration, RBAC enforcement |
| 1-3-2 | Implement access control based on least privilege | Entitlement radar, over-provisioned identity detection |
| 1-3-3 | Review access rights periodically | Access certification campaigns |
| 1-3-4 | Manage privileged access | Tier 0 inventory, shadow admin detection |
| 1-3-5 | Manage service accounts | NHI inventory, orphan detection, expiry tracking |
| 1-3-6 | Implement multi-factor authentication | MFA status monitoring, missing MFA violation detection |

### 2. Asset Management

| ECC Control | Requirement | Identity Radar Feature |
|-------------|-------------|----------------------|
| 1-2-1 | Maintain asset inventory | Resource inventory with tier classification |
| 1-2-3 | Classify assets by criticality | Tier classification (Tier 0/1/2) and criticality levels |

### 3. Audit and Accountability

| ECC Control | Requirement | Identity Radar Feature |
|-------------|-------------|----------------------|
| 1-8-1 | Enable audit logging | Full action log with actor, target, timestamp, rationale |
| 1-8-2 | Protect audit logs | Database-level protection with RLS |
| 1-8-3 | Review audit logs | Audit trail dashboard with filters and export |

### 4. Incident Management

| ECC Control | Requirement | Identity Radar Feature |
|-------------|-------------|----------------------|
| 1-6-1 | Detect security incidents | ITDR threat detection, canary identities |
| 1-6-3 | Respond to incidents | Violation acknowledgment, exception workflow, escalation |

### 5. Risk Management

| ECC Control | Requirement | Identity Radar Feature |
|-------------|-------------|----------------------|
| 1-1-1 | Establish risk management process | AI risk scoring, remediation plans |
| 1-1-2 | Conduct risk assessments | AI analysis with projected impact |

## Generating Compliance Reports

1. Navigate to **Audit Trail**
2. Set the date range for the reporting period
3. Click **Export** and select **NCA ECC Report**
4. The PDF report includes all actions, violations, certifications, and exceptions for the period

## Verification

The compliance report contains evidence mapped to each applicable ECC control with timestamps and actor information.

## Next Steps

- [SAMA CSF Compliance](./sama-csf.md)
- [PDPL Compliance](./pdpl.md)
- [Audit Trail](../user-guide/audit-trail.md)
