# DigiCert CertCentral Integration

Connect Identity Radar to DigiCert CertCentral to track certificate lifecycle, expiry, and certificate-based identities as non-human identities (NHIs).

## Prerequisites

- A DigiCert CertCentral account with API access enabled
- An API key with read permissions
- Network connectivity from the Identity Radar server to `www.digicert.com` (HTTPS port 443)

## Setup Steps

### Step 1: Generate an API Key

1. Log in to **DigiCert CertCentral** at `https://www.digicert.com/account/`.
2. Navigate to **Account > API Keys**.
3. Click **Create API Key**.
4. Provide a description (e.g., `Identity Radar Read-Only`).
5. Set permissions to **Read Only** for certificate orders and organizations.
6. Copy the generated API key (it will only be shown once).

### Step 2: Configure in Identity Radar

1. In Identity Radar, go to **Integrations > Add New Source**.
2. Select **DigiCert CertCentral**.
3. Enter the **API Key** from Step 1.

### Step 3: Test Connection

Click **Test Connection**. A successful test will confirm:
- API key authentication was successful
- The connected user account is displayed

### Step 4: Initial Sync

Click **Sync Now** to trigger the first certificate import. The connector will pull all certificate orders from your CertCentral account.

## Data Pulled

| Data Type | API Endpoint | Identity Radar Mapping |
|-----------|-------------|----------------------|
| Certificate Orders | `GET /order/certificate` | Non-human identities (type: certificate) |
| Organizations | `GET /organization` | Groups (logical groupings of certificates) |
| Certificate Details | Embedded in order data | Entitlements, risk tags, expiry tracking |

## What Identity Radar Does with Certificates

### Identity Tracking
Each certificate is tracked as a **non-human identity** with subtype `certificate`. The common name becomes the identity's display name, and the serial number is used as the source ID.

### Expiry Monitoring
Certificates approaching expiry (within 30 days) are automatically flagged with an `expiring_soon` risk tag. Expired certificates are marked as inactive.

### Weak Key Detection
Certificates with key sizes below 2048 bits are flagged with a `weak_key` risk tag, indicating they should be reissued with stronger cryptography.

### Wildcard Certificate Tracking
Wildcard certificates (e.g., `*.corp.com`) are flagged as privileged identities since they grant access to all subdomains. They receive a `wildcard` risk tag.

### SAN Coverage
Subject Alternative Name (SAN) entries are tracked as additional entitlements, showing the full scope of resources each certificate can authenticate to.

## Tier Classification

| Tier | Certificate Pattern |
|------|-------------------|
| **Tier 0** | Wildcard certs for internal/corporate domains (`*.corp.com`, `*.ad.company.com`), domain controller certs (`dc01.corp.com`), PKI/CA certs, ADFS certs, LDAP certs |
| **Tier 1** | Wildcard certs for external domains, server certs (`srv-*.corp.com`), application certs (`api.corp.com`), database certs, mail/exchange certs |
| **Tier 2** | Standard SSL certificates for websites and non-critical services |

## Risk Tags

| Tag | Condition |
|-----|-----------|
| `wildcard` | Common name starts with `*.` |
| `weak_key` | Key size < 2048 bits |
| `expiring_soon` | Certificate expires within 30 days |
| `self_signed` | No recognized CA issuer |
| `weak_signature` | SHA-1 or MD5 signature algorithm |
| `wildcard_san` | SAN entry inherited from a wildcard certificate |

## Sync Frequency

Recommended: Every **6 hours**. Certificate data changes infrequently, so less frequent syncs are acceptable. Increase frequency to every **1 hour** if monitoring certificates that are close to expiry.

## Troubleshooting

| Error | Cause | Resolution |
|-------|-------|------------|
| **401 Unauthorized** | Invalid or expired API key | Generate a new API key in CertCentral > Account > API Keys |
| **403 Forbidden** | API key lacks required permissions | Ensure the key has read access to certificate orders and organizations |
| **429 Rate Limited** | Too many API requests | DigiCert enforces rate limits; reduce sync frequency or add delays between requests |
| **Empty Results** | No certificate orders in account | Verify the CertCentral account has active certificate orders |
| **Timeout** | Large certificate inventory | For accounts with thousands of certificates, the initial sync may take longer; this is normal |
