'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Code2,
  Plug,
  Shield,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { CONNECTOR_REGISTRY } from '@/lib/connectors/registry'
import type { ConnectorMeta } from '@/lib/connectors/registry'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TabId = 'guide' | 'api' | 'connectors' | 'compliance'

interface GuideSection {
  title: string
  path: string
  description: string
  features: string[]
  actions: string[]
}

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  role: string
  note: string
}

interface ApiGroup {
  title: string
  endpoints: ApiEndpoint[]
}

interface ComplianceRow {
  controlId: string
  controlName: string
  feature: string
  link: string
}

interface ComplianceFramework {
  name: string
  rows: ComplianceRow[]
}

/* ------------------------------------------------------------------ */
/*  Data: User Guide sections                                          */
/* ------------------------------------------------------------------ */

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: 'Overview Dashboard',
    path: '/dashboard',
    description:
      'The central command center displaying composite risk metrics, trend charts, and a real-time summary of your identity posture. Use this page for an at-a-glance understanding of organizational risk.',
    features: [
      'Composite risk score with 30/60/90-day trend charts',
      'Tier compliance gauge showing percentage of identities without tier violations',
      'Top 5 riskiest identities ranked by risk score',
      'Pending actions counter for certifications, violations, and reviews',
      'Integration health strip with green/yellow/red status per source',
      'Human vs non-human identity split metrics',
    ],
    actions: [
      'Click any metric card to drill into the relevant dashboard',
      'Toggle trend chart timeframes between 30, 60, and 90 days',
      'Click a risky identity card to view its 360-degree detail page',
    ],
  },
  {
    title: 'Identity Explorer',
    path: '/dashboard/identities',
    description:
      'A filterable, sortable table of every identity in your organization, including both human users and non-human identities such as service accounts and managed identities.',
    features: [
      'Columns: Name, Type, Sub-type, AD Tier, Effective Tier, Tier Violation badge, Risk Score, Status, Source, Last Logon, Entitlement Count, Violation Count',
      'Filters by type, sub-type, tier, risk score range, status, source system, violation presence, and dormancy',
      'Full-text search across display name, UPN, and SAM account name',
      'CSV export of the current filtered result set',
      'Pagination with configurable page sizes',
    ],
    actions: [
      'Select multiple identities for bulk actions: trigger review, update tier, disable',
      'Click any row to navigate to the Identity Detail page',
      'Export filtered results to CSV for offline analysis',
    ],
  },
  {
    title: 'Identity Detail',
    path: '/dashboard/identities',
    description:
      'The 360-degree view of a single identity. Tabs expose every dimension: overview attributes, linked accounts, entitlements with tier classification, group memberships, policy violations, activity timeline, and AI-generated insights.',
    features: [
      'Header card with name, UPN, type badge, tier badge, risk score gauge, and status',
      'Overview tab: key attributes, manager, owner (for NHI), department, last logon',
      'Accounts tab: all linked accounts across platforms with MFA status',
      'Entitlements tab: permissions with tier classification, certification status, last-used date',
      'Groups tab: direct and nested memberships with group tier classification',
      'Violations tab: all policy violations for this identity with severity and status',
      'Timeline tab: action log entries scoped to this identity',
      'AI Insights tab: AI-generated risk narrative and recommendations',
    ],
    actions: [
      'Certify All entitlements for this identity',
      'Trigger an access review for this identity',
      'Update the AD tier classification',
      'Disable the identity across source systems',
      'Request a policy exception for an open violation',
    ],
  },
  {
    title: 'AD Tiering',
    path: '/dashboard/tiering',
    description:
      'Visualize and enforce Active Directory tiering compliance. The tier pyramid shows identity counts per tier, while the violation heatmap reveals cross-tier access patterns that represent your highest-risk exposures.',
    features: [
      'Tier pyramid visualization: Tier 0 (top), Tier 1 (middle), Tier 2 (bottom) with identity counts',
      'Tier violation heatmap: matrix of source tier vs accessed tier with violation counts',
      'Cross-tier access paths sorted by severity',
      'Tier 0 inventory: every Tier 0 identity and resource (crown jewels view)',
      'Unclassified identities awaiting tier assignment',
    ],
    actions: [
      'Reclassify an identity to a different tier',
      'Drill into any heatmap cell to see the violating identities',
      'Export the Tier 0 inventory for audit evidence',
      'Bulk-assign tiers to unclassified identities',
    ],
  },
  {
    title: 'Entitlements',
    path: '/dashboard/entitlements',
    description:
      'The entitlement radar identifies over-provisioned identities, toxic permission combinations, and unused access rights that are candidates for revocation.',
    features: [
      'Over-provisioned identities: those with entitlement counts exceeding 2x the organizational median',
      'Toxic combinations: entitlement pairs or sets that violate separation-of-duties policies',
      'Unused entitlements: permissions not exercised in over 90 days',
      'Entitlement distribution chart by permission type',
      'Certification status breakdown: certified, pending, expired, revoked',
    ],
    actions: [
      'Revoke unused entitlements directly from the table',
      'Trigger a certification campaign for a specific set of entitlements',
      'Flag a toxic combination for CISO review',
    ],
  },
  {
    title: 'Shadow Admins',
    path: '/dashboard/shadow-admins',
    description:
      'Detect identities that possess admin-equivalent privileges without being members of recognized admin groups. These shadow administrators represent a significant blind spot in traditional IAM monitoring.',
    features: [
      'Shadow admin detection via ACL and delegation analysis',
      'Evidence panel showing the specific ACL entries or delegated permissions granting admin-equivalent access',
      'Comparison against recognized admin groups (Domain Admins, Enterprise Admins, etc.)',
      'Risk scoring adjusted for shadow admin status',
      'Historical tracking of shadow admin count over time',
    ],
    actions: [
      'Promote a shadow admin to a recognized admin group for proper governance',
      'Revoke the delegated permissions creating shadow admin status',
      'Add an exception with documented justification',
      'Trigger a scan to refresh shadow admin detection',
    ],
  },
  {
    title: 'Attack Paths',
    path: '/dashboard/attack-paths',
    description:
      'Visualize escalation paths that an attacker could exploit to move from low-tier identities to Tier 0 assets. Each path is annotated with AI-generated narration and mapped to MITRE ATT&CK techniques.',
    features: [
      'Graph visualization of escalation paths from Tier 2 through Tier 1 to Tier 0',
      'AI-generated narration explaining each step in the attack chain',
      'MITRE ATT&CK technique mapping for each escalation step',
      'Path severity scoring based on the number of hops and privilege levels involved',
      'Filtering by source identity, target asset, or technique',
    ],
    actions: [
      'Compute new attack paths on demand',
      'Break a path by revoking a specific entitlement or disabling a hop',
      'Export attack path diagrams for executive reporting',
      'Mark a path as mitigated after remediation',
    ],
  },
  {
    title: 'Blast Radius',
    path: '/dashboard/blast-radius',
    description:
      'Simulate the impact of a compromised identity. Given a starting identity, the blast radius engine computes every resource, group, and downstream identity that could be reached, showing the full scope of potential damage.',
    features: [
      'Interactive compromise simulation starting from any identity',
      'Visualization of reachable resources, groups, and downstream identities',
      'Impact metrics: number of affected resources, highest tier reached, sensitive data exposure',
      'Comparison mode to evaluate blast radius before and after a remediation action',
      'Time-bounded simulation accounting for credential rotation schedules',
    ],
    actions: [
      'Select any identity to simulate its compromise',
      'Compare blast radius before and after removing a specific entitlement',
      'Export the blast radius report for incident response planning',
    ],
  },
  {
    title: 'Peer Analysis',
    path: '/dashboard/peer-analysis',
    description:
      'Statistical anomaly detection that compares each identity\'s entitlements against their department peers. Outliers with significantly more or different permissions are flagged for review.',
    features: [
      'Department-level peer grouping with median and standard deviation calculations',
      'Outlier detection for identities with entitlements exceeding peer norms',
      'Visual comparison of an identity\'s permissions vs the peer baseline',
      'Trend tracking for peer group drift over time',
      'Automated recommendations for entitlement alignment',
    ],
    actions: [
      'Review flagged outliers and approve or remediate',
      'Adjust peer group definitions for custom organizational structures',
      'Export peer analysis reports for access review campaigns',
    ],
  },
  {
    title: 'GPO Tracking',
    path: '/dashboard/gpo',
    description:
      'Monitor Group Policy Objects linked to sensitive organizational units. Track modifications, detect policy drift, and ensure GPOs enforcing security controls remain intact.',
    features: [
      'Inventory of all GPOs linked to sensitive OUs (Tier 0, Tier 1)',
      'Modification history with who-changed-what tracking',
      'Policy drift detection: alerts when GPO settings deviate from baseline',
      'Link status monitoring: detect unlinked or orphaned GPOs',
      'Security setting analysis for password policies, audit policies, and user rights assignments',
    ],
    actions: [
      'Compare a GPO against its known-good baseline',
      'Acknowledge a GPO modification as authorized',
      'Export GPO configuration for compliance documentation',
      'Flag a GPO change for security team review',
    ],
  },
  {
    title: 'Live Threats',
    path: '/dashboard/threats',
    description:
      'Real-time identity threat detection with kill chain phase classification and severity scoring. Threats are correlated from multiple sources including sign-in anomalies, impossible travel, and credential attacks.',
    features: [
      'Real-time threat feed with severity classification (critical, high, medium, low)',
      'Kill chain phase mapping: reconnaissance, initial access, privilege escalation, lateral movement, exfiltration',
      'Threat correlation across multiple signal sources',
      'Affected identity linkage with one-click drill-through',
      'Threat volume trends and pattern analysis',
    ],
    actions: [
      'Triage a threat: confirm, dismiss, or escalate',
      'Disable the affected identity as an immediate containment measure',
      'Create an incident from a threat for formal response tracking',
      'Export threat details for SIEM correlation',
    ],
  },
  {
    title: 'Canary Identities',
    path: '/dashboard/canaries',
    description:
      'Honeypot accounts strategically placed to trigger alerts on any authentication attempt. Canary identities are decoy accounts that should never be used legitimately; any activity is an immediate indicator of compromise.',
    features: [
      'Canary identity inventory with placement status',
      'Real-time alerting on any authentication attempt against a canary',
      'Source IP and geolocation tracking for canary triggers',
      'Integration with the threat detection pipeline for automatic escalation',
      'Canary effectiveness metrics and coverage analysis',
    ],
    actions: [
      'Deploy a new canary identity in a specific tier or OU',
      'Investigate a canary trigger event',
      'Rotate canary credentials on a schedule',
      'Decommission a canary identity',
    ],
  },
  {
    title: 'Violations',
    path: '/dashboard/violations',
    description:
      'The policy violations dashboard provides a real-time feed of all detected violations including tier breaches, SoD conflicts, excessive privileges, dormant access, orphaned identities, missing MFA, and expired certifications.',
    features: [
      'Violation feed filterable by type, severity, and status',
      'Severity breakdown: critical, high, medium, low with trend indicators',
      'Violation type distribution: bar chart of tier breach vs SoD vs excessive privilege vs dormant vs orphaned',
      'Exception tracker: approved exceptions with expiry countdown',
      'Remediation rate: percentage of violations resolved within SLA',
    ],
    actions: [
      'Acknowledge a violation to begin remediation tracking',
      'Approve an exception with documented rationale and expiry date',
      'Remediate a violation by revoking the offending access',
      'Bulk-acknowledge violations by type or severity',
    ],
  },
  {
    title: 'Certifications',
    path: '/dashboard/certifications',
    description:
      'Manage access certification campaigns where managers review and certify or revoke the entitlements of their direct reports. Campaigns can be organization-wide or scoped to specific departments, tiers, or risk levels.',
    features: [
      'Campaign creation with scope filters: department, tier, risk level, entitlement type',
      'Manager-level certification workqueue with certify/revoke actions per entitlement',
      'Campaign progress tracking: percentage complete, overdue items, escalations',
      'Historical campaign results with pass/fail rates',
      'Automated reminders and escalation for overdue certifications',
    ],
    actions: [
      'Create a new certification campaign with custom scope',
      'Certify or revoke individual entitlements',
      'Bulk-certify all low-risk entitlements for a manager',
      'Escalate overdue certifications to the next level',
    ],
  },
  {
    title: 'NHI Management',
    path: '/dashboard/nhi',
    description:
      'Non-human identity inventory covering service accounts, managed identities, app registrations, API keys, bot accounts, machine identities, and certificate-based identities.',
    features: [
      'Complete NHI inventory with type, owner, status, and expiry tracking',
      'Ownership status breakdown: owned, orphaned, owner-disabled',
      'Expiry tracker: NHIs approaching expiry, expired but still active',
      'Privilege analysis: NHIs with admin or privileged access',
      'Password and secret age tracking against policy thresholds',
    ],
    actions: [
      'Assign or reassign ownership of an NHI',
      'Disable an orphaned or expired NHI',
      'Trigger a secret rotation for an NHI',
      'Export NHI inventory for audit compliance',
    ],
  },
  {
    title: 'Supply Chain',
    path: '/dashboard/supply-chain',
    description:
      'Map identity dependencies across the organization to identify key person risk and single points of failure. Simulate the impact of a departure to understand which identities, systems, and processes would be affected.',
    features: [
      'Identity dependency graph showing ownership and delegation chains',
      'Key person risk scoring based on the number and criticality of dependencies',
      'Departure simulation: model the impact of losing a specific identity',
      'Single point of failure detection for critical systems and processes',
      'Succession planning recommendations based on dependency analysis',
    ],
    actions: [
      'Run a departure simulation for any identity',
      'Identify and address single points of failure',
      'Generate a succession planning report',
      'Export dependency maps for risk management documentation',
    ],
  },
  {
    title: 'AI Analysis',
    path: '/dashboard/ai',
    description:
      'Generate AI-powered remediation plans that prioritize actions by risk reduction impact. Configure analysis parameters including budget, timeline, and risk appetite to receive tailored recommendations.',
    features: [
      'Configurable analysis parameters: budget (SAR), timeline (days), risk appetite slider',
      'Ranked remediation actions with natural language justifications',
      'Projected risk impact: before/after posture visualization',
      'Quick wins section highlighting low-effort, high-impact actions',
      'Historical plans with outcome tracking and effectiveness measurement',
    ],
    actions: [
      'Generate a new AI analysis with custom parameters',
      'Approve a remediation plan to create kinetic actions',
      'Reject a plan with documented rationale',
      'Compare multiple historical plans to track improvement',
    ],
  },
  {
    title: 'AI Chat',
    path: '/dashboard/ai-chat',
    description:
      'Natural language interface for querying the identity ontology. Ask questions about your identity posture, specific identities, violations, or risk patterns and receive AI-generated answers grounded in your data.',
    features: [
      'Natural language queries against the full identity ontology',
      'Context-aware responses grounded in real organizational data',
      'Conversation history for multi-turn analysis sessions',
      'Suggested follow-up questions based on the current context',
      'Citation of specific identities, violations, or entitlements in responses',
    ],
    actions: [
      'Ask questions like "Which Tier 0 identities have no MFA?"',
      'Request summaries such as "What are the top risks in the Finance department?"',
      'Drill into specifics: "Show me all service accounts owned by disabled users"',
      'Generate reports via chat: "Create a summary of all tier violations this month"',
    ],
  },
  {
    title: 'Graph Explorer',
    path: '/dashboard/graph',
    description:
      'Visual identity relationship graph with query capabilities. Explore connections between identities, groups, resources, and entitlements through an interactive force-directed graph layout.',
    features: [
      'Force-directed graph visualization of identity relationships',
      'Cypher-like query language for advanced graph traversal',
      'Node filtering by type: identity, group, resource, entitlement',
      'Edge highlighting for specific relationship types: membership, ownership, access',
      'Cluster detection for identifying tightly coupled identity groups',
    ],
    actions: [
      'Query relationships using the graph query bar',
      'Click any node to see its properties and connections',
      'Expand or collapse node neighborhoods',
      'Export graph visualizations for documentation',
    ],
  },
  {
    title: 'Data Quality',
    path: '/dashboard/data-quality',
    description:
      'Monitor and improve the completeness and accuracy of identity data. Identify duplicates, missing attributes, and data inconsistencies, with AI-powered enrichment suggestions.',
    features: [
      'Data completeness scores per attribute and per source system',
      'Duplicate identity detection with merge recommendations',
      'Missing attribute tracking: email, department, manager, owner',
      'AI-powered enrichment suggestions based on patterns in existing data',
      'Data quality trend tracking over time',
    ],
    actions: [
      'Resolve duplicate identities by merging or dismissing',
      'Classify unclassified identities with AI assistance',
      'Enrich identity records with AI-suggested attribute values',
      'Export data quality reports for governance review',
    ],
  },
  {
    title: 'Integrations',
    path: '/dashboard/integrations',
    description:
      'Monitor connector health, sync status, and record counts for all configured integration sources. Trigger manual syncs and diagnose connectivity issues from a single pane.',
    features: [
      'Connector health dashboard with green/yellow/red status indicators',
      'Last sync timestamp and record count per source',
      'Sync frequency configuration and schedule management',
      'Error log viewer for failed sync operations',
      'Connector setup wizard for adding new integrations',
    ],
    actions: [
      'Trigger a manual sync for any connected source',
      'Configure sync frequency and schedule',
      'Add a new integration source via the setup wizard',
      'Diagnose and resolve sync errors',
    ],
  },
  {
    title: 'Audit Trail',
    path: '/dashboard/audit',
    description:
      'Complete action log recording every kinetic action in the platform. Every certification, revocation, exception approval, tier change, and AI recommendation is captured with full actor, target, timestamp, and rationale details.',
    features: [
      'Full action log timeline with actor, target, timestamp, and rationale',
      'Filters by action type, actor, target identity, date range, and source (manual/automated/AI)',
      'Decision capture view focusing on approve/reject/exception actions with rationale text',
      'Tamper-evident log with hash chain integrity verification',
      'PDF export for NCA/SAMA compliance audit evidence',
    ],
    actions: [
      'Filter the audit log to a specific identity or action type',
      'Export a date-range scoped PDF report for regulatory audits',
      'Drill into any action entry to see the full payload and context',
      'Verify log integrity via the hash chain check',
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Data: API Reference groups                                         */
/* ------------------------------------------------------------------ */

const API_GROUPS: ApiGroup[] = [
  {
    title: 'Identities',
    endpoints: [
      { method: 'GET', path: '/api/identities', description: 'List identities with filtering, sorting, and pagination', role: 'viewer', note: 'Query params: type, sub_type, ad_tier, status, source_system, risk_min, risk_max, dormant, page, limit, sort, order' },
      { method: 'GET', path: '/api/identities/[id]', description: 'Get a single identity with all related data', role: 'viewer', note: 'Includes accounts, entitlement count, violation count, and computed fields' },
      { method: 'POST', path: '/api/identities', description: 'Create a new identity record', role: 'iam_admin', note: 'Body: display_name, type, sub_type, ad_tier, source_system, upn, email, department' },
    ],
  },
  {
    title: 'Entitlements',
    endpoints: [
      { method: 'GET', path: '/api/entitlements', description: 'List entitlements with filtering', role: 'viewer', note: 'Query params: identity_id, resource_id, permission_type, ad_tier_of_permission, certification_status, unused_days' },
      { method: 'GET', path: '/api/entitlements/[id]', description: 'Get a single entitlement with full details', role: 'viewer', note: 'Includes identity, resource, certification history, and risk tags' },
    ],
  },
  {
    title: 'Violations',
    endpoints: [
      { method: 'GET', path: '/api/violations', description: 'List policy violations with filtering', role: 'viewer', note: 'Query params: violation_type, severity, status, identity_id, policy_id, detected_after, detected_before' },
      { method: 'GET', path: '/api/violations/[id]', description: 'Get a single violation with full context', role: 'viewer', note: 'Includes related policy, identity, entitlement, and exception details' },
    ],
  },
  {
    title: 'Actions',
    endpoints: [
      { method: 'POST', path: '/api/actions/certify', description: 'Certify one or more entitlements', role: 'iam_admin', note: 'Body: entitlement_ids (array), rationale (optional)' },
      { method: 'POST', path: '/api/actions/revoke', description: 'Revoke an entitlement from an identity', role: 'iam_admin', note: 'Body: entitlement_id, rationale, schedule (immediate or scheduled date)' },
      { method: 'POST', path: '/api/actions/approve-exception', description: 'Approve a policy violation exception', role: 'ciso', note: 'Body: violation_id, reason, expires_at' },
      { method: 'POST', path: '/api/actions/escalate', description: 'Escalate a high-risk identity for review', role: 'analyst', note: 'Body: identity_id, severity, rationale' },
      { method: 'POST', path: '/api/actions/trigger-review', description: 'Initiate an access review campaign', role: 'iam_admin', note: 'Body: scope (department, tier, identity_ids), reviewer_identity_id, due_date' },
      { method: 'POST', path: '/api/actions/update-tier', description: 'Reclassify an identity AD tier', role: 'iam_admin', note: 'Body: identity_id, new_tier, rationale' },
      { method: 'POST', path: '/api/actions/acknowledge', description: 'Acknowledge a policy violation', role: 'analyst', note: 'Body: violation_id, rationale' },
    ],
  },
  {
    title: 'AI',
    endpoints: [
      { method: 'POST', path: '/api/ai/analyze', description: 'Trigger an AI-powered risk analysis and remediation plan', role: 'analyst', note: 'Body: budget_sar (number), timeline_days (number), risk_appetite (low/medium/high)' },
      { method: 'GET', path: '/api/ai/plans', description: 'List all remediation plans', role: 'viewer', note: 'Query params: status, generated_by, page, limit' },
      { method: 'GET', path: '/api/ai/plans/[id]', description: 'Get a specific remediation plan with full details', role: 'viewer', note: 'Includes ranked actions, executive summary, projected risk reduction, quick wins' },
    ],
  },
  {
    title: 'Sync',
    endpoints: [
      { method: 'POST', path: '/api/sync/[source]', description: 'Trigger a manual sync from an integration source', role: 'iam_admin', note: 'Path param source: active_directory, azure_ad, okta, sailpoint_iiq, etc. Returns sync job ID' },
    ],
  },
  {
    title: 'Audit',
    endpoints: [
      { method: 'GET', path: '/api/audit', description: 'Query the action log with filtering', role: 'viewer', note: 'Query params: action_type, actor_identity_id, target_identity_id, date_from, date_to, source, page, limit' },
    ],
  },
  {
    title: 'Health',
    endpoints: [
      { method: 'GET', path: '/api/health', description: 'Public health check endpoint', role: 'public', note: 'Returns server status, database connectivity, and uptime. No authentication required.' },
    ],
  },
  {
    title: 'Data Quality',
    endpoints: [
      { method: 'GET', path: '/api/data-quality/stats', description: 'Get data quality statistics and completeness scores', role: 'viewer', note: 'Returns per-attribute completeness, duplicate count, and overall quality score' },
      { method: 'POST', path: '/api/data-quality/resolve', description: 'Resolve a duplicate or data quality issue', role: 'iam_admin', note: 'Body: issue_id, resolution (merge/dismiss), merge_target_id (if merge)' },
      { method: 'POST', path: '/api/data-quality/classify', description: 'Classify unclassified identities', role: 'iam_admin', note: 'Body: identity_ids (array), classification (type, sub_type, ad_tier)' },
      { method: 'POST', path: '/api/data-quality/enrich', description: 'Apply AI-suggested enrichments to identity records', role: 'iam_admin', note: 'Body: identity_id, enrichments (object of attribute-value pairs)' },
    ],
  },
  {
    title: 'Shadow Admins',
    endpoints: [
      { method: 'GET', path: '/api/shadow-admins', description: 'List detected shadow admin identities', role: 'viewer', note: 'Query params: severity, status, page, limit' },
      { method: 'POST', path: '/api/shadow-admins/scan', description: 'Trigger a shadow admin detection scan', role: 'iam_admin', note: 'Scans ACLs and delegations to detect admin-equivalent access outside admin groups' },
    ],
  },
  {
    title: 'Attack Paths',
    endpoints: [
      { method: 'GET', path: '/api/attack-paths', description: 'List computed attack paths', role: 'viewer', note: 'Query params: severity, source_tier, target_tier, page, limit' },
      { method: 'POST', path: '/api/attack-paths/compute', description: 'Compute new attack paths from the current identity graph', role: 'analyst', note: 'Body: max_depth (number), target_tier (tier_0/tier_1), include_mitre (boolean)' },
      { method: 'GET', path: '/api/attack-paths/[id]', description: 'Get a specific attack path with full step details', role: 'viewer', note: 'Includes each hop, technique mapping, and AI narration' },
    ],
  },
  {
    title: 'Threats',
    endpoints: [
      { method: 'GET', path: '/api/threats', description: 'List active identity threats', role: 'viewer', note: 'Query params: severity, kill_chain_phase, status, identity_id, page, limit' },
      { method: 'POST', path: '/api/threats/[id]/triage', description: 'Triage a threat: confirm, dismiss, or escalate', role: 'analyst', note: 'Body: action (confirm/dismiss/escalate), rationale' },
    ],
  },
  {
    title: 'Peer Analysis',
    endpoints: [
      { method: 'GET', path: '/api/peer-anomalies', description: 'List entitlement anomalies relative to department peers', role: 'viewer', note: 'Query params: department, severity, identity_id, page, limit' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Data: Compliance frameworks                                        */
/* ------------------------------------------------------------------ */

const COMPLIANCE_FRAMEWORKS: ComplianceFramework[] = [
  {
    name: 'NCA ECC (Essential Cybersecurity Controls)',
    rows: [
      { controlId: 'ECC-1-1-1', controlName: 'IAM Policy', feature: 'Policy Management', link: '/dashboard/settings' },
      { controlId: 'ECC-1-2-1', controlName: 'Access Control', feature: 'Entitlement Management', link: '/dashboard/entitlements' },
      { controlId: 'ECC-1-3-1', controlName: 'Identity Lifecycle', feature: 'Identity Explorer', link: '/dashboard/identities' },
      { controlId: 'ECC-1-3-2', controlName: 'Privileged Access', feature: 'AD Tiering + Shadow Admins', link: '/dashboard/tiering' },
      { controlId: 'ECC-1-4-1', controlName: 'Access Review', feature: 'Certification Campaigns', link: '/dashboard/certifications' },
      { controlId: 'ECC-2-1-1', controlName: 'Security Monitoring', feature: 'Live Threats + Violations', link: '/dashboard/threats' },
      { controlId: 'ECC-2-2-1', controlName: 'Incident Response', feature: 'Threat Triage + Actions', link: '/dashboard/threats' },
      { controlId: 'ECC-2-3-1', controlName: 'Audit Logging', feature: 'Audit Trail', link: '/dashboard/audit' },
      { controlId: 'ECC-3-1-1', controlName: 'Risk Assessment', feature: 'AI Analysis + Risk Scoring', link: '/dashboard/ai' },
      { controlId: 'ECC-3-2-1', controlName: 'Compliance Reporting', feature: 'Results Hub', link: '/dashboard/results' },
    ],
  },
  {
    name: 'SAMA CSF (Cyber Security Framework)',
    rows: [
      { controlId: 'SAMA-3.3.1', controlName: 'Identity Management', feature: 'Identity Explorer', link: '/dashboard/identities' },
      { controlId: 'SAMA-3.3.2', controlName: 'Authentication', feature: 'MFA Status + Accounts', link: '/dashboard/identities' },
      { controlId: 'SAMA-3.3.3', controlName: 'Authorization', feature: 'Entitlements + Tiering', link: '/dashboard/entitlements' },
      { controlId: 'SAMA-3.3.4', controlName: 'Access Review', feature: 'Certifications', link: '/dashboard/certifications' },
      { controlId: 'SAMA-3.3.5', controlName: 'Privileged Access', feature: 'Tiering + Shadow Admins', link: '/dashboard/tiering' },
      { controlId: 'SAMA-3.3.7', controlName: 'Service Accounts', feature: 'NHI Management', link: '/dashboard/nhi' },
      { controlId: 'SAMA-3.4.1', controlName: 'Security Monitoring', feature: 'Live Threats', link: '/dashboard/threats' },
      { controlId: 'SAMA-3.6.1', controlName: 'Audit Trail', feature: 'Audit Trail', link: '/dashboard/audit' },
    ],
  },
  {
    name: 'PDPL (Personal Data Protection Law)',
    rows: [
      { controlId: 'PDPL-5', controlName: 'Data Processing Records', feature: 'Audit Trail', link: '/dashboard/audit' },
      { controlId: 'PDPL-14', controlName: 'Access Rights', feature: 'Entitlement Management', link: '/dashboard/entitlements' },
      { controlId: 'PDPL-17', controlName: 'Security Measures', feature: 'Risk Scoring + Violations', link: '/dashboard/violations' },
      { controlId: 'PDPL-22', controlName: 'Data Breach Response', feature: 'Threat Detection', link: '/dashboard/threats' },
      { controlId: 'PDPL-24', controlName: 'Impact Assessment', feature: 'AI Analysis + Blast Radius', link: '/dashboard/ai' },
      { controlId: 'PDPL-29', controlName: 'Compliance Documentation', feature: 'Results Hub + Audit', link: '/dashboard/results' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Connector category labels                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<ConnectorMeta['category'], string> = {
  directory: 'Directory',
  sso: 'SSO',
  iga: 'IGA',
  pam: 'PAM',
  itsm: 'ITSM',
  itdr: 'ITDR',
  secrets: 'Secrets',
  siem: 'SIEM',
  certificate: 'Certificate',
  import: 'Import',
}

const CATEGORY_ORDER: ConnectorMeta['category'][] = [
  'directory',
  'sso',
  'iga',
  'pam',
  'itsm',
  'itdr',
  'secrets',
  'siem',
  'certificate',
  'import',
]

/* ------------------------------------------------------------------ */
/*  Helper: method badge color                                         */
/* ------------------------------------------------------------------ */

function methodColor(method: string): string {
  switch (method) {
    case 'GET':
      return 'var(--color-success)'
    case 'POST':
      return 'var(--color-info)'
    case 'PUT':
      return 'var(--color-warning)'
    case 'DELETE':
      return 'var(--color-critical)'
    default:
      return 'var(--text-secondary)'
  }
}

/* ------------------------------------------------------------------ */
/*  Accordion component                                                */
/* ------------------------------------------------------------------ */

function Accordion({
  title,
  children,
  defaultOpen = false,
  forceOpen,
}: {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  forceOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const isOpen = forceOpen !== undefined ? forceOpen : open

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-secondary)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium transition-colors"
        style={{ color: 'var(--text-primary)' }}
      >
        <span className="flex items-center gap-2">{title}</span>
        <span
          className="transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-200"
        style={{
          maxHeight: isOpen ? '5000px' : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: User Guide                                                    */
/* ------------------------------------------------------------------ */

function GuideTab({ search }: { search: string }) {
  const lowerSearch = search.toLowerCase()
  const filtered = GUIDE_SECTIONS.filter(
    (s) =>
      !search ||
      s.title.toLowerCase().includes(lowerSearch) ||
      s.description.toLowerCase().includes(lowerSearch)
  )

  if (filtered.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        No guide sections match your search.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((section) => (
        <Accordion
          key={section.path}
          forceOpen={search.length > 0 ? true : undefined}
          title={
            <span className="flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {section.title}
              </span>
              <Link
                href={section.path}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono"
                style={{
                  color: 'var(--color-accent)',
                  backgroundColor: 'var(--bg-tertiary)',
                }}
              >
                {section.path}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </span>
          }
        >
          <p className="mb-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {section.description}
          </p>

          <div className="mb-3">
            <h4
              className="mb-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Key Features
            </h4>
            <ul className="flex flex-col gap-1">
              {section.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--color-accent)' }} className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4
              className="mb-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Available Actions
            </h4>
            <ul className="flex flex-col gap-1">
              {section.actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--color-success)' }} className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </Accordion>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: API Reference                                                 */
/* ------------------------------------------------------------------ */

function ApiTab({ search }: { search: string }) {
  const lowerSearch = search.toLowerCase()
  const filtered = API_GROUPS.filter(
    (g) =>
      !search ||
      g.title.toLowerCase().includes(lowerSearch) ||
      g.endpoints.some(
        (e) =>
          e.path.toLowerCase().includes(lowerSearch) ||
          e.description.toLowerCase().includes(lowerSearch)
      )
  )

  if (filtered.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        No API endpoints match your search.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((group) => {
        const matchingEndpoints = search
          ? group.endpoints.filter(
              (e) =>
                e.path.toLowerCase().includes(lowerSearch) ||
                e.description.toLowerCase().includes(lowerSearch) ||
                group.title.toLowerCase().includes(lowerSearch)
            )
          : group.endpoints

        return (
          <Accordion
            key={group.title}
            forceOpen={search.length > 0 ? true : undefined}
            title={
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {group.title}
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                  ({matchingEndpoints.length} endpoint{matchingEndpoints.length !== 1 ? 's' : ''})
                </span>
              </span>
            }
          >
            <div className="flex flex-col gap-3">
              {matchingEndpoints.map((ep, i) => (
                <div
                  key={i}
                  className="rounded-md border p-3"
                  style={{
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--bg-primary)',
                  }}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs font-bold font-mono"
                      style={{
                        color: methodColor(ep.method),
                        backgroundColor: 'var(--bg-tertiary)',
                      }}
                    >
                      {ep.method}
                    </span>
                    <code className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                      {ep.path}
                    </code>
                    <span
                      className="ml-auto rounded px-2 py-0.5 text-xs"
                      style={{
                        color: 'var(--text-tertiary)',
                        backgroundColor: 'var(--bg-tertiary)',
                      }}
                    >
                      {ep.role}
                    </span>
                  </div>
                  <p className="mb-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {ep.description}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {ep.note}
                  </p>
                </div>
              ))}
            </div>
          </Accordion>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Connectors                                                    */
/* ------------------------------------------------------------------ */

/* Enriched connector documentation — prerequisites, setup steps, data pulled, sync, troubleshooting */

interface ConnectorGuide {
  type: string
  prerequisites: string[]
  setupSteps: string[]
  dataPulled: string[]
  syncFrequency: string
  troubleshooting: string[]
  notes?: string
}

const CONNECTOR_GUIDES: Record<string, ConnectorGuide> = {
  active_directory: {
    prerequisites: [
      'On-premises Active Directory domain controller accessible from the Identity Radar server',
      'A service account with Read access to the target OUs (no write permissions needed)',
      'LDAP (port 389) or LDAPS (port 636) open between Identity Radar and the domain controller',
      'Base DN of the directory (e.g., DC=corp,DC=example,DC=com)',
    ],
    setupSteps: [
      'Create a dedicated service account in AD: e.g., svc-identity-radar with a strong password',
      'Grant the account "Read" permissions on the OUs you want to import (Users, Groups, Computers)',
      'If using LDAPS (recommended), ensure the DC has a valid TLS certificate installed',
      'In Identity Radar, go to Integrations → Connect New Source → Active Directory',
      'Enter the LDAP host (e.g., dc01.corp.example.com), port (389 or 636), Base DN, Bind DN (the service account DN), and password',
      'Check "Use TLS (LDAPS)" if connecting on port 636',
      'Click "Test Connection" — you should see "Connection Successful" with a user/group count',
      'Click "Save & Start First Sync" to begin importing',
    ],
    dataPulled: [
      'All user objects (sAMAccountName, UPN, displayName, email, department, manager, lastLogonTimestamp, pwdLastSet)',
      'All security and distribution groups (name, type, scope, member list, nested group memberships)',
      'Organizational Units (OU hierarchy for tier classification)',
      'Group membership relationships (direct and nested)',
      'Account status (enabled/disabled, locked, expired)',
      'Password age and last logon timestamps for dormancy detection',
    ],
    syncFrequency: 'Every 6 hours (configurable). Incremental sync uses whenChanged attribute for efficiency.',
    troubleshooting: [
      'Connection refused: Verify port 389/636 is open. Test with: Test-NetConnection dc01.corp.example.com -Port 389',
      'Invalid credentials: Ensure Bind DN is the full distinguished name, e.g., CN=svc-identity-radar,OU=Service Accounts,DC=corp,DC=example,DC=com',
      'TLS certificate error: Import the DC\'s CA certificate or disable certificate validation for testing',
      'Timeout on large directories: Increase the sync timeout in Settings → Policies. Directories with 50K+ objects may take 15-30 minutes on first sync',
      'Missing users: Check the Base DN covers the OUs where users reside. Nested OUs under the Base DN are included automatically',
    ],
    notes: 'Alternative: If LDAP connectivity is not possible, export users via PowerShell (Get-ADUser -Filter * -Properties *) and import via CSV connector.',
  },
  azure_ad: {
    prerequisites: [
      'Azure AD / Entra ID tenant with Global Reader or Directory Reader role',
      'An App Registration in Azure AD with the following API permissions (Application type, not Delegated):',
      '  • Microsoft Graph: User.Read.All, Group.Read.All, Application.Read.All, RoleManagement.Read.Directory, AuditLog.Read.All, Directory.Read.All',
      'A Client Secret or Certificate created for the App Registration',
      'The Tenant ID, Client ID, and Client Secret values',
    ],
    setupSteps: [
      'Go to Azure Portal → Azure Active Directory → App registrations → New registration',
      'Name it "Identity Radar Connector", select "Accounts in this organizational directory only"',
      'After creation, go to API permissions → Add a permission → Microsoft Graph → Application permissions',
      'Add: User.Read.All, Group.Read.All, Application.Read.All, RoleManagement.Read.Directory, AuditLog.Read.All, Directory.Read.All',
      'Click "Grant admin consent for [your tenant]" (requires Global Admin)',
      'Go to Certificates & secrets → New client secret → Set expiry (recommended: 12 months) → Copy the Value immediately',
      'Copy the Tenant ID and Client ID from the Overview page',
      'In Identity Radar, go to Integrations → Connect New Source → Azure AD / Entra ID',
      'Enter the Tenant ID, Client ID, and Client Secret',
      'Click "Test Connection" — you should see user and group counts',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'All users (displayName, UPN, email, department, jobTitle, manager, accountEnabled, lastSignInDateTime)',
      'All groups (security, M365, dynamic) with member lists',
      'App registrations and their owners (non-human identities)',
      'Managed identities (system-assigned and user-assigned)',
      'Azure AD roles and role assignments (Global Admin, Privileged Role Admin, etc.)',
      'Sign-in logs (success/failure, MFA status, location, risk events)',
      'Service principal credentials and expiry dates',
    ],
    syncFrequency: 'Every 4 hours. Sign-in logs sync every 1 hour. Uses Microsoft Graph delta queries for incremental sync.',
    troubleshooting: [
      'Insufficient privileges: Ensure "Grant admin consent" was clicked. Check API permissions show green checkmarks',
      'Client secret expired: Generate a new secret in Azure Portal and update the connector config in Identity Radar',
      'Rate limiting (429 errors): The connector automatically handles throttling with exponential backoff. Large tenants (100K+ users) may take up to 1 hour for initial sync',
      'Missing sign-in logs: Sign-in logs require Azure AD P1 or P2 license. Free tier does not include sign-in logs',
      'Conditional Access data missing: Requires Policy.Read.All permission (add separately if needed)',
    ],
  },
  okta: {
    prerequisites: [
      'Okta tenant with Super Admin or Read-Only Admin role',
      'An API token generated from Okta Admin Console',
      'The Okta domain (e.g., your-company.okta.com)',
    ],
    setupSteps: [
      'Log in to Okta Admin Console → Security → API → Tokens',
      'Click "Create Token", name it "Identity Radar", and copy the token value immediately (it is only shown once)',
      'In Identity Radar, go to Integrations → Connect New Source → Okta',
      'Enter your Okta domain (e.g., your-company.okta.com) and the API token',
      'Click "Test Connection" to verify access',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'All users (profile fields, status, lastLogin, MFA enrollment status)',
      'All groups (type, membership)',
      'Application assignments (which user has access to which Okta app)',
      'MFA factors enrolled per user (SMS, TOTP, WebAuthn, Okta Verify)',
      'Authentication policies and sign-on rules',
      'System log events for threat detection',
    ],
    syncFrequency: 'Every 6 hours for users/groups. System log events sync every 1 hour.',
    troubleshooting: [
      'Invalid token: Tokens are org-specific. Ensure you are using the correct Okta domain',
      '403 Forbidden: The token creator must have Super Admin or Read-Only Admin role',
      'Token expired: Okta API tokens expire after 30 days of inactivity. Generate a new one if the connector shows errors',
      'Rate limiting: Okta enforces /api/v1 rate limits. The connector uses pagination and respects Retry-After headers',
    ],
  },
  sailpoint_iiq: {
    prerequisites: [
      'SailPoint IdentityIQ 7.x or 8.x instance accessible over HTTPS',
      'An admin account with REST API or SCIM 2.0 access (spadmin or equivalent)',
      'For SCIM: IdentityIQ 8.x+ with SCIM 2.0 plugin installed and configured',
      'Network connectivity between Identity Radar and the IIQ server (typically port 443)',
    ],
    setupSteps: [
      'In SailPoint IIQ Admin Console, create a dedicated API user (e.g., svc-identity-radar)',
      'Assign the user the "SystemAdministrator" capability or a custom capability with: Identity Read, Role Read, Entitlement Read, Certification Read',
      'If using SCIM 2.0 (recommended for IIQ 8.x+): Install the SCIM plugin and configure a SCIM client',
      'In Identity Radar, go to Integrations → Connect New Source → SailPoint IdentityIQ',
      'Enter the IIQ base URL (e.g., https://sailpoint-iiq.example.com/identityiq), username, and password',
      'Check "Use SCIM 2.0 endpoint" if available (recommended for better performance)',
      'Click "Test Connection" and verify identity/entitlement counts',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'All identities with full profile attributes',
      'Roles (IT roles, business roles) and role assignments',
      'Entitlements and entitlement assignments with certification status',
      'Access certification campaigns and their results (approved/revoked)',
      'Separation of Duties (SoD) policy violations',
      'Lifecycle events (joiner, mover, leaver status)',
    ],
    syncFrequency: 'Every 6 hours. Certification results sync daily.',
    troubleshooting: [
      'Connection timeout: Ensure the IIQ server is accessible on port 443 from the Identity Radar server',
      '401 Unauthorized: Verify the API user credentials. Some IIQ installations require the username in domain\\user format',
      'SCIM endpoint not found: Ensure the SCIM plugin is installed and the endpoint is /identityiq/scim/v2',
      'Slow sync: Large IIQ installations (500K+ identities) should use SCIM 2.0 for better pagination support',
      'Missing certifications: Certification data requires the API user to have Certification Read capability',
    ],
  },
  broadcom_sso: {
    prerequisites: [
      'Broadcom (CA) SiteMinder Policy Server with Administrative API enabled',
      'Admin account with PolicyAdmin privileges',
      'Network access to the SiteMinder admin port (typically 8443)',
      'Knowledge of the User Directory name configured in SiteMinder',
    ],
    setupSteps: [
      'Verify the SiteMinder Administrative API is enabled on your Policy Server',
      'Create or identify an admin account with PolicyAdmin role',
      'In Identity Radar, go to Integrations → Connect New Source → Broadcom SiteMinder SSO',
      'Enter the SiteMinder base URL (e.g., https://siteminder.example.com:8443), admin credentials, and User Directory name',
      'Optionally specify a Policy Domain to limit scope',
      'Click "Test Connection" to verify',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'User directory entries (users linked to SSO policies)',
      'SSO policies and policy domains',
      'Authentication schemes and protected resources',
      'Realms and rules (which resources are protected)',
      'Agent configurations',
      'Authentication events and session data (if audit logging is enabled)',
    ],
    syncFrequency: 'Every 6 hours.',
    troubleshooting: [
      'Connection refused on port 8443: Verify the Administrative API is enabled in the Policy Server Management Console',
      'Admin privileges insufficient: The account needs PolicyAdmin, not just PolicyUser',
      'Empty user list: Check the User Directory name matches exactly (case-sensitive)',
      'TLS errors: Import SiteMinder\'s CA certificate or configure Identity Radar to trust it',
    ],
  },
  broadcom_pam: {
    prerequisites: [
      'Broadcom (CA) Privileged Access Manager server with REST API enabled',
      'An API user account with admin role',
      'Network access to PAM port (typically 18443)',
    ],
    setupSteps: [
      'In Broadcom PAM Admin Console, create an API user or use an existing admin account',
      'If API keys are enabled, generate one for the service account',
      'In Identity Radar, go to Integrations → Connect New Source → Broadcom PAM',
      'Enter the PAM base URL, API username, API password, and optionally an API key',
      'Optionally specify a Vault Name to limit scope',
      'Click "Test Connection" and verify credential/vault counts',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'Privileged credentials and accounts managed by PAM',
      'Vault memberships and access policies',
      'Session recording metadata (who accessed what, when, duration)',
      'Password rotation schedules and last rotation dates',
      'Check-out/check-in history for shared credentials',
      'Access request and approval history',
    ],
    syncFrequency: 'Every 4 hours. Session data syncs every 1 hour.',
    troubleshooting: [
      'API not reachable: Ensure REST API is enabled in PAM configuration',
      'Authentication failure: Some PAM versions require both API user credentials AND an API key',
      'Empty vault list: The API user may not have visibility into all vaults. Check vault-level permissions',
    ],
  },
  servicenow: {
    prerequisites: [
      'ServiceNow instance (any edition: ITSM, ITOM, IRM)',
      'A user account with roles: itil, personalize_choices, rest_api_explorer',
      'OAuth2 client configured (recommended for production) or Basic Auth enabled',
      'The instance URL (e.g., https://your-company.service-now.com)',
    ],
    setupSteps: [
      'In ServiceNow, create an integration user (e.g., svc-identity-radar) and assign required roles',
      'For OAuth2 (recommended): Go to System OAuth → Application Registry → Create an OAuth API endpoint',
      'In Identity Radar, go to Integrations → Connect New Source → ServiceNow',
      'Enter the instance URL, username, and password',
      'For OAuth2: Also enter the Client ID and Client Secret',
      'Click "Test Connection" to verify API access',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'User records (sys_user table: name, email, department, manager, active status)',
      'Groups and group memberships (sys_user_group, sys_user_grmember)',
      'Roles and role assignments (sys_user_role)',
      'Department hierarchy',
      'CMDB relationships (optional: which users own which CIs)',
      'Incidents and requests assigned to users (for activity tracking)',
    ],
    syncFrequency: 'Every 6 hours.',
    troubleshooting: [
      'REST API disabled: Ensure the REST API plugin is activated in your ServiceNow instance',
      '401 error with correct credentials: Check if Basic Auth is enabled (System Properties → glide.basicauth.required)',
      'OAuth token expired: Client secrets expire based on your OAuth config. Regenerate and update in Identity Radar',
      'Missing user records: The integration user needs read access to sys_user. Check ACL rules',
      'Rate limiting: ServiceNow enforces API rate limits. The connector batches requests and respects rate limit headers',
    ],
  },
  csv: {
    prerequisites: [
      'A CSV file with identity data (exported from any system: AD PowerShell, HR system, spreadsheet)',
      'The CSV must have a header row',
    ],
    setupSteps: [
      'Prepare your CSV with at minimum these columns: displayName, type (human/non_human), status',
      'Optional columns: subType, upn, email, department, adTier, samAccountName, manager, source',
      'In Identity Radar, go to Integrations → Connect New Source → CSV Import',
      'Paste the CSV content directly or upload the file',
      'Review the column mapping preview — Identity Radar will auto-detect common column names',
      'Adjust any incorrect mappings',
      'Click "Test Connection" to validate the CSV format',
      'Click "Save & Start First Sync" to import',
    ],
    dataPulled: [
      'Whatever columns you provide — Identity Radar maps them to the identity ontology',
      'Supported fields: displayName, type, subType, upn, email, department, adTier, status, samAccountName, manager, source, lastLogon',
    ],
    syncFrequency: 'One-time import. Re-upload a new CSV to update.',
    troubleshooting: [
      'Column not recognized: Ensure the header row uses supported field names. Use the mapping preview to manually assign columns',
      'Duplicate identities: If UPN or email matches an existing identity, the record is updated (upsert), not duplicated',
      'Encoding issues: Save CSV as UTF-8 with BOM for best compatibility, especially with Arabic names',
      'Large files: CSV imports support up to 50,000 rows per upload. For larger datasets, split into multiple files',
    ],
    notes: 'Tip: Export from AD using PowerShell: Get-ADUser -Filter * -Properties DisplayName,EmailAddress,Department,Manager,LastLogonDate | Export-Csv -Path ad-users.csv -NoTypeInformation',
  },
  microsoft_defender: {
    prerequisites: [
      'Microsoft Defender for Identity license (included in Microsoft 365 E5 or standalone)',
      'An App Registration in Azure AD with these API permissions (Application type):',
      '  • Microsoft Graph: SecurityEvents.Read.All, IdentityRiskEvent.Read.All',
      '  • Microsoft Threat Protection: AdvancedHunting.Read.All (if using M365 Defender)',
      'Admin consent granted for the permissions',
    ],
    setupSteps: [
      'Use the same App Registration as Azure AD connector, or create a new one',
      'Add API permissions: Microsoft Graph → SecurityEvents.Read.All, IdentityRiskEvent.Read.All',
      'If using M365 Defender Advanced Hunting: Add Microsoft Threat Protection → AdvancedHunting.Read.All',
      'Grant admin consent',
      'In Identity Radar, go to Integrations → Connect New Source → Microsoft Defender for Identity',
      'Enter the same Tenant ID, Client ID, and Client Secret',
      'Click "Test Connection" to verify access to security events',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'Identity-related security alerts (lateral movement, credential theft, reconnaissance)',
      'Risk events (impossible travel, leaked credentials, anonymous IP, malware-linked IPs)',
      'Suspicious authentication patterns (pass-the-hash, pass-the-ticket, overpass-the-hash)',
      'Honeytoken activity alerts',
      'LDAP and NTLM authentication anomalies',
      'Sensitive group modifications (Domain Admins, Enterprise Admins changes)',
    ],
    syncFrequency: 'Every 1 hour for active alerts. Risk events sync every 15 minutes.',
    troubleshooting: [
      'No security events: Ensure Defender for Identity sensors are installed on your domain controllers',
      'Permission denied: SecurityEvents.Read.All requires admin consent — check the green checkmark in Azure Portal',
      'Missing risk events: Risk events require Azure AD P2 license',
      'Delayed alerts: Defender for Identity has a 5-15 minute detection delay by design',
    ],
  },
  sap_grc: {
    prerequisites: [
      'SAP GRC Access Control 10.x or 12.x with OData/REST API enabled',
      'A technical user with RFC authorization and roles: SAP_GRC_NWBC, GRC_API_READ',
      'For SAP IdM integration: IdM REST endpoint URL and credentials',
      'Network connectivity to SAP system (typically port 443 for HTTPS or 8443)',
    ],
    setupSteps: [
      'In SAP, create a technical user (e.g., SVC_IDR) with SAP_GRC_NWBC and API read roles',
      'Enable OData services in transaction /IWFND/MAINT_SERVICE for GRC Access Control',
      'In Identity Radar, go to Integrations → Connect New Source → SAP GRC / SAP IdM',
      'Enter the GRC base URL (e.g., https://sap-grc.example.com:8443/sap/bc), username, and password',
      'For SAP IdM: Enter the Client ID, Client Secret, and IdM endpoint URL',
      'Click "Test Connection" to verify API connectivity',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'SAP users and their role assignments (single roles, composite roles)',
      'Risk analysis results from GRC Access Risk Analysis',
      'Separation of Duties (SoD) violations and mitigating controls',
      'Firefighter (emergency access) usage logs',
      'Access request workflow status',
      'Business role definitions and mappings',
      'SAP IdM: managed identities, provisioning status, account lifecycle events',
    ],
    syncFrequency: 'Every 6 hours. SoD violation data syncs daily.',
    troubleshooting: [
      'OData service not found: Ensure the GRC OData services are activated in /IWFND/MAINT_SERVICE',
      '403 Forbidden: The technical user needs RFC authorization objects (S_RFC) in addition to GRC roles',
      'Timeout on large SAP landscapes: Initial sync may take 30-60 minutes for systems with 100K+ users. Subsequent syncs are incremental',
      'SoD data missing: Risk analysis must have been executed in GRC at least once for SoD violations to appear',
    ],
  },
  hashicorp_vault: {
    prerequisites: [
      'HashiCorp Vault server (OSS or Enterprise) accessible over HTTPS',
      'Authentication: either a Vault token with read policy, or AppRole credentials (role_id + secret_id)',
      'The Vault address (e.g., https://vault.example.com:8200)',
      'Read access to: identity/*, sys/policy/*, sys/mounts/*',
    ],
    setupSteps: [
      'Create a read-only policy in Vault for Identity Radar:',
      '  vault policy write identity-radar - <<EOF\n  path "identity/*" { capabilities = ["read", "list"] }\n  path "sys/policy/*" { capabilities = ["read", "list"] }\n  path "sys/mounts/*" { capabilities = ["read", "list"] }\n  EOF',
      'Option A — Token auth: Create a token with the policy: vault token create -policy=identity-radar -period=768h',
      'Option B — AppRole auth: vault auth enable approle && vault write auth/approle/role/identity-radar policies=identity-radar',
      'In Identity Radar, go to Integrations → Connect New Source → HashiCorp Vault',
      'Enter the Vault address and either the token or AppRole role_id + secret_id',
      'Click "Test Connection" to verify policy access',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'Identity entities (name, aliases, policies, metadata, creation time)',
      'Identity groups (name, type, members, policies)',
      'ACL policies and their paths/capabilities',
      'Auth methods and their configurations (LDAP, OIDC, AppRole, etc.)',
      'Secret engine mounts and types (KV, PKI, Transit, etc.)',
      'Token accessor metadata (for tracking active sessions)',
    ],
    syncFrequency: 'Every 6 hours.',
    troubleshooting: [
      'Permission denied: Ensure the token/AppRole has the identity-radar policy attached',
      'Vault sealed: Identity Radar cannot sync while Vault is sealed. Ensure auto-unseal is configured',
      'TLS certificate error: If Vault uses a private CA, configure Identity Radar to trust the CA certificate',
      'AppRole secret_id expired: Secret IDs can have TTLs. Generate a new one and update the connector config',
    ],
  },
  splunk: {
    prerequisites: [
      'Splunk Enterprise 8.x+ or Splunk Cloud with REST API access',
      'A Splunk user with the "search" capability, or a bearer token from Splunk HTTP Event Collector',
      'The Splunk management port (default: 8089 for on-prem, 443 for Splunk Cloud)',
    ],
    setupSteps: [
      'In Splunk, create a dedicated user (e.g., svc-identity-radar) with the "user" role + search capability',
      'Alternatively: Generate a bearer token in Settings → Tokens',
      'In Identity Radar, go to Integrations → Connect New Source → Splunk SIEM',
      'Enter the Splunk base URL (e.g., https://splunk.example.com:8089)',
      'Enter either username/password or a bearer token',
      'Click "Test Connection" to verify search API access',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'Identity-related security events (failed logins, account lockouts, privilege escalations)',
      'Notable events from Splunk Enterprise Security (if ES is installed)',
      'Windows Security Event Logs (Event IDs: 4624, 4625, 4648, 4672, 4720, 4722, 4732, etc.)',
      'Authentication events across all integrated sources',
      'Alert triggers and their associated identities',
      'Custom search results from saved searches tagged for Identity Radar',
    ],
    syncFrequency: 'Every 1 hour for security events. Notable events sync every 15 minutes.',
    troubleshooting: [
      'Connection refused on port 8089: Ensure the Splunk management port is open. For Splunk Cloud, use port 443 with the API URL from your Splunk Cloud admin',
      'Search failed: The user needs "search" capability. Check Splunk roles',
      'No results: Ensure the time range covers recent events. Check that Windows Security logs are being ingested into Splunk',
      'Bearer token invalid: Tokens can expire. Generate a new one in Splunk Settings → Tokens',
      'Splunk Cloud: Use the API endpoint (https://your-instance.splunkcloud.com:8089), not the web UI URL',
    ],
  },
  beyondtrust: {
    prerequisites: [
      'BeyondTrust Password Safe 23.x+ with REST API enabled',
      'An API key generated from the BeyondTrust Admin Console',
      'A "Run As" user account with API access permissions',
      'Network access to the BeyondTrust server (typically port 443)',
    ],
    setupSteps: [
      'In BeyondTrust Admin Console, go to Configuration → API Registrations → Create new',
      'Generate an API key and note the key value',
      'Create or designate a "Run As" user with permissions to read managed accounts, systems, and policies',
      'In Identity Radar, go to Integrations → Connect New Source → BeyondTrust PAM',
      'Enter the Host URL (e.g., https://beyondtrust.example.com), API Key, and Run As User',
      'Click "Test Connection" to verify API access',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'Managed accounts (privileged credentials, service accounts, local admin accounts)',
      'Managed systems (servers, network devices, databases linked to PAM)',
      'Access policies (who can check out which credentials)',
      'Session metadata (check-out/check-in times, session duration)',
      'Password rotation history and schedules',
      'Account groups and their members',
    ],
    syncFrequency: 'Every 4 hours. Session activity syncs every 1 hour.',
    troubleshooting: [
      'API key rejected: Ensure the API registration is active and the key has not been rotated',
      'Run As user unauthorized: The user must have API access. Check user permissions in BeyondTrust Admin',
      'Empty managed accounts list: The Run As user may not have visibility into all managed systems. Check system-level permissions',
      'TLS errors: Ensure the BeyondTrust server\'s certificate is trusted by Identity Radar',
    ],
  },
  digicert: {
    prerequisites: [
      'DigiCert CertCentral account with API access enabled',
      'An API key generated from CertCentral (Account → API Keys)',
      'Internet access to DigiCert API (https://www.digicert.com/services/v2)',
    ],
    setupSteps: [
      'Log in to DigiCert CertCentral → Account → API Keys',
      'Click "Create API Key", name it "Identity Radar", and copy the key immediately',
      'In Identity Radar, go to Integrations → Connect New Source → DigiCert CertCentral',
      'Enter the API key',
      'Click "Test Connection" to verify access to your certificate inventory',
      'Click "Save & Start First Sync"',
    ],
    dataPulled: [
      'All certificates (SSL/TLS, client auth, code signing) with status and expiry dates',
      'Certificate owners and requestors (mapped to identities)',
      'Expiring certificates (30/60/90 day warnings)',
      'Revoked certificates and revocation reasons',
      'Certificate-based identities (client certificates used for machine authentication)',
      'Organization validation status',
    ],
    syncFrequency: 'Daily. Certificate expiry alerts are evaluated every 6 hours.',
    troubleshooting: [
      'API key rejected: Ensure the key is active. DigiCert API keys can be disabled by account admins',
      'No certificates found: Check that the API key is associated with the correct CertCentral account/division',
      'Rate limiting: DigiCert API has a 1000 requests/5 min limit. The connector uses pagination and respects limits',
      'Missing certificate owners: Owner data depends on how certificates were requested in CertCentral. Manually uploaded certs may lack owner info',
    ],
  },
}

function ConnectorsTab({ search }: { search: string }) {
  const lowerSearch = search.toLowerCase()

  const grouped: Record<string, ConnectorMeta[]> = {}
  for (const cat of CATEGORY_ORDER) {
    const connectors = CONNECTOR_REGISTRY.filter(
      (c) =>
        c.category === cat &&
        (!search ||
          c.label.toLowerCase().includes(lowerSearch) ||
          c.description.toLowerCase().includes(lowerSearch) ||
          c.category.toLowerCase().includes(lowerSearch) ||
          (CONNECTOR_GUIDES[c.type]?.dataPulled.some(d => d.toLowerCase().includes(lowerSearch))) ||
          (CONNECTOR_GUIDES[c.type]?.prerequisites.some(p => p.toLowerCase().includes(lowerSearch))))
    )
    if (connectors.length > 0) {
      grouped[cat] = connectors
    }
  }

  const categories = Object.keys(grouped)

  if (categories.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        No connectors match your search.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {categories.map((cat) => (
        <Accordion
          key={cat}
          defaultOpen={true}
          forceOpen={search.length > 0 ? true : undefined}
          title={
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {CATEGORY_LABELS[cat as ConnectorMeta['category']]}
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                ({grouped[cat].length} connector{grouped[cat].length !== 1 ? 's' : ''})
              </span>
            </span>
          }
        >
          <div className="flex flex-col gap-4">
            {grouped[cat].map((connector) => {
              const guide = CONNECTOR_GUIDES[connector.type]
              return (
                <div
                  key={connector.type}
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--bg-primary)',
                  }}
                >
                  {/* Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {connector.label}
                    </h4>
                    <span
                      className="rounded px-2 py-0.5 text-xs font-medium uppercase"
                      style={{
                        color: 'var(--color-accent)',
                        backgroundColor: 'var(--bg-tertiary)',
                      }}
                    >
                      {CATEGORY_LABELS[connector.category]}
                    </span>
                  </div>
                  <p className="mb-4 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {connector.description}
                  </p>

                  {guide && (
                    <div className="flex flex-col gap-4">
                      {/* Prerequisites */}
                      <div>
                        <h5 className="mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                          Prerequisites
                        </h5>
                        <ul className="flex flex-col gap-1 ps-4" style={{ listStyleType: 'disc' }}>
                          {guide.prerequisites.map((p, i) => (
                            <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Setup Steps */}
                      <div>
                        <h5 className="mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                          Setup Steps
                        </h5>
                        <ol className="flex flex-col gap-1 ps-4" style={{ listStyleType: 'decimal' }}>
                          {guide.setupSteps.map((s, i) => (
                            <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s}</li>
                          ))}
                        </ol>
                      </div>

                      {/* Data Pulled */}
                      <div>
                        <h5 className="mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                          Data Imported
                        </h5>
                        <ul className="flex flex-col gap-1 ps-4" style={{ listStyleType: 'disc' }}>
                          {guide.dataPulled.map((d, i) => (
                            <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{d}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Sync Frequency */}
                      <div>
                        <h5 className="mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                          Sync Frequency
                        </h5>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{guide.syncFrequency}</p>
                      </div>

                      {/* Credentials */}
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <h5 className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                            Required Credentials
                          </h5>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {connector.requiredCredentials.map((cred) => (
                              <code
                                key={cred}
                                className="rounded px-1.5 py-0.5 text-xs font-mono"
                                style={{ color: 'var(--color-critical)', backgroundColor: 'var(--bg-tertiary)' }}
                              >
                                {cred}
                              </code>
                            ))}
                          </div>
                        </div>
                        {connector.optionalCredentials.length > 0 && (
                          <div>
                            <h5 className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                              Optional
                            </h5>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {connector.optionalCredentials.map((cred) => (
                                <code
                                  key={cred}
                                  className="rounded px-1.5 py-0.5 text-xs font-mono"
                                  style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}
                                >
                                  {cred}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Troubleshooting */}
                      <div>
                        <h5 className="mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-warning)' }}>
                          Troubleshooting
                        </h5>
                        <ul className="flex flex-col gap-1 ps-4" style={{ listStyleType: 'disc' }}>
                          {guide.troubleshooting.map((t, i) => (
                            <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Notes */}
                      {guide.notes && (
                        <div
                          className="rounded-md p-3 text-xs leading-relaxed"
                          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                        >
                          <strong style={{ color: 'var(--color-info)' }}>Note: </strong>
                          {guide.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback if no guide */}
                  {!guide && (
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Required Credentials</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {connector.requiredCredentials.map((cred) => (
                            <code key={cred} className="rounded px-1.5 py-0.5 text-xs font-mono" style={{ color: 'var(--color-critical)', backgroundColor: 'var(--bg-tertiary)' }}>{cred}</code>
                          ))}
                        </div>
                      </div>
                      {connector.optionalCredentials.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Optional</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {connector.optionalCredentials.map((cred) => (
                              <code key={cred} className="rounded px-1.5 py-0.5 text-xs font-mono" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>{cred}</code>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Accordion>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Compliance                                                    */
/* ------------------------------------------------------------------ */

function ComplianceTab({ search }: { search: string }) {
  const lowerSearch = search.toLowerCase()

  const filtered = COMPLIANCE_FRAMEWORKS.map((fw) => ({
    ...fw,
    rows: fw.rows.filter(
      (r) =>
        !search ||
        r.controlId.toLowerCase().includes(lowerSearch) ||
        r.controlName.toLowerCase().includes(lowerSearch) ||
        r.feature.toLowerCase().includes(lowerSearch) ||
        fw.name.toLowerCase().includes(lowerSearch)
    ),
  })).filter((fw) => fw.rows.length > 0)

  if (filtered.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        No compliance controls match your search.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((fw) => (
        <Accordion
          key={fw.name}
          defaultOpen={true}
          forceOpen={search.length > 0 ? true : undefined}
          title={
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {fw.name}
              </span>
              <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                ({fw.rows.length} control{fw.rows.length !== 1 ? 's' : ''})
              </span>
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Control ID
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Control Name
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Identity Radar Feature
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Dashboard
                  </th>
                </tr>
              </thead>
              <tbody>
                {fw.rows.map((row) => (
                  <tr
                    key={row.controlId}
                    style={{ borderBottom: '1px solid var(--border-default)' }}
                  >
                    <td className="px-3 py-2">
                      <code
                        className="rounded px-1.5 py-0.5 text-xs font-mono font-semibold"
                        style={{
                          color: 'var(--color-accent)',
                          backgroundColor: 'var(--bg-tertiary)',
                        }}
                      >
                        {row.controlId}
                      </code>
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>
                      {row.controlName}
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {row.feature}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={row.link}
                        className="inline-flex items-center gap-1 text-xs font-mono"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {row.link}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Accordion>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'guide', label: 'User Guide', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'api', label: 'API Reference', icon: <Code2 className="h-4 w-4" /> },
  { id: 'connectors', label: 'Connectors', icon: <Plug className="h-4 w-4" /> },
  { id: 'compliance', label: 'Compliance', icon: <Shield className="h-4 w-4" /> },
]

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('guide')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Documentation
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Platform guides, API reference, connector setup, and compliance mappings
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: 'var(--text-tertiary)' }}
        />
        <input
          type="text"
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none transition-colors"
          style={{
            borderColor: 'var(--border-default)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Tab bar */}
      <div
        className="mb-6 flex gap-1 rounded-lg border p-1"
        style={{
          borderColor: 'var(--border-default)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id)
              setSearchQuery('')
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: activeTab === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'guide' && <GuideTab search={searchQuery} />}
      {activeTab === 'api' && <ApiTab search={searchQuery} />}
      {activeTab === 'connectors' && <ConnectorsTab search={searchQuery} />}
      {activeTab === 'compliance' && <ComplianceTab search={searchQuery} />}
    </>
  )
}
