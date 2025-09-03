import { DomainEvent } from './domain-event'

export abstract class AggregateRoot {
    private readonly domainEvents: DomainEvent[] = []

    getDomainEvents() {
        return [...this.domainEvents]
    }

    protected addDomainEvent(domainEvent: DomainEvent) {
        this.domainEvents.push(domainEvent)
    }
}
