import { DomainEvent } from '../primitives/domain-event'

export class EmailCreatedDomainEvent extends DomainEvent {
    private certificateEmissionId: string

    constructor(certificateEmissionId: string) {
        super('email-created-domain-event')

        this.certificateEmissionId = certificateEmissionId
    }

    toPrimitives(): Record<string, any> {
        return {
            certificateEmissionId: this.certificateEmissionId,
        }
    }
}
