import { createId } from '@paralleldrive/cuid2'
import { ValidationError } from './error/validation-error'
import { AggregateRoot } from './primitives/aggregate-root'

interface CertificateInput {
    id: string
    name: string
    templateId: string
    // userId: string
}

interface CreateCertificateInput extends Omit<CertificateInput, 'id'> {}

export class Certificate extends AggregateRoot {
    private id: string
    private name: string
    private templateId: string
    // private userId: string

    constructor(data: CertificateInput) {
        super()

        if (!data.id) {
            throw new ValidationError('Certificate ID is required')
        }

        if (!data.name) {
            throw new ValidationError('Certificate name is required')
        }

        // if (!data.userId) {
        //     throw new ValidationError('Certificate user ID is required')
        // }

        if (!data.templateId) {
            throw new ValidationError('Certificate template ID is required')
        }

        this.id = data.id
        this.name = data.name
        this.templateId = data.templateId
        // this.userId = data.userId
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

    // getUserId() {
    //     return this.userId
    // }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            templateId: this.templateId,
            // userId: this.userId,
            domainEvents: this.getDomainEvents(),
        }
    }
}
