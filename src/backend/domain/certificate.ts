import { createId } from '@paralleldrive/cuid2'
import { ValidationError } from './error/validation-error'
import { AggregateRoot } from './primitives/aggregate-root'
import { CertificateCreatedDomainEvent } from './events/certificate-created-domain-event'
import { Template } from './template'
import { TemplateSetDomainEvent } from './events/template-set-domain-event'

export enum CERTIFICATE_STATUS {
    DRAFT = 'DRAFT',
    PUBLISHED = 'EMITTED',
    SCHEDULED = 'SCHEDULED',
}

interface CertificateInput {
    id: string
    name: string
    template: Template | null
    status: CERTIFICATE_STATUS
    userId: string
    createdAt: Date
}

interface CreateCertificateInput
    extends Omit<CertificateInput, 'id' | 'status' | 'createdAt'> {}

export class Certificate extends AggregateRoot {
    private id: string
    private name: string
    private template: Template | null
    private status: CERTIFICATE_STATUS
    private userId: string
    private createdAt: Date

    static create(data: CreateCertificateInput): Certificate {
        const certificate = new Certificate({
            id: createId(),
            ...data,
            status: CERTIFICATE_STATUS.DRAFT,
            createdAt: new Date(),
        })

        const domainEvent = new CertificateCreatedDomainEvent(
            certificate.getId(),
        )

        certificate.addDomainEvent(domainEvent)

        return certificate
    }

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

        if (!data.status) {
            throw new ValidationError('Certificate status is required')
        }

        if (!data.createdAt) {
            throw new ValidationError('Certificate creation date is required')
        }

        this.id = data.id
        this.name = data.name
        this.template = data.template ?? null
        this.userId = data.userId
        this.status = data.status
        this.createdAt = data.createdAt
    }

    getId() {
        return this.id
    }

    getUserId() {
        return this.userId
    }

    setTemplate(template: Template) {
        this.template = template

        const domainEvent = new TemplateSetDomainEvent(template.getId())

        this.addDomainEvent(domainEvent)
    }

    removeTemplate() {
        this.template = null
    }

    hasTemplate() {
        return !!this.template
    }

    getDriveTemplateFileId() {
        return this.template?.getDriveFileId()
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            template: this.template?.serialize() ?? null,
            status: this.status,
            createdAt: this.createdAt,
            userId: this.userId,
            domainEvents: this.getDomainEvents(),
        }
    }
}
