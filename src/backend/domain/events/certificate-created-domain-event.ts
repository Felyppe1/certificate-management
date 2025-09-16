import { DomainEvent } from '../primitives/domain-event'

export class CertificateCreatedDomainEvent extends DomainEvent {
    private certificateId: string

    constructor(certificateId: string) {
        super('certificate-creeated-domain-event')

        this.certificateId = certificateId
    }

    toPrimitives() {
        return {
            certificateId: this.certificateId,
        }
    }
}
