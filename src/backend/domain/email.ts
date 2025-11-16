import { createId } from '@paralleldrive/cuid2'
import z from 'zod'
import { AggregateRoot } from './primitives/aggregate-root'
import { EmailCreatedDomainEvent } from './events/email-created-domain-event'

export enum PROCESSING_STATUS_ENUM {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

export enum EMAIL_ERROR_TYPE_ENUM {
    DELETED_EMAIL_COLUMN = 'DELETED_EMAIL_COLUMN',
    INVALID_EMAILS = 'INVALID_EMAILS',
    UNMAPPED_VARIABLES = 'UNMAPPED_VARIABLES',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface EmailInput {
    id: string
    certificateEmissionId: string
    subject: string | null
    body: string | null
    emailColumn: string | null
    scheduledAt: Date | null
    status: PROCESSING_STATUS_ENUM
    emailErrorType: EMAIL_ERROR_TYPE_ENUM | null
}

export interface CreateEmailInput {
    certificateEmissionId: string
    subject: string | null
    body: string | null
    emailColumn: string | null
    scheduledAt: Date | null
    emailErrorType: EMAIL_ERROR_TYPE_ENUM | null
}

export interface EmailOutput extends EmailInput {}

export class Email extends AggregateRoot {
    private id: string
    private certificateEmissionId: string
    private subject: string | null
    private body: string | null
    private emailColumn: string | null
    private scheduledAt: Date | null
    private status: PROCESSING_STATUS_ENUM
    private emailErrorType: EMAIL_ERROR_TYPE_ENUM | null

    static create(data: CreateEmailInput) {
        const email = new Email({
            ...data,
            status: PROCESSING_STATUS_ENUM.PENDING,
            id: createId(),
        })

        const event = new EmailCreatedDomainEvent(data.certificateEmissionId)

        email.addDomainEvent(event)

        return email
    }

    constructor(data: EmailInput) {
        super()

        if (!data.id) {
            throw new Error('Email id is required')
        }

        if (!data.certificateEmissionId) {
            throw new Error('Email certificateEmissionId is required')
        }

        if (data.subject === undefined) {
            throw new Error('Email subject is required')
        }

        if (data.body === undefined) {
            throw new Error('Email body is required')
        }

        if (data.emailColumn === undefined) {
            throw new Error('Email column is required')
        }

        if (data.scheduledAt === undefined) {
            throw new Error('Email scheduledAt is required')
        }

        if (!data.status) {
            throw new Error('Email status is required')
        }

        if (data.emailErrorType === undefined) {
            throw new Error('emailErrorType is required')
        }

        this.id = data.id
        this.certificateEmissionId = data.certificateEmissionId
        this.subject = data.subject
        this.body = data.body
        this.emailColumn = data.emailColumn
        this.scheduledAt = data.scheduledAt
        this.status = data.status
        this.emailErrorType = data.emailErrorType
    }

    static validateEmailColumnRecords(emailColumnRecords: string[]): boolean {
        const schema = z.email()

        for (const email of emailColumnRecords) {
            const isValid = schema.safeParse(email)
            if (!isValid.success) {
                return false
            }
        }

        return true
    }

    setProcessingStatus(status: PROCESSING_STATUS_ENUM) {
        this.status = status
    }

    setEmailErrorType(errorType: EMAIL_ERROR_TYPE_ENUM | null) {
        this.emailErrorType = errorType
    }

    getScheduledAt() {
        return this.scheduledAt
    }

    getId() {
        return this.id
    }

    getCertificateEmissionId() {
        return this.certificateEmissionId
    }

    serialize(): EmailOutput {
        return {
            id: this.id,
            certificateEmissionId: this.certificateEmissionId,
            subject: this.subject,
            body: this.body,
            emailColumn: this.emailColumn,
            scheduledAt: this.scheduledAt,
            status: this.status,
            emailErrorType: this.emailErrorType,
        }
    }
}
