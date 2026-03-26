'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  Shield, Eye, Zap, Brain, Users, Network, ClipboardCheck,
  Bot, FileText, ArrowRight, Check, ChevronRight,
} from 'lucide-react'

export default function LandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400 animate-pulse">Loading...</div>
      </main>
    )
  }

  if (session) return null

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-info)] flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Identity Radar</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="text-sm text-slate-400 hover:text-white transition-colors">Architecture</a>
            <a href="#integrations" className="text-sm text-slate-400 hover:text-white transition-colors">Integrations</a>
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-[var(--color-info)] text-white text-sm font-medium rounded-[var(--radius-button)] hover:opacity-90 transition-opacity"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-slate-950 pt-32 pb-24 overflow-hidden">
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }} />
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[var(--color-info)] rounded-full opacity-[0.04] blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--color-low)] animate-pulse-dot" />
            <span className="text-xs font-medium text-slate-400">Built for Saudi regulatory compliance</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-tight max-w-4xl mx-auto">
            See every identity.{' '}
            <span className="text-[var(--color-info)]">Fix every risk.</span>
          </h1>

          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            AI-powered IAM posture management with Active Directory tiering,
            non-human identity tracking, and automated compliance for NCA, SAMA, and PDPL.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-info)] text-white font-medium rounded-[var(--radius-button)] hover:opacity-90 transition-opacity text-sm"
            >
              Start Free <ArrowRight size={16} />
            </Link>
            <a
              href="mailto:demo@identityradar.io"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white font-medium rounded-[var(--radius-button)] hover:bg-white/5 transition-colors text-sm"
            >
              Book a Demo
            </a>
          </div>

          <div className="flex items-center justify-center gap-4 mt-8">
            {['NCA ECC', 'SAMA CSF', 'PDPL', 'ISO 27001'].map(fw => (
              <span key={fw} className="px-3 py-1 rounded-md bg-white/5 text-xs font-medium text-slate-500">
                {fw}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-lg text-slate-400 max-w-3xl mx-auto mb-12">
            Your organization has thousands of identities across AD, Azure, Okta, and SailPoint.
            Without unified visibility, risks hide in plain sight.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: '73%', desc: 'of breaches involve compromised identities' },
              { stat: '60%', desc: 'of service accounts are over-privileged' },
              { stat: '45%', desc: 'of organizations fail tier compliance' },
            ].map(item => (
              <div key={item.stat} className="text-center p-8 rounded-xl bg-white/5 border border-white/10">
                <p className="text-4xl font-semibold text-[var(--color-info)]">{item.stat}</p>
                <p className="mt-3 text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three-Layer Architecture */}
      <section id="architecture" className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-[var(--color-info)] uppercase tracking-wider mb-3">Architecture</p>
            <h2 className="text-3xl font-semibold text-white">Three layers of intelligence</h2>
            <p className="mt-3 text-slate-400 max-w-xl mx-auto">
              Modeled after the Semantic / Kinetic / Dynamic pattern for enterprise-grade IAM posture management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Eye,
                title: 'See',
                subtitle: 'Semantic Layer',
                desc: 'Unified identity ontology across all sources. Every identity, entitlement, and group in one model with AD tier classification.',
                color: 'var(--color-info)',
              },
              {
                icon: Zap,
                title: 'Fix',
                subtitle: 'Kinetic Layer',
                desc: 'Automated actions and workflows. Certify access, revoke entitlements, enforce policies, and run certification campaigns.',
                color: 'var(--color-medium)',
              },
              {
                icon: Brain,
                title: 'Know',
                subtitle: 'Dynamic Layer',
                desc: 'AI-powered risk scoring, remediation plans, anomaly detection, and posture simulation with decision capture.',
                color: 'var(--color-critical)',
              },
            ].map(layer => (
              <div key={layer.title} className="p-8 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-5" style={{ backgroundColor: `color-mix(in srgb, ${layer.color} 15%, transparent)` }}>
                  <layer.icon size={24} style={{ color: layer.color }} />
                </div>
                <h3 className="text-xl font-semibold text-white">{layer.title}</h3>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{layer.subtitle}</p>
                <p className="mt-4 text-sm text-slate-400 leading-relaxed">{layer.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-[var(--color-info)] uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl font-semibold text-white">Everything you need for IAM posture</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: 'Unified Identity Model',
                desc: 'Human and non-human identities in a single ontology. No more siloed views across AD, Azure, and SSO providers.',
              },
              {
                icon: Shield,
                title: 'AD Tiering Compliance',
                desc: 'First-class Active Directory tiering model. Detect cross-tier violations and enforce tier 0/1/2 boundaries.',
              },
              {
                icon: Brain,
                title: 'AI Risk Scoring',
                desc: 'Deterministic base scoring enhanced with AI analysis. Prioritize remediation by actual risk, not just alerts.',
              },
              {
                icon: ClipboardCheck,
                title: 'Access Certifications',
                desc: 'Run certification campaigns. Managers certify or revoke access with full audit trail and SLA tracking.',
              },
              {
                icon: Bot,
                title: 'Non-Human Identity Tracking',
                desc: 'Track service accounts, managed identities, API keys, and certificates. Detect orphaned and over-privileged NHIs.',
              },
              {
                icon: FileText,
                title: 'Compliance Reporting',
                desc: 'Pre-mapped to NCA ECC, SAMA CSF, and PDPL controls. Generate audit-ready evidence with one click.',
              },
            ].map(feature => (
              <div key={feature.title} className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-info)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--color-info)]/20 transition-colors">
                  <feature.icon size={20} className="text-[var(--color-info)]" />
                </div>
                <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Logos */}
      <section id="integrations" className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-[var(--color-info)] uppercase tracking-wider mb-3">Integrations</p>
          <h2 className="text-3xl font-semibold text-white mb-4">Works with your existing IAM stack</h2>
          <p className="text-slate-400 mb-12 max-w-xl mx-auto">
            Connect your identity sources in minutes. Import identities, entitlements, and groups automatically.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              'Active Directory', 'Azure AD / Entra ID', 'Okta',
              'SailPoint', 'CyberArk', 'Broadcom',
            ].map(name => (
              <div key={name} className="px-6 py-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                <span className="text-sm font-medium text-slate-300">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-[var(--color-info)] uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-3xl font-semibold text-white">Start free, scale as you grow</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                desc: 'For teams getting started with IAM posture management.',
                features: ['500 identities', '1 integration source', '3 team members', '5 AI analyses/month', '30-day data retention'],
                cta: 'Start Free',
                featured: false,
              },
              {
                name: 'Professional',
                price: '$299',
                period: '/month',
                desc: 'For growing organizations with complex identity landscapes.',
                features: ['10,000 identities', '5 integration sources', '15 team members', '50 AI analyses/month', '1-year data retention', 'API access', 'Priority support'],
                cta: 'Start Free Trial',
                featured: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                desc: 'For large organizations with advanced compliance needs.',
                features: ['Unlimited identities', 'Unlimited sources', 'Unlimited team members', 'Unlimited AI analyses', '3-year data retention', 'SSO/SAML', 'Dedicated support', 'On-premise deployment'],
                cta: 'Contact Sales',
                featured: false,
              },
            ].map(plan => (
              <div
                key={plan.name}
                className={`p-8 rounded-xl border ${
                  plan.featured
                    ? 'bg-[var(--color-info)]/5 border-[var(--color-info)]/30 ring-1 ring-[var(--color-info)]/20'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {plan.featured && (
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-[var(--color-info)] text-white rounded-full mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-slate-400">{plan.period}</span>}
                </div>
                <p className="mt-3 text-sm text-slate-400">{plan.desc}</p>

                <Link
                  href={plan.name === 'Enterprise' ? 'mailto:sales@identityradar.io' : '/signup'}
                  className={`mt-6 block w-full py-2.5 text-center text-sm font-medium rounded-[var(--radius-button)] transition-opacity ${
                    plan.featured
                      ? 'bg-[var(--color-info)] text-white hover:opacity-90'
                      : 'border border-white/20 text-white hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="mt-8 space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-slate-400">
                      <Check size={16} className="text-[var(--color-low)] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-slate-950 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-[var(--color-info)] flex items-center justify-center">
                  <Shield size={14} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-white">Identity Radar</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                AI-powered IAM posture management platform.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-[var(--color-low)]" />
                <span className="text-[10px] font-medium text-slate-400">Built for Saudi compliance</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2">
                {['Features', 'Integrations', 'Pricing', 'Changelog', 'Documentation'].map(l => (
                  <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2">
                {['About', 'Blog', 'Careers', 'Contact', 'Partners'].map(l => (
                  <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'DPA', 'Security'].map(l => (
                  <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">2026 Identity Radar. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {['NCA ECC', 'SAMA CSF', 'PDPL'].map(fw => (
                <span key={fw} className="text-[10px] font-medium text-slate-600">{fw}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
