import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { createConnector } from '@/lib/connectors/factory'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { type, credentials } = body

    if (!type || !credentials) {
      return NextResponse.json(
        { ok: false, message: 'Missing type or credentials' },
        { status: 400 }
      )
    }

    const connector = createConnector({ type, credentials })
    const result = await connector.testConnection()

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || 'Connection test failed' },
      { status: 500 }
    )
  }
}
