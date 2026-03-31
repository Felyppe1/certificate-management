import { DomainEvent } from '../primitives/domain-event'

export class CertificateCreatedDomainEvent extends DomainEvent {
    readonly certificateId: string

    constructor(certificateId: string) {
        super('certificate-created-domain-event')

        this.certificateId = certificateId
    }
}
