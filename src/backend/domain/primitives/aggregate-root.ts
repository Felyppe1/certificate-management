import { DomainEvent } from './domain-event'
import { Entity } from './entity'

export abstract class AggregateRoot extends Entity {
    private domainEvents: DomainEvent[] = []

    getDomainEvents() {
        return [...this.domainEvents]
    }

    protected registerDomainEvent(domainEvent: DomainEvent) {
        this.domainEvents.push(domainEvent)
    }

    pullDomainEvents(): DomainEvent[] {
        const events = [...this.domainEvents]
        this.domainEvents = []
        return events
    }
}
