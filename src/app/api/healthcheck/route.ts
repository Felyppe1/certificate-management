import { getPostgresListener } from '@/backend/infrastructure/listener/pg'
import { NextResponse } from 'next/server'

getPostgresListener()

export async function GET() {
    return NextResponse.json({ status: 'ok' })
}
