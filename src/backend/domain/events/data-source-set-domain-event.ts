import { DomainEvent } from '../primitives/domain-event'

export class DataSourceSetDomainEvent extends DomainEvent {
    readonly dataSourceId: string

    constructor(dataSourceId: string) {
        super('data-source-set-domain-event')

        this.dataSourceId = dataSourceId
    }
}
