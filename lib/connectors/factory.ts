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
    type: 'csv',
    label: 'CSV Import',
    description: 'Import identities from a CSV file',
    icon: 'file-text',
    requiredCredentials: ['fileContent'],
    optionalCredentials: [],
    category: 'import',
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
  category: 'directory' | 'sso' | 'iga' | 'pam' | 'import'
}
