import Link from 'next/link'
import { Shield, Check } from 'lucide-react'

const TIERS = [
  {
    name: 'Free',
    price: '0',
    description: 'For small teams getting started with IAM visibility',
    features: ['Up to 500 identities', '1 integration source', '3 team members', '5 AI analyses/month', '30-day data retention', 'CSV export', 'Community support'],
    cta: 'Start Free',
    href: '/onboarding',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '499',
    description: 'For growing organizations with complex IAM requirements',
    features: ['Up to 10,000 identities', '5 integration sources', '15 team members', '50 AI analyses/month', '1-year data retention', 'CSV + PDF export', 'Read-only API access', 'Custom logo', 'Email support'],
    cta: 'Start Trial',
    href: '/onboarding',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large enterprises with full IAM posture management needs',
    features: ['Unlimited identities', 'Unlimited integrations', 'Unlimited team members', 'Unlimited AI analyses', '3-year data retention', 'Full API access', 'SAML/OIDC SSO', 'White-label branding', 'Dedicated support', 'SLA guarantee'],
    cta: 'Contact Sales',
    href: 'mailto:sales@identityradar.io',
    highlighted: false,
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border-default)] bg-[var(--bg-primary)]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-info)] flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="text-body font-semibold text-[var(--text-primary)]">Identity Radar</span>
          </Link>
          <Link href="/" className="text-caption text-[var(--color-info)] hover:underline">
            ← Back to home
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-hero text-[var(--text-primary)] mb-3">Pricing</h1>
          <p className="text-heading text-[var(--text-secondary)]">
            Choose the plan that fits your organization&apos;s IAM needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map(tier => (
            <div
              key={tier.name}
              className={`rounded-[var(--radius-card)] border p-6 ${
                tier.highlighted
                  ? 'border-[var(--color-info)] bg-[var(--bg-primary)] ring-2 ring-[var(--color-info)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-primary)]'
              }`}
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              {tier.highlighted && (
                <span className="inline-block px-2.5 py-1 text-micro font-medium bg-[var(--color-info)] text-white rounded-[var(--radius-badge)] mb-3">
                  Most Popular
                </span>
              )}
              <h3 className="text-heading font-semibold text-[var(--text-primary)]">{tier.name}</h3>
              <div className="mt-2 mb-3">
                {tier.price === 'Custom' ? (
                  <span className="text-title text-[var(--text-primary)]">Custom</span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-hero text-[var(--text-primary)]">${tier.price}</span>
                    <span className="text-caption text-[var(--text-tertiary)]">/month</span>
                  </div>
                )}
              </div>
              <p className="text-caption text-[var(--text-secondary)] mb-6">{tier.description}</p>

              <Link
                href={tier.href}
                className={`block text-center py-2.5 rounded-[var(--radius-button)] text-body font-medium transition-opacity hover:opacity-90 ${
                  tier.highlighted
                    ? 'bg-[var(--color-info)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                }`}
              >
                {tier.cta}
              </Link>

              <ul className="mt-6 space-y-2.5">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-caption text-[var(--text-secondary)]">
                    <Check size={14} className="mt-0.5 text-[var(--color-low)] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
