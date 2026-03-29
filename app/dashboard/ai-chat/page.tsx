'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Brain, Loader2, Trash2, MessageSquare, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  data?: any
  suggestedActions?: string[]
  followUpQuestions?: string[]
}

interface ChatSession {
  id: string
  title: string
  createdAt: string
}

const SUGGESTED_QUERIES = [
  'Who has Domain Admin access but hasn\'t logged in this month?',
  'Show me all orphaned service accounts',
  'Which identities have tier violations?',
  'How many identities are dormant?',
  'List all Tier 0 identities',
  'What are the top 5 riskiest identities?',
  'Show identities with missing MFA',
  'Which NHIs have no owner assigned?',
]

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function fetchSessions() {
    try {
      const res = await fetch('/api/ai/chat/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch {}
  }

  async function loadSession(id: string) {
    try {
      const res = await fetch(`/api/ai/chat/sessions/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSessionId(id)
        setMessages(data.session?.messages || [])
        setShowSessions(false)
      }
    } catch {}
  }

  async function deleteSession(id: string) {
    try {
      await fetch(`/api/ai/chat/sessions/${id}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== id))
      if (sessionId === id) {
        setSessionId(null)
        setMessages([])
      }
    } catch {}
  }

  function handleNewChat() {
    setSessionId(null)
    setMessages([])
    setShowSessions(false)
    inputRef.current?.focus()
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      })

      if (!res.ok) throw new Error('Chat failed')
      const data = await res.json()

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId)
        fetchSessions()
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response?.answer || data.response || 'I couldn\'t process that request.',
        timestamp: new Date().toISOString(),
        data: data.response?.data,
        suggestedActions: data.response?.suggestedActions,
        followUpQuestions: data.response?.followUpQuestions,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Sidebar — session history */}
      <div className="w-64 shrink-0 flex flex-col rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-primary)' }}>
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-xs font-semibold text-[var(--text-primary)]">Chat History</span>
          <button
            onClick={handleNewChat}
            className="text-xs px-2 py-1 rounded font-medium"
            style={{ backgroundColor: 'var(--color-info)', color: 'white' }}
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="p-3 text-xs text-[var(--text-tertiary)]">No previous chats</p>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                className={`flex items-center justify-between p-2 mx-1 my-0.5 rounded cursor-pointer text-xs group ${sessionId === s.id ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-secondary)]'}`}
                onClick={() => loadSession(s.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3 h-3 shrink-0 text-[var(--text-tertiary)]" />
                  <span className="truncate text-[var(--text-secondary)]">{s.title}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-tertiary)]"
                >
                  <Trash2 className="w-3 h-3 text-[var(--text-tertiary)]" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-default)' }}>
          <Brain className="w-5 h-5 text-[var(--color-info)]" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Security Analyst</h2>
            <p className="text-[10px] text-[var(--text-tertiary)]">Ask anything about your IAM posture — identities, tiers, violations, risk</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <Sparkles className="w-8 h-8 text-[var(--color-info)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">Ask me anything about your identities</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">I can query your data, explain risks, and suggest remediations</p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {SUGGESTED_QUERIES.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(q); inputRef.current?.focus() }}
                    className="text-start px-3 py-2 rounded-lg border text-xs transition-colors hover:border-[var(--color-info)]"
                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                  style={{
                    backgroundColor: msg.role === 'user' ? 'var(--color-info)' : 'var(--bg-secondary)',
                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                  }}
                >
                  <p className="text-xs whitespace-pre-wrap">{msg.content}</p>

                  {/* Inline data results */}
                  {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.data.slice(0, 5).map((item: any, j: number) => (
                        <Link
                          key={j}
                          href={`/dashboard/identities/${item.id || ''}`}
                          className="flex items-center justify-between p-2 rounded text-[10px] hover:opacity-80"
                          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        >
                          <span className="font-medium">{item.displayName || item.name || 'Unknown'}</span>
                          <div className="flex items-center gap-2">
                            {item.adTier && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: 'var(--bg-tertiary)' }}>{item.adTier}</span>}
                            {item.riskScore != null && <span className="font-mono">{item.riskScore}</span>}
                          </div>
                        </Link>
                      ))}
                      {msg.data.length > 5 && (
                        <p className="text-[10px] opacity-70">...and {msg.data.length - 5} more</p>
                      )}
                    </div>
                  )}

                  {/* Follow-up questions */}
                  {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.followUpQuestions.map((q: string, j: number) => (
                        <button
                          key={j}
                          onClick={() => { setInput(q); inputRef.current?.focus() }}
                          className="px-2 py-1 rounded text-[10px] font-medium"
                          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--color-info)' }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] mt-1 opacity-50">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 rounded-bl-sm flex items-center gap-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <Loader2 className="w-3 h-3 animate-spin text-[var(--color-info)]" />
                <span className="text-xs text-[var(--text-tertiary)]">Analyzing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about identities, tiers, violations, risk..."
              rows={1}
              className="flex-1 px-3 py-2 border rounded-lg text-xs resize-none"
              style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-info)' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
