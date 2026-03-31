import { DomainEvent } from '../primitives/domain-event'

export class TemplateSetDomainEvent extends DomainEvent {
    readonly templateId: string

    constructor(templateId: string) {
        super('template-set-domain-event')

        this.templateId = templateId
    }
}
