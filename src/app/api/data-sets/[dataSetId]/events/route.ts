import { sseBroker } from '@/backend/infrastructure/sse'
import { NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ dataSetId: string }> },
) {
    const dataSetId = (await params).dataSetId

    let clientId: string | null = null

    const stream = new ReadableStream({
        start(controller) {
            clientId = sseBroker.addClient(dataSetId, controller)

            // Initial message to confirm connection
            controller.enqueue(
                `data: ${JSON.stringify({ connected: true })}\n\n`,
            )

            // Avoid connection timeouts
            // const keepAlive = setInterval(() => {
            //     // Lines starting with ':' are treated as comments and ignored by EventSource clients (pattern by W3C SSE Spec)
            //     // SSE format is always: <field>:<value>\n\n
            //     controller.enqueue(': keep-alive\n\n')
            // }, 10000)
        },
        cancel() {
            console.log('Cliente SSE desconectado', clientId)
            if (clientId) {
                sseBroker.removeClient(dataSetId, clientId)
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
