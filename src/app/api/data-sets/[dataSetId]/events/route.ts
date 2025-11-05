import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest } from 'next/server'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'
import z from 'zod'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GetDataSetUseCase } from '@/backend/application/get-data-set-use-case'

type Client = {
    id: string
    controller: ReadableStreamDefaultController
}

class SSEBroker {
    private clients: Map<string, Client[]> = new Map()

    addClient(dataSetId: string, controller: ReadableStreamDefaultController) {
        console.log('ADD')

        const client = { id: crypto.randomUUID(), controller }

        console.log(Array.from(this.clients.entries()))

        if (!this.clients.has(dataSetId)) {
            this.clients.set(dataSetId, [])
        }

        this.clients.get(dataSetId)!.push(client)

        console.log(Array.from(this.clients.entries()))

        return client.id
    }

    removeClient(dataSetId: string, clientId: string) {
        const list = this.clients.get(dataSetId)
        if (!list) return

        this.clients.set(
            dataSetId,
            list.filter(c => c.id !== clientId),
        )
    }

    sendEvent(dataSetId: string, data: any) {
        const list = this.clients.get(dataSetId)
        console.log('SEND EVENT LIST', list)
        if (!list) return

        const payload = `data: ${JSON.stringify(data)}\n\n`

        list.forEach(client => {
            try {
                console.log('SEND')

                client.controller.enqueue(payload)
            } catch {
                this.removeClient(dataSetId, client.id)
            }
        })
    }
}

export const sseBroker = new SSEBroker()

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
