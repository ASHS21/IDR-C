import { pgEnum } from 'drizzle-orm/pg-core'

// Identity enums
export const identityTypeEnum = pgEnum('identity_type', ['human', 'non_human'])
export const identitySubTypeEnum = pgEnum('identity_sub_type', [
  'employee', 'contractor', 'vendor', 'partner',
  'service_account', 'managed_identity', 'app_registration',
  'api_key', 'bot', 'machine', 'certificate',
])
export const identityStatusEnum = pgEnum('identity_status', [
  'active', 'inactive', 'disabled', 'dormant', 'orphaned', 'suspended',
])

// AD tiering
export const adTierEnum = pgEnum('ad_tier', ['tier_0', 'tier_1', 'tier_2', 'unclassified'])

// Source systems
export const sourceSystemEnum = pgEnum('source_system', [
  'active_directory', 'azure_ad', 'okta', 'sailpoint', 'cyberark', 'manual',
  'broadcom_sso', 'broadcom_pam', 'sailpoint_iiq',
])

// Account enums
export const platformEnum = pgEnum('platform_type', [
  'ad', 'azure_ad', 'okta', 'sailpoint', 'cyberark', 'aws_iam', 'gcp_iam',
  'broadcom_sso', 'broadcom_pam', 'sailpoint_iiq',
])
export const accountTypeEnum = pgEnum('account_type', [
  'standard', 'privileged', 'admin', 'service', 'shared', 'emergency',
])

// Group enums
export const groupTypeEnum = pgEnum('group_type', [
  'security', 'distribution', 'dynamic', 'role_based', 'privileged_access',
])
export const groupScopeEnum = pgEnum('group_scope', ['domain_local', 'global', 'universal'])
export const membershipTypeEnum = pgEnum('membership_type', ['direct', 'nested', 'dynamic'])

// Resource enums
export const resourceTypeEnum = pgEnum('resource_type', [
  'server', 'application', 'database', 'file_share', 'cloud_resource',
  'domain_controller', 'workstation', 'network_device', 'saas_app',
])
export const resourceCriticalityEnum = pgEnum('resource_criticality', [
  'critical', 'high', 'medium', 'low',
])
export const environmentEnum = pgEnum('environment_type', [
  'production', 'staging', 'development', 'dr',
])

// Entitlement enums
export const permissionTypeEnum = pgEnum('permission_type', [
  'role', 'group_membership', 'direct_assignment', 'inherited', 'delegated',
])
export const certificationStatusEnum = pgEnum('certification_status', [
  'pending', 'certified', 'revoked', 'expired',
])

// Policy enums
export const policyTypeEnum = pgEnum('policy_type', [
  'access_policy', 'tiering_rule', 'sod_rule', 'password_policy',
  'mfa_policy', 'lifecycle_policy', 'certification_policy',
])
export const severityEnum = pgEnum('severity_level', ['critical', 'high', 'medium', 'low'])

// Violation enums
export const violationTypeEnum = pgEnum('violation_type', [
  'tier_breach', 'sod_conflict', 'excessive_privilege', 'dormant_access',
  'orphaned_identity', 'missing_mfa', 'expired_certification', 'password_age',
])
export const violationStatusEnum = pgEnum('violation_status', [
  'open', 'acknowledged', 'remediated', 'excepted', 'false_positive',
])

// Integration enums
export const integrationTypeEnum = pgEnum('integration_type', [
  'active_directory', 'azure_ad', 'okta', 'sailpoint', 'cyberark',
  'azure_logs', 'sso_provider', 'broadcom_sso', 'broadcom_pam', 'sailpoint_iiq',
])
export const syncStatusEnum = pgEnum('sync_status', [
  'connected', 'syncing', 'error', 'disconnected',
])

// Action log enums
export const actionTypeEnum = pgEnum('action_type', [
  'assess_identity', 'certify_entitlement', 'revoke_access', 'approve_exception',
  'escalate_risk', 'trigger_review', 'update_tier', 'sync_source',
  'generate_recommendation', 'acknowledge_violation',
])
export const actionSourceEnum = pgEnum('action_source', ['manual', 'automated', 'ai_recommended'])

// Remediation plan enums
export const planStatusEnum = pgEnum('plan_status', [
  'draft', 'approved', 'in_progress', 'completed', 'rejected',
])
export const planGeneratedByEnum = pgEnum('plan_generated_by', ['ai', 'manual'])

// Notification enums
export const notificationTypeEnum = pgEnum('notification_type', [
  'violation_detected', 'certification_due', 'sync_failed',
  'exception_expiring', 'ai_analysis_complete', 'system',
])
export const notificationSeverityEnum = pgEnum('notification_severity', [
  'critical', 'high', 'medium', 'low', 'info',
])

// RBAC
export const appRoleEnum = pgEnum('app_role', ['viewer', 'analyst', 'iam_admin', 'ciso', 'admin'])

// Threat detection enums (Phase N1)
export const threatTypeEnum = pgEnum('threat_type', [
  'credential_stuffing', 'password_spray', 'kerberoasting', 'asrep_roasting',
  'dcsync', 'golden_ticket', 'lateral_movement', 'privilege_escalation',
  'token_replay', 'oauth_consent_abuse', 'impossible_travel', 'brute_force',
  'mfa_fatigue', 'service_account_abuse', 'insider_threat',
])

export const killChainPhaseEnum = pgEnum('kill_chain_phase', [
  'reconnaissance', 'initial_access', 'credential_access', 'privilege_escalation',
  'lateral_movement', 'persistence', 'exfiltration', 'impact',
])

export const threatStatusEnum = pgEnum('threat_status', [
  'active', 'investigating', 'contained', 'resolved', 'false_positive',
])

export const canaryTypeEnum = pgEnum('canary_type', [
  'fake_admin', 'fake_service', 'fake_gmsa', 'fake_vpn', 'fake_api_key',
])
