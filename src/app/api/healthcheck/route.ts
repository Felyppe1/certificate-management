import { NextResponse } from 'next/server'

export interface HealthcheckControllerResponse {
    status: 'ok'
}

export async function GET(): Promise<
    NextResponse<HealthcheckControllerResponse>
> {
    return NextResponse.json({ status: 'ok' })
}
