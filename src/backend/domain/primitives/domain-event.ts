import { randomUUID } from 'crypto'

export abstract class DomainEvent {
    readonly id: string
    readonly name: string
    readonly ocurredOn: Date

    constructor(name: string) {
        this.id = randomUUID()
        this.name = name
        this.ocurredOn = new Date(
            new Date().getTime() - new Date().getTimezoneOffset() * 60000,
        )
    }

    abstract toPrimitives(): Record<string, any>
}
