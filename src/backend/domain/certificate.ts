import { createId } from '@paralleldrive/cuid2'
import { ValidationError } from './error/validation-error'
import { Template } from './template'
import { AggregateRoot } from './primitives/aggregate-root'
import { TemplateAddedDomainEvent } from './events/template-added-domain-event'

interface CertificateInput {
    id: string
    title: string
    template: Template | null
    userId: string
}

interface CreateCertificateInput extends Omit<CertificateInput, 'id'> {}

export class Certificate extends AggregateRoot {
    private id: string
    private title: string
    private template: Template | null
    private userId: string

    constructor(data: CertificateInput) {
        super()

        if (!data.id) {
            throw new ValidationError('ID certificate is required')
        }

        if (!data.title) {
            throw new ValidationError('Name certificate is required')
        }

        if (!data.userId) {
            throw new ValidationError('User ID certificate is required')
        }

        this.id = data.id
        this.title = data.title
        this.template = data.template
        this.userId = data.userId
    }

    static create(data: CreateCertificateInput): Certificate {
        return new Certificate({
            id: createId(),
            ...data,
        })
    }

    getId() {
        return this.id
    }

    getUserId() {
        return this.userId
    }

    getTemplateFileId() {
        return this.template?.getFileId()
    }

    hasTemplate() {
        return this.template !== null
    }

    removeTemplate() {
        this.template = null
    }

    addTemplate(template: Template) {
        this.template = template

        const event = new TemplateAddedDomainEvent(template.getId())
        this.addDomainEvent(event)
    }

    serialize() {
        return {
            id: this.id,
            title: this.title,
            template: this.template ? this.template.serialize() : null,
            userId: this.userId,
            domainEvents: this.getDomainEvents(),
        }
    }
}
