// Connector Factory
// Creates the appropriate connector instance based on the integration source type.
// All connectors are lazily loaded to avoid pulling in unnecessary dependencies.

import type { Connector, ConnectorType, ConnectorConfig } from './base'

/**
 * Create a connector instance for the given configuration.
 * Uses dynamic imports so that each connector module is only loaded when needed.
 */
export async function createConnectorAsync(config: ConnectorConfig): Promise<Connector> {
  switch (config.type) {
    case 'active_directory': {
      const { LDAPConnector } = await import('./ldap')
      return new LDAPConnector(config.credentials)
    }
    case 'azure_ad': {
      const { AzureADConnector } = await import('./azure-ad')
      return new AzureADConnector(config.credentials)
    }
    case 'okta': {
      const { OktaConnector } = await import('./okta')
      return new OktaConnector(config.credentials)
    }
    case 'csv': {
      const { CSVConnector } = await import('./csv')
      return new CSVConnector(config.credentials)
    }
    case 'sailpoint_iiq': {
      const { SailPointIIQConnector } = await import('./sailpoint-iiq')
      return new SailPointIIQConnector(config.credentials)
    }
    case 'broadcom_sso': {
      const { BroadcomSSOConnector } = await import('./broadcom-sso')
      return new BroadcomSSOConnector(config.credentials)
    }
    case 'broadcom_pam': {
      const { BroadcomPAMConnector } = await import('./broadcom-pam')
      return new BroadcomPAMConnector(config.credentials)
    }
    case 'servicenow': {
      const { ServiceNowConnector } = await import('./servicenow')
      return new ServiceNowConnector(config.credentials)
    }
    case 'microsoft_defender': {
      const { MicrosoftDefenderConnector } = await import('./microsoft-defender')
      return new MicrosoftDefenderConnector(config.credentials)
    }
    case 'sap_grc': {
      const { SapGrcConnector } = await import('./sap-grc')
      return new SapGrcConnector(config.credentials)
    }
    case 'hashicorp_vault': {
      const { HashiCorpVaultConnector } = await import('./hashicorp-vault')
      return new HashiCorpVaultConnector(config.credentials)
    }
    case 'splunk': {
      const { SplunkConnector } = await import('./splunk')
      return new SplunkConnector(config.credentials)
    }
    case 'beyondtrust': {
      const { BeyondTrustConnector } = await import('./beyondtrust')
      return new BeyondTrustConnector(config.credentials)
    }
    case 'digicert': {
      const { DigiCertConnector } = await import('./digicert')
      return new DigiCertConnector(config.credentials)
    }
    default:
      throw new Error(`Unknown connector type: ${(config as ConnectorConfig).type}`)
  }
}

/**
 * Synchronous factory using require() for backward compatibility.
 * Prefer createConnectorAsync() in new code.
 */
export function createConnector(config: ConnectorConfig): Connector {
  switch (config.type) {
    case 'active_directory': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LDAPConnector } = require('./ldap')
      return new LDAPConnector(config.credentials)
    }
    case 'azure_ad': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AzureADConnector } = require('./azure-ad')
      return new AzureADConnector(config.credentials)
    }
    case 'okta': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { OktaConnector } = require('./okta')
      return new OktaConnector(config.credentials)
    }
    case 'csv': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { CSVConnector } = require('./csv')
      return new CSVConnector(config.credentials)
    }
    case 'sailpoint_iiq': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SailPointIIQConnector } = require('./sailpoint-iiq')
      return new SailPointIIQConnector(config.credentials)
    }
    case 'broadcom_sso': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BroadcomSSOConnector } = require('./broadcom-sso')
      return new BroadcomSSOConnector(config.credentials)
    }
    case 'broadcom_pam': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BroadcomPAMConnector } = require('./broadcom-pam')
      return new BroadcomPAMConnector(config.credentials)
    }
    case 'servicenow': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ServiceNowConnector } = require('./servicenow')
      return new ServiceNowConnector(config.credentials)
    }
    case 'microsoft_defender': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MicrosoftDefenderConnector } = require('./microsoft-defender')
      return new MicrosoftDefenderConnector(config.credentials)
    }
    case 'sap_grc': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SapGrcConnector } = require('./sap-grc')
      return new SapGrcConnector(config.credentials)
    }
    case 'hashicorp_vault': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { HashiCorpVaultConnector } = require('./hashicorp-vault')
      return new HashiCorpVaultConnector(config.credentials)
    }
    case 'splunk': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SplunkConnector } = require('./splunk')
      return new SplunkConnector(config.credentials)
    }
    case 'beyondtrust': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BeyondTrustConnector } = require('./beyondtrust')
      return new BeyondTrustConnector(config.credentials)
    }
    case 'digicert': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DigiCertConnector } = require('./digicert')
      return new DigiCertConnector(config.credentials)
    }
    default:
      throw new Error(`Unknown connector type: ${(config as ConnectorConfig).type}`)
  }
}

/**
 * All supported connector types with metadata for the UI.
 */
export const CONNECTOR_REGISTRY: ConnectorMeta[] = [
  {
    type: 'active_directory',
    label: 'Active Directory (LDAP)',
    description: 'On-premises Active Directory via LDAP or CSV import',
    icon: 'server',
    requiredCredentials: ['host', 'port', 'baseDN', 'bindDN', 'bindPassword'],
    optionalCredentials: ['useTLS', 'mode', 'csvContent'],
    category: 'directory',
  },
  {
    type: 'azure_ad',
    label: 'Azure AD / Entra ID',
    description: 'Microsoft Entra ID via Microsoft Graph API',
    icon: 'cloud',
    requiredCredentials: ['tenantId', 'clientId', 'clientSecret'],
    optionalCredentials: [],
    category: 'directory',
  },
  {
    type: 'okta',
    label: 'Okta',
    description: 'Okta Identity Provider via REST API',
    icon: 'shield',
    requiredCredentials: ['domain', 'apiToken'],
    optionalCredentials: [],
    category: 'sso',
  },
  {
    type: 'sailpoint_iiq',
    label: 'SailPoint IdentityIQ',
    description: 'SailPoint IIQ via REST or SCIM 2.0 API',
    icon: 'users',
    requiredCredentials: ['baseUrl', 'username', 'password'],
    optionalCredentials: ['useSCIM'],
    category: 'iga',
  },
  {
    type: 'broadcom_sso',
    label: 'Broadcom SiteMinder SSO',
    description: 'Broadcom (CA) SiteMinder SSO policy server',
    icon: 'lock',
    requiredCredentials: ['baseUrl', 'adminUser', 'adminPassword', 'userDirectory'],
    optionalCredentials: ['policyDomain'],
    category: 'sso',
  },
  {
    type: 'broadcom_pam',
    label: 'Broadcom PAM',
    description: 'Broadcom (CA) Privileged Access Manager',
    icon: 'key',
    requiredCredentials: ['baseUrl', 'apiUser', 'apiPassword'],
    optionalCredentials: ['apiKey', 'vaultName'],
    category: 'pam',
  },
  {
    type: 'servicenow',
    label: 'ServiceNow',
    description: 'Import users, groups, and roles from ServiceNow ITSM/ITOM',
    icon: 'ticket',
    requiredCredentials: ['instanceUrl', 'username', 'password'],
    optionalCredentials: ['clientId', 'clientSecret'],
    category: 'itsm',
  },
  {
    type: 'csv',
    label: 'CSV Import',
    description: 'Import identities from a CSV file',
    icon: 'file-text',
    requiredCredentials: ['fileContent'],
    optionalCredentials: [],
    category: 'import',
  },
  {
    type: 'microsoft_defender',
    label: 'Microsoft Defender for Identity',
    description: 'Identity threat signals from Microsoft Defender for Identity via M365 Defender API',
    icon: 'shield-alert',
    requiredCredentials: ['tenantId', 'clientId', 'clientSecret'],
    optionalCredentials: [],
    category: 'itdr',
  },
  {
    type: 'sap_grc',
    label: 'SAP GRC / SAP IdM',
    description: 'Users, roles, and SoD violations from SAP GRC Access Control and SAP IdM',
    icon: 'database',
    requiredCredentials: ['baseUrl', 'username', 'password'],
    optionalCredentials: ['clientId', 'clientSecret', 'idmEndpoint'],
    category: 'iga',
  },
  {
    type: 'hashicorp_vault',
    label: 'HashiCorp Vault',
    description: 'Entities, groups, policies, and secret engines from HashiCorp Vault',
    icon: 'vault',
    requiredCredentials: ['vaultAddr'],
    optionalCredentials: ['vaultToken', 'roleId', 'secretId'],
    category: 'secrets',
  },
  {
    type: 'splunk',
    label: 'Splunk SIEM',
    description: 'Identity-related security events and alerts from Splunk Enterprise/Cloud',
    icon: 'activity',
    requiredCredentials: ['baseUrl'],
    optionalCredentials: ['username', 'password', 'bearerToken'],
    category: 'siem',
  },
  {
    type: 'beyondtrust',
    label: 'BeyondTrust PAM',
    description: 'Import privileged accounts, sessions, and access policies from BeyondTrust Password Safe',
    icon: 'shield',
    requiredCredentials: ['hostUrl', 'apiKey', 'runAsUser'],
    optionalCredentials: [],
    category: 'pam',
  },
  {
    type: 'digicert',
    label: 'DigiCert CertCentral',
    description: 'Track certificate lifecycle, expiry, and certificate-based identities',
    icon: 'file-key',
    requiredCredentials: ['apiKey'],
    optionalCredentials: [],
    category: 'certificate',
  },
]

/**
 * Look up connector metadata by type.
 */
export function getConnectorMeta(type: ConnectorType): ConnectorMeta | undefined {
  return CONNECTOR_REGISTRY.find(c => c.type === type)
}

export interface ConnectorMeta {
  type: ConnectorType
  label: string
  description: string
  icon: string
  requiredCredentials: string[]
  optionalCredentials: string[]
  category: 'directory' | 'sso' | 'iga' | 'pam' | 'itsm' | 'import' | 'itdr' | 'secrets' | 'siem' | 'certificate'
}
