import { DomainEvent } from '../primitives/domain-event'

export class TemplateSetDomainEvent extends DomainEvent {
    private certificateEmissionId: string

    constructor(certificateEmissionId: string) {
        super('template-set-domain-event')

        this.certificateEmissionId = certificateEmissionId
    }

    toPrimitives(): Record<string, any> {
        return {
            certificateEmissionId: this.certificateEmissionId,
        }
    }
}
