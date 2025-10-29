import { DomainEvent } from '../primitives/domain-event'

export class DataSourceSetDomainEvent extends DomainEvent {
    private dataSourceId: string

    constructor(dataSourceId: string) {
        super('data-source-set-domain-event')

        this.dataSourceId = dataSourceId
    }

    toPrimitives(): Record<string, any> {
        return {
            dataSourceId: this.dataSourceId,
        }
    }
}
