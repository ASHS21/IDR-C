'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Eye, EyeOff } from 'lucide-react'

export default function SignupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      if (!session.user.orgId) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)]">
        <div className="text-[var(--text-tertiary)] animate-pulse">Loading...</div>
      </main>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      // Auto sign in after signup
      const result = await signIn('credentials', { email, password, redirect: false })
      setLoading(false)

      if (result?.error) {
        setError('Account created but sign-in failed. Please sign in manually.')
      } else {
        router.push('/onboarding')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-[var(--bg-secondary)]">
      {/* Left panel -- branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-info)] flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Identity Radar</h1>
              <p className="text-sm text-slate-400">IAM Posture Management</p>
            </div>
          </div>
          <h2 className="text-3xl font-semibold text-white leading-tight mb-4">
            Start managing your<br />identity posture today.
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Free tier includes 500 identities, 1 integration source, and 3 team members.
            No credit card required.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'Unified identity model across all IAM sources',
              'AD tiering compliance monitoring',
              'AI-powered risk scoring and remediation',
              'NCA, SAMA, and PDPL compliance reporting',
            ].map(item => (
              <div key={item} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--color-low)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm text-slate-400">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel -- signup form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-info)] flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Identity Radar</h1>
          </div>

          <h2 className="text-title text-[var(--text-primary)] mb-1">Create your account</h2>
          <p className="text-caption text-[var(--text-secondary)] mb-6">
            Get started with the free tier. No credit card required.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:border-transparent placeholder:text-[var(--text-tertiary)]"
                placeholder="Ali Al-Moharif"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:border-transparent placeholder:text-[var(--text-tertiary)]"
                placeholder="you@company.sa"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2.5 pr-10 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:border-transparent placeholder:text-[var(--text-tertiary)]"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-[var(--radius-badge)] text-caption font-medium" style={{ backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[var(--color-info)] text-white rounded-[var(--radius-button)] text-body font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-caption text-[var(--text-secondary)] text-center mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--color-info)] hover:underline font-medium">
              Sign in
            </Link>
          </p>

          <p className="text-micro text-[var(--text-tertiary)] text-center mt-4">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  )
}
