import { IEventBus } from '@/backend/application/interfaces/ievent-bus'

type Handler<T> = (event: T) => Promise<void> | void

export class SyncEventBus implements IEventBus {
    private handlers = new Map<string, Handler<any>[]>()

    register<T>(eventName: string, handler: Handler<T>) {
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, [])
        }
        this.handlers.get(eventName)!.push(handler)
    }

    async publish(event: any) {
        const eventName = event.constructor.name
        const handlers = this.handlers.get(eventName) || []

        for (const handler of handlers) {
            await handler(event)
        }
    }
}
