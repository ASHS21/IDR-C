# Frequently Asked Questions

> Answers to common questions organized by category.

---

## Installation

**Q: What are the minimum system requirements?**
A: 16 GB RAM, 4 CPU cores, 50 GB disk space, and Docker Desktop 4.40+. See the [System Requirements](./system-requirements.md) page for full details.

**Q: Can I run Identity Radar without internet access?**
A: Yes. Identity Radar supports fully air-gapped deployment. Prepare an offline package on an internet-connected machine and transfer via USB. See [Air-Gapped Installation](../getting-started/install-airgap.md).

**Q: Does Identity Radar require a cloud subscription?**
A: No. The entire platform runs locally on your infrastructure. No cloud services, API keys, or external dependencies are required. The Anthropic API key is optional (for cloud AI fallback only).

**Q: How long does installation take?**
A: First installation takes 10-30 minutes depending on internet speed, primarily for downloading the AI model (~20 GB). Subsequent starts take under 30 seconds.

**Q: Can I change the default port from 3000?**
A: Yes. Edit `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` in `.env.local` and update the port mapping in `docker-compose.yml`.

---

## Data and Privacy

**Q: Where is my data stored?**
A: All data is stored locally in a PostgreSQL database running in a Docker container on your server. No data leaves your infrastructure.

**Q: Is data encrypted at rest?**
A: PostgreSQL supports transparent data encryption. For production, use an encrypted filesystem or Docker volume encryption. Integration credentials are stored encrypted in the database.

**Q: Can I export all my data?**
A: Yes. Use the export script or `pg_dump` to create a full backup. See [Backup and Restore](../admin-guide/backup-restore.md).

**Q: How much disk space does the database use?**
A: Approximately 1 GB per 10,000 monitored identities, including all entitlements, violations, and audit history.

**Q: Does the AI model send data externally?**
A: No. The default AI model runs entirely locally via Docker Model Runner. If you configure the optional Anthropic API fallback, identity context is sent to Anthropic's API. The local model is recommended for sensitive environments.

---

## Identity and Access

**Q: What identity sources does Identity Radar support?**
A: Active Directory (LDAP), Azure AD / Entra ID (Graph API), Okta (REST API), and CSV imports. Additional sources can be added via the integration framework.

**Q: How are risk scores calculated?**
A: Risk scores use an 11-factor formula with deterministic weights totaling 100 points. See [Risk Scoring Reference](./risk-scoring.md) for the exact formula.

**Q: What is a tier violation?**
A: A tier violation occurs when an identity classified at a lower AD tier has access to resources at a higher tier. For example, a Tier 2 user with Domain Admin access. See [Tier Classification](./tier-classification.md).

**Q: How does Identity Radar detect shadow admins?**
A: Through five methods: ACL analysis, delegation chain inspection, nested group enumeration, service ownership review, and GPO rights analysis.

**Q: Can Identity Radar detect attack paths?**
A: Yes. The attack path engine analyzes group memberships, delegations, ACLs, and entitlements to discover privilege escalation paths to Tier 0 assets.

**Q: What is a non-human identity (NHI)?**
A: An identity representing a machine, application, or service rather than a person. Includes service accounts, managed identities, API keys, and bot accounts. See [NHI Guide](../user-guide/nhi.md).

---

## Integrations

**Q: How often does Identity Radar sync with source systems?**
A: Default sync frequencies are: Azure AD every 4 hours, Active Directory every 6 hours, Okta every 6 hours. These are configurable per integration.

**Q: Can I import data manually?**
A: Yes. Use the CSV import feature to upload identity and group data from PowerShell exports or custom CSVs. See [CSV Import](../getting-started/csv-import.md).

**Q: What permissions are needed for Azure AD integration?**
A: An app registration with `User.Read.All`, `Group.Read.All`, `Directory.Read.All`, and `AuditLog.Read.All` application permissions. See [Azure AD Integration](../admin-guide/integrations/azure-ad.md).

**Q: Can I connect multiple data sources simultaneously?**
A: Yes. Identity Radar correlates identities across multiple sources using UPN, email, and SAM account name matching.

---

## Operations

**Q: How do I back up Identity Radar?**
A: Use the export script or `pg_dump` for database backups. See [Backup and Restore](../admin-guide/backup-restore.md).

**Q: How do I upgrade to a new version?**
A: Run the upgrade script which pulls the latest images, runs migrations, and restarts containers. See [Upgrade](../admin-guide/upgrade.md).

**Q: What compliance frameworks does Identity Radar support?**
A: NCA ECC, SAMA CSF, and PDPL. Policy rules can be mapped to specific framework controls. See [Compliance](../compliance/nca-ecc.md).

**Q: How do I reset the admin password?**
A: Use the database reset procedure described in [Troubleshooting](../admin-guide/troubleshooting.md).

---

## Troubleshooting

**Q: The dashboard is blank after login.**
A: Clear browser cookies, verify the application container is running with `docker compose ps`, and check application logs. See [Troubleshooting](../admin-guide/troubleshooting.md).

**Q: Docker Desktop will not start on Windows.**
A: Ensure WSL 2 is installed (`wsl --install`), reboot, and try again. See [Install on Windows](../getting-started/install-windows.md).

**Q: The AI analysis is not working.**
A: Verify the local AI model is loaded by checking Docker Model Runner status. If using Anthropic API, verify the API key in `.env.local`.

**Q: Integration sync is failing.**
A: Check the error message in Integrations. Common causes: expired credentials, network connectivity, or rate limiting. See [Troubleshooting](../admin-guide/troubleshooting.md).

**Q: I see "rate limit" errors.**
A: External APIs (Microsoft Graph, Okta) enforce rate limits. Wait 60 seconds and retry. The application retries automatically with exponential backoff.

## Next Steps

- [Getting Started](../getting-started/system-requirements.md)
- [Troubleshooting](../admin-guide/troubleshooting.md)
- [Glossary](./glossary.md)
