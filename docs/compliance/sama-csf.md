# SAMA CSF Compliance Mapping

> Map Identity Radar features to Saudi Arabian Monetary Authority Cyber Security Framework.

## Prerequisites

- Familiarity with SAMA CSF requirements
- Identity Radar deployed with identity data imported
- Organization operating in the financial sector in Saudi Arabia

## Overview

The SAMA Cyber Security Framework applies to financial institutions regulated by the Saudi Central Bank. Identity Radar provides continuous IAM posture monitoring aligned with SAMA CSF domains.

## Control Mapping

### 3.1 Cyber Security Leadership and Governance

| SAMA Control | Requirement | Identity Radar Feature |
|-------------|-------------|----------------------|
| 3.1.1 | Cyber security governance | RBAC roles (Viewer, Analyst, IAM Admin, CISO, Admin) |
| 3.1.3 | Roles and responsibilities | User management with defined role permissions |

### 3.2 Cyber Security Risk Management

| SAMA Control | Requirement | Identity Radar Feature |
|-------------|-------------|----------------------|
| 3.2.1 | Risk identification | AI risk scoring, attack path discovery |
| 3.2.2 | Risk assessment | 11-factor risk score with tier violation weighting |
| 3.2.3 | Risk treatment | AI remediation plans with approval workflow |

### 3.3 Cyber Security Operations

| SAMA Control | Requirement | Identity Radar Feature |
|-------------|-------------|----------------------|
| 3.3.1 | Identity and access management | Full identity lifecycle management |
| 3.3.2 | Privileged access management | Tier 0 inventory, shadow admin detection |
| 3.3.3 | Access control | Entitlement radar, SoD violation detection |
| 3.3.5 | Application security | App registration and managed identity tracking |
| 3.3.7 | Logging and monitoring | Audit trail, action log with decision capture |

### 3.4 Third Party Cyber Security

| SAMA Control | Requirement | Identity Radar Feature |
|-------------|-------------|----------------------|
| 3.4.1 | Third-party risk | Vendor and contractor identity tracking |
| 3.4.2 | Third-party access management | Contractor entitlement monitoring, certification |

### 3.5 Cyber Security Incident Management

| SAMA Control | Requirement | Identity Radar Feature |
|-------------|-------------|----------------------|
| 3.5.1 | Incident detection | ITDR threat detection, anomaly detection |
| 3.5.2 | Incident response | Violation workflow (acknowledge, escalate, remediate) |

## Generating Compliance Reports

1. Navigate to **Audit Trail**
2. Set the date range for the reporting period
3. Click **Export** and select **SAMA CSF Report**
4. The report maps audit entries and metrics to SAMA CSF control domains

## Verification

The compliance report provides evidence for each applicable SAMA CSF domain with relevant identity posture metrics.

## Next Steps

- [NCA ECC Compliance](./nca-ecc.md)
- [PDPL Compliance](./pdpl.md)
- [Audit Trail](../user-guide/audit-trail.md)
