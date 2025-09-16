import { createId } from '@paralleldrive/cuid2'
import { ValidationError } from './error/validation-error'
import { AggregateRoot } from './primitives/aggregate-root'
import { CertificateCreatedDomainEvent } from './events/certificate-created-domain-event'
import { Template } from './template'

interface CertificateInput {
    id: string
    name: string
    template: Template | null
    userId: string
}

interface CreateCertificateInput extends Omit<CertificateInput, 'id'> {}

export class Certificate extends AggregateRoot {
    private id: string
    private name: string
    private template: Template | null
    private userId: string

    constructor(data: CertificateInput) {
        super()

        if (!data.id) {
            throw new ValidationError('Certificate ID is required')
        }

        if (!data.name) {
            throw new ValidationError('Certificate name is required')
        }

        if (!data.userId) {
            throw new ValidationError('Certificate user ID is required')
        }

        this.id = data.id
        this.name = data.name
        this.template = data.template ?? null
        this.userId = data.userId
    }

    static create(data: CreateCertificateInput): Certificate {
        const certificate = new Certificate({
            id: createId(),
            ...data,
        })

        const domainEvent = new CertificateCreatedDomainEvent(
            certificate.getId(),
        )

        certificate.addDomainEvent(domainEvent)

        return certificate
    }

    getId() {
        return this.id
    }

    getUserId() {
        return this.userId
    }

    addTemplate(template: Template) {
        this.template = template
    }

    getDriveFileId() {
        return this.template?.getDriveFileId()
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            template: this.template?.serialize(),
            userId: this.userId,
            domainEvents: this.getDomainEvents(),
        }
    }
}
