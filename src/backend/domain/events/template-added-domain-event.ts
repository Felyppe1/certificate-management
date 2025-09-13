import { DomainEvent } from '../primitives/domain-event'

export class TemplateAddedDomainEvent extends DomainEvent {
    private templateId: string

    constructor(templateId: string) {
        super('template-added-domain-event')

        this.templateId = templateId
    }

    toPrimitives(): Record<string, any> {
        return {
            templateId: this.templateId,
        }
    }
}
