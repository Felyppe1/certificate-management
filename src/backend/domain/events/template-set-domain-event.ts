import { DomainEvent } from '../primitives/domain-event'

export class TemplateSetDomainEvent extends DomainEvent {
    private templateId: string

    constructor(templateId: string) {
        super('template-set-domain-event')

        this.templateId = templateId
    }

    toPrimitives(): Record<string, any> {
        return {
            templateId: this.templateId,
        }
    }
}
