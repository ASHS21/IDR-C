# SAP GRC Access Control / SAP IdM Integration

Connect Identity Radar to SAP GRC (Governance, Risk, Compliance) Access Control and optionally SAP Identity Management to import SAP users, roles, user-role assignments, and Separation of Duties (SoD) violations.

## Prerequisites

- SAP GRC Access Control 12.0 or later with OData APIs enabled
- An SAP service user with API access permissions
- Network connectivity from Identity Radar to the SAP GRC system (typically HTTPS on port 8443 or 443)

## Data Pulled

| Data Type | OData Service / Entity Set | Description |
|-----------|---------------------------|-------------|
| Users | `GRAC_API_USER_MGMT_SRV/UserSet` | SAP users with type, lock status, validity dates |
| Roles | `GRAC_API_ROLE_MGMT_SRV/RoleSet` | Composite, single, and derived roles |
| Role Assignments | `GRAC_API_USER_MGMT_SRV/UserRoleAssignmentSet` | User-to-role mappings with validity periods |
| SoD Violations | `GRAC_API_RISK_ANALYSIS_SRV/RiskSet` | Separation of Duties risks and conflicts |
| IdM Users (optional) | `/idmapi/v1/users` | Identity lifecycle data from SAP IdM |

## Step 1: Create an API Service User in SAP

1. Log in to SAP GUI (transaction `SU01`).
2. Create a new service user:
   - **User Type**: `S` (Service)
   - **User ID**: `IDRADAR_SVC`
3. Assign the following authorization roles:
   - `SAP_GRC_NWBC` (GRC basic navigation)
   - `SAP_GRAC_ACCESS_APPROVER` (read access to access request data)
   - Custom role with the authorizations below

## Step 2: Assign Required Authorizations

Create a custom role with these authorization objects:

| Authorization Object | Field | Value | Purpose |
|---------------------|-------|-------|---------|
| `S_SERVICE` | `SRV_TYPE` | `HT` | HTTP service access |
| `S_ICF` | `ICF_NODE` | Relevant ICF nodes for OData | OData endpoint access |
| `S_RFC` | `RFC_TYPE` | `FUNC` | RFC function module access |

The service user needs read access to:
- User Management OData services
- Role Management OData services
- Risk Analysis OData services

## Step 3: Activate OData Services

1. Go to transaction `/IWFND/MAINT_SERVICE`.
2. Activate the following services:
   - `GRAC_API_USER_MGMT_SRV`
   - `GRAC_API_ROLE_MGMT_SRV`
   - `GRAC_API_RISK_ANALYSIS_SRV`
3. Test each service by appending `/$metadata` to the service URL.

## Step 4: Connect in Identity Radar

1. Navigate to **Settings** > **Integrations** > **Connect New Source**.
2. Select **SAP GRC / SAP IdM**.
3. Enter the following:
   - **SAP GRC Base URL**: e.g., `https://sap-grc.example.com:8443`
   - **Username**: The service user ID (e.g., `IDRADAR_SVC`)
   - **Password**: The service user password
   - **SAP IdM Endpoint** (optional): e.g., `https://sap-idm.example.com:8443`
4. Click **Test Connection** to verify.
5. Click **Save** to enable the integration.

## Tier Classification

| SAP Profile / Authorization | Identity Radar Tier |
|---------------------------|-------------------|
| `SAP_ALL`, `SAP_NEW`, `S_A.SYSTEM` | Tier 0 (god-mode access) |
| `S_USER_GRP`, `S_TABU_DIS`, `S_BTCH_ADM`, `S_ADMI_FCD`, roles with "ADMIN" or "BASIS" | Tier 1 |
| Standard transaction roles (`S_TCODE`, `S_GUI`, `S_RFC`) | Tier 2 |

## SAP User Type Mapping

| SAP User Type Code | Description | Identity Radar Type |
|-------------------|-------------|-------------------|
| `A` | Dialog (interactive) | Human / Employee |
| `B` | System | Non-Human / Service Account |
| `C` | Communication | Non-Human / Service Account |
| `S` | Service | Non-Human / Service Account |
| `L` | Reference | Human / Contractor |

## SoD Violation Detection

When the Risk Analysis service is available, Identity Radar will:
- Tag entitlements involved in SoD violations with the `sod_violation` risk tag
- Tag critical/high-risk SoD conflicts with the `toxic_combination` risk tag
- Map conflicting role pairs for visibility in the Entitlement Radar dashboard

## Sync Frequency

- **Recommended**: Every 6 hours
- **Pagination**: OData `$skip`/`$top` with 100 records per page

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `401 Unauthorized` | Verify service user credentials; check if password has expired |
| `403 Forbidden` | Verify authorization objects are assigned; check ICF node configuration |
| `404 Not Found` on OData service | Activate the OData service in `/IWFND/MAINT_SERVICE` |
| Empty UserSet results | Verify the service user has `S_USER_GRP` authorization |
| No SoD risks returned | Verify `GRAC_API_RISK_ANALYSIS_SRV` is activated and risk analysis has been run |
| Timeout on large user bases | Increase HTTP timeout settings; use `$filter` to scope by user type |
