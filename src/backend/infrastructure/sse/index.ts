type Client = {
    id: string
    controller: ReadableStreamDefaultController
}

class SSEBroker {
    private clients: Map<string, Client[]> = new Map()

    addClient(resourceId: string, controller: ReadableStreamDefaultController) {
        const client = { id: crypto.randomUUID(), controller }

        console.log(Array.from(this.clients.entries()))

        if (!this.clients.has(resourceId)) {
            this.clients.set(resourceId, [])
        }

        this.clients.get(resourceId)!.push(client)

        console.log(Array.from(this.clients.entries()))

        return client.id
    }

    removeClient(resourceId: string, clientId: string) {
        const list = this.clients.get(resourceId)
        if (!list) return

        this.clients.set(
            resourceId,
            list.filter(c => c.id !== clientId),
        )
    }

    sendEvent(resourceId: string, data: any) {
        const list = this.clients.get(resourceId)
        if (!list) return

        const payload = `data: ${JSON.stringify(data)}\n\n`

        list.forEach(client => {
            try {
                console.log('SEND')

                client.controller.enqueue(payload)
            } catch {
                this.removeClient(resourceId, client.id)
            }
        })
    }
}

export const sseBroker = new SSEBroker()

// interface Observer {
//     update(subject: Subject): void
// }

// interface Subject {
//     subscribe(observer: Observer): void
//     unsubscribe(observer: Observer): void
//     notify(): void
// }
// type SSEClient = {
//     id: string
//     controller: ReadableStreamDefaultController
// }

// class SSESubject implements Subject {
//     private observers: Observer[] = []
//     private clients: Map<string, SSEClient[]> = new Map()

//     subscribe(observer: Observer): void {
//         this.observers.push(observer)
//     }

//     unsubscribe(observer: Observer): void {
//         this.observers = this.observers.filter(o => o !== observer)
//     }

//     notify(): void {
//         this.observers.forEach(o => o.update(this))
//     }

//     addClient(dataSetId: string, controller: ReadableStreamDefaultController) {
//         const client = { id: crypto.randomUUID(), controller }

//         if (!this.clients.has(dataSetId)) {
//             this.clients.set(dataSetId, [])
//         }

//         this.clients.get(dataSetId)!.push(client)

//         return client.id
//     }

//     removeClient(dataSetId: string, clientId: string) {
//         const list = this.clients.get(dataSetId)
//         if (!list) return
//         this.clients.set(
//             dataSetId,
//             list.filter(c => c.id !== clientId),
//         )
//     }

//     sendEvent(dataSetId: string, data: any) {
//         const list = this.clients.get(dataSetId)
//         if (!list) return
//         const payload = `data: ${JSON.stringify(data)}\n\n`
//         list.forEach(client => {
//             try {
//                 client.controller.enqueue(payload)
//             } catch {
//                 this.removeClient(dataSetId, client.id)
//             }
//         })
//     }
// }

// class SSEObserver implements Observer {
//     update(data: any): void {
//         console.log('Received data:', data)
//     }
// }
