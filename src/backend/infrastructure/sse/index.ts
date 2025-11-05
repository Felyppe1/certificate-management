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
