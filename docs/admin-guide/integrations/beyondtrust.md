# BeyondTrust PAM Integration

Connect Identity Radar to BeyondTrust Password Safe / Privileged Remote Access to import privileged accounts, console users, user groups, access policies, and session data.

## Prerequisites

- BeyondTrust Password Safe **v23.0 or later** with API access enabled
- A dedicated API registration in BeyondTrust Console
- A RunAs user with **read-only** permissions for accounts, users, groups, and policies
- Network connectivity from the Identity Radar server to the BeyondTrust appliance (HTTPS, typically port 443)

## Setup Steps

### Step 1: Create an API Registration

1. Log in to the **BeyondTrust Console** as an administrator.
2. Navigate to **Configuration > General > API Registrations**.
3. Click **Add API Registration**.
4. Provide a name (e.g., `Identity Radar Read-Only`).
5. Under **Authentication Rules**, select **API Key** authentication.
6. Save the registration and copy the generated **API Key**.

### Step 2: Create a RunAs User

1. In the BeyondTrust Console, go to **Configuration > Role Based Access > User Management**.
2. Create a new user (e.g., `svc-identity-radar`).
3. Assign the user a role with the following minimum permissions:
   - **Managed Accounts**: Read
   - **Users & Groups**: Read
   - **Access Policies**: Read
   - **Sessions**: Read (optional, for session audit data)
   - **Requests**: Read (optional, for access request history)
4. Note the username for the RunAs header.

### Step 3: Configure in Identity Radar

1. In Identity Radar, go to **Integrations > Add New Source**.
2. Select **BeyondTrust PAM**.
3. Fill in the connection details:
   - **Host URL**: The base URL of your BeyondTrust appliance (e.g., `https://pam.yourcompany.com`)
   - **API Key**: The key generated in Step 1
   - **RunAs User**: The username created in Step 2

### Step 4: Test Connection

Click **Test Connection**. A successful test will confirm:
- API authentication was successful
- Managed accounts are accessible
- The number of accessible accounts is displayed

### Step 5: Initial Sync

Click **Sync Now** to trigger the first data import. Depending on the number of managed accounts, this may take a few minutes.

## Data Pulled

| Data Type | API Endpoint | Identity Radar Mapping |
|-----------|-------------|----------------------|
| Managed Accounts | `GET /ManagedAccounts` | Non-human identities (service_account) |
| Console Users | `GET /Users` | Human identities |
| User Groups | `GET /UserGroups` | Groups (security / privileged_access) |
| Access Policies | `GET /AccessPolicies` | Entitlements (policy assignments) |
| Access Requests | `GET /Requests` | Entitlements (checkout evidence) |
| Sessions | `GET /Sessions` | Audit trail enrichment |

## Tier Classification

Identity Radar automatically classifies BeyondTrust managed accounts into AD tiers:

| Tier | Criteria |
|------|----------|
| **Tier 0** | Domain Admin accounts, accounts targeting domain controllers, Enterprise Admin, Schema Admin, KRBTGT, PKI, ADFS |
| **Tier 1** | Server admin accounts, database credentials (SQL, Oracle), root accounts, application service accounts |
| **Tier 2** | Workstation-level accounts, desktop admin credentials |

## Risk Tags

The connector flags the following risk conditions:

- **emergency_access**: Access requests marked as Emergency or Break Glass
- **no_approval**: Policies with auto-approve enabled (no human approval gate)
- **excessive_privilege**: Accounts with Domain Admin or Enterprise Admin level access
- **no_justification_required**: Policies that do not require a reason for checkout

## Sync Frequency

Recommended: Every **4 hours** for managed accounts and policies, every **1 hour** for session data if compliance monitoring is active.

## Troubleshooting

| Error | Cause | Resolution |
|-------|-------|------------|
| **401 Unauthorized** | Invalid API key | Verify the API key in BeyondTrust Console > API Registrations |
| **403 Forbidden** | RunAs user lacks permissions | Check that the RunAs user has Read permissions for the required resources |
| **Connection Timeout** | Network issue or incorrect host URL | Verify the host URL and ensure HTTPS connectivity on port 443 |
| **Empty Results** | RunAs user cannot see any managed accounts | Ensure the RunAs user's role has access to at least one safe/vault |
| **429 Too Many Requests** | API rate limit hit | Reduce sync frequency or contact BeyondTrust support for rate limit adjustment |
