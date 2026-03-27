# HashiCorp Vault Integration

Connect Identity Radar to HashiCorp Vault to import identity entities, groups, policy assignments, auth method roles, and secret engine inventory for machine identity tracking.

## Prerequisites

- HashiCorp Vault (self-hosted or HCP Vault) version 1.10 or later
- A Vault token or AppRole credentials with appropriate policy access
- Network connectivity from Identity Radar to the Vault API (typically HTTPS on port 8200)

## Data Pulled

| Data Type | API Endpoint | Description |
|-----------|-------------|-------------|
| Entities | `GET /v1/identity/entity/id` | Identity entities with metadata, aliases, and auth method linkage |
| Groups | `GET /v1/identity/group/id` | Internal and external groups with member entities and policies |
| Policies | `GET /v1/sys/policy/{name}` | Policy definitions for tier classification |
| Auth Methods | `GET /v1/sys/auth` | Auth method configuration (AppRole, LDAP, OIDC, etc.) |
| Secret Engines | `GET /v1/sys/mounts` | KV, PKI, database, transit, SSH engines (mapped as resources) |

## Step 1: Create a Vault Policy for Identity Radar

Create a policy file `identity-radar.hcl`:

```hcl
# Read identity entities and groups
path "identity/entity/id" {
  capabilities = ["list"]
}
path "identity/entity/id/*" {
  capabilities = ["read"]
}
path "identity/group/id" {
  capabilities = ["list"]
}
path "identity/group/id/*" {
  capabilities = ["read"]
}

# Read policies
path "sys/policy" {
  capabilities = ["list"]
}
path "sys/policy/*" {
  capabilities = ["read"]
}

# Read auth methods
path "sys/auth" {
  capabilities = ["read"]
}

# Read secret engine mounts
path "sys/mounts" {
  capabilities = ["read"]
}

# Read AppRole roles (if applicable)
path "auth/approle/role" {
  capabilities = ["list"]
}
path "auth/approle/role/*" {
  capabilities = ["read"]
}

# Health check
path "sys/health" {
  capabilities = ["read"]
}
```

Apply the policy:
```bash
vault policy write identity-radar identity-radar.hcl
```

## Step 2: Create Authentication Credentials

### Option A: Token-Based Authentication

```bash
vault token create -policy=identity-radar -period=768h -display-name="identity-radar"
```

### Option B: AppRole Authentication (Recommended for Production)

```bash
vault auth enable approle
vault write auth/approle/role/identity-radar \
  token_policies="identity-radar" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=720h

# Get role ID and secret ID
vault read auth/approle/role/identity-radar/role-id
vault write -f auth/approle/role/identity-radar/secret-id
```

## Step 3: Connect in Identity Radar

1. Navigate to **Settings** > **Integrations** > **Connect New Source**.
2. Select **HashiCorp Vault**.
3. Enter the following:
   - **Vault Address**: e.g., `https://vault.example.com:8200`
   - **Vault Token** (Option A): The token from Step 2A
   - **AppRole Role ID** (Option B): The role ID from Step 2B
   - **AppRole Secret ID** (Option B): The secret ID from Step 2B
4. Click **Test Connection** to verify.
5. Click **Save** to enable the integration.

## Tier Classification

| Vault Policy / Role | Identity Radar Tier |
|--------------------|-------------------|
| `root` policy | Tier 0 |
| Policies with `admin`, `sudo`, or `superuser` in name | Tier 1 |
| `default`, read-only, or list-only policies | Tier 2 |

## Identity Type Inference

Identity Radar infers human vs. non-human identity type from Vault auth method aliases:

| Auth Method | Inferred Type |
|------------|--------------|
| `ldap`, `oidc`, `userpass`, `github` | Human |
| `approle`, `token`, `aws`, `gcp`, `kubernetes` | Non-Human (Service Account) |

## Secret Engine Resource Mapping

Secret engines are mapped as resources in Identity Radar:

| Engine Type | Resource Type |
|------------|--------------|
| `kv` (Key/Value) | `application` |
| `pki` (Certificates) | `cloud_resource` |
| `database` | `database` |
| `transit` (Encryption) | `application` |
| `ssh` (SSH Certificates) | `server` |

## Sync Frequency

- **Recommended**: Every 4 hours
- **Note**: Vault API does not use pagination; all entities are listed then fetched individually

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `403 permission denied` | Verify the token/AppRole has the `identity-radar` policy attached |
| `503 Vault is sealed` | Vault must be unsealed before Identity Radar can connect |
| Empty entity list | Verify identity entities exist (Vault may use aliases only without entities) |
| AppRole login fails | Verify auth/approle is enabled; check role ID and secret ID are valid |
| Slow sync | Large numbers of entities require individual API calls; consider increasing sync interval |
| Token expired | Regenerate the token or rotate the AppRole secret ID |
