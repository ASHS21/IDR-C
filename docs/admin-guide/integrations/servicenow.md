# ServiceNow ITSM/ITOM Integration

Connect Identity Radar to your ServiceNow instance to import users, groups, group memberships, roles, and catalog item access.

## Prerequisites

- A ServiceNow instance (any supported version: Rome, San Diego, Tokyo, Utah, Vancouver, Washington, Xanadu)
- An integration user account with appropriate roles
- Network connectivity from Identity Radar to your ServiceNow instance

## Step 1: Create an Integration User in ServiceNow

1. Log in to your ServiceNow instance as an administrator.
2. Navigate to **System Administration > Users**.
3. Click **New** to create a new user.
4. Set the following fields:
   - **User ID**: `identity_radar_integration`
   - **First Name**: `Identity Radar`
   - **Last Name**: `Integration`
   - **Active**: Checked
   - **Web service access only**: Checked (recommended)
5. Set a strong password and save the record.

## Step 2: Assign Required Roles

Assign the following roles to the integration user:

| Role | Purpose |
|------|---------|
| `itil` | Read access to ITSM tables (users, groups, incidents) |
| `personalize_choices` | Read access to choice lists and reference data |
| `rest_api_explorer` | Access to the Table API and REST API endpoints |

To assign roles:
1. Open the integration user record.
2. In the **Roles** related list, click **Edit**.
3. Add the three roles listed above.
4. Click **Save**.

## Step 3 (Optional): Create an OAuth Application

For production deployments, OAuth2 is recommended over Basic Auth.

1. Navigate to **System OAuth > Application Registry**.
2. Click **New** and select **Create an OAuth API endpoint for external clients**.
3. Set the following fields:
   - **Name**: `Identity Radar`
   - **Client ID**: Auto-generated (copy this)
   - **Client Secret**: Auto-generated (copy this)
   - **Active**: Checked
4. Save the record.
5. Note the **Client ID** and **Client Secret** for the next step.

## Step 4: Add ServiceNow in Identity Radar

1. In Identity Radar, navigate to **Integrations**.
2. Click **Connect New Source**.
3. Select **ServiceNow**.
4. Fill in the configuration:
   - **Integration Name**: A descriptive name (e.g., "Corporate ServiceNow")
   - **Instance URL**: Your ServiceNow instance URL (e.g., `https://your-company.service-now.com`)
   - **Username**: The integration user ID from Step 1
   - **Password**: The integration user password
   - **Client ID** (optional): OAuth client ID from Step 3
   - **Client Secret** (optional): OAuth client secret from Step 3

> **Note**: If both Basic Auth and OAuth2 credentials are provided, OAuth2 takes precedence.

## Step 5: Test Connection

Click **Test Connection** to verify:
- The instance URL is reachable
- Credentials are valid
- The integration user can query the `sys_user` table
- The response includes the count of active users

## Step 6: Start Sync

After a successful connection test, click **Save** to create the integration, then trigger a manual sync to import data.

## Data Pulled

| ServiceNow Table | Identity Radar Object | Description |
|---|---|---|
| `sys_user` | Identities (human) | All user accounts |
| `cmdb_ci_service_account` | Identities (non-human) | Service accounts from CMDB |
| `sys_user_group` | Groups | All active user groups |
| `sys_user_grmember` | Group Memberships | User-to-group assignments |
| `sys_user_has_role` | Entitlements (role) | Role assignments per user |
| `sc_cat_item_user_mtom` | Entitlements (catalog) | Catalog item access per user |

### Identity Mapping

| ServiceNow Field | Identity Radar Field |
|---|---|
| `sys_id` | `sourceId` |
| `name` | `displayName` |
| `user_name` | `samAccountName` |
| `email` | `email` |
| `department` (dot-walk) | `department` |
| `active` | `status` (true=active, false=inactive) |
| `locked_out` | `status` override (locked_out=true -> disabled) |
| `last_login_time` | `lastLogonAt` |

### Tier Classification for Roles

| ServiceNow Role | AD Tier |
|---|---|
| `admin`, `security_admin` | Tier 0 |
| `itil_admin`, `user_admin`, `import_admin`, `web_service_admin` | Tier 1 |
| `itil`, `catalog_admin`, `maint`, `personalize` | Tier 2 |
| Roles containing "admin" or "security" | Tier 1 |
| All other roles | Tier 2 |

## Sync Frequency Recommendation

**Every 6 hours** (360 minutes) is recommended for most deployments. Adjust based on your change velocity:
- High change environments: Every 4 hours
- Low change environments: Every 12 hours

## Troubleshooting

### 401 Unauthorized

- Verify the username and password are correct.
- Ensure the integration user account is active and not locked out.
- If using OAuth2, verify the client ID and secret are correct and the OAuth application is active.

### 403 Forbidden

- The integration user is missing required roles.
- Verify `itil`, `personalize_choices`, and `rest_api_explorer` roles are assigned.
- Some tables (e.g., `cmdb_ci_service_account`) may require additional ACLs.

### Connection Timeout

- The ServiceNow instance may be hibernating (common on developer instances).
- Wake the instance by logging in via a browser first.
- Check network/firewall rules between Identity Radar and the ServiceNow instance.

### Empty Results

- Verify the integration user has read access to the `sys_user` table.
- Check if ACL rules restrict the integration user from reading records.
- Try querying the Table API directly: `GET /api/now/table/sys_user?sysparm_limit=5`

### Slow Sync

- ServiceNow instances with many users (>10,000) may take several minutes.
- The connector uses pagination (100 records per page) to avoid timeouts.
- Consider filtering by active users only if inactive accounts are not needed.
