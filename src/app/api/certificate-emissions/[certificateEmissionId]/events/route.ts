import { sseBroker } from '@/backend/infrastructure/sse'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<Response> {
    const certificateEmissionId = (await params).certificateEmissionId

    let clientId: string | null = null

    const stream = new ReadableStream({
        start(controller) {
            clientId = sseBroker.addClient(certificateEmissionId, controller)

            // Initial message to confirm connection
            controller.enqueue(
                `data: ${JSON.stringify({ connected: true })}\n\n`,
            )
        },
        cancel() {
            console.log('SSE Client disconnected:', clientId)
            if (clientId) {
                sseBroker.removeClient(certificateEmissionId, clientId)
            }
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    })
}
