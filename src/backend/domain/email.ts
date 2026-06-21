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
    subject: string
    body: string
    emailColumn: string
    scheduledAt: Date | null
    status: PROCESSING_STATUS_ENUM
    emailErrorType: EMAIL_ERROR_TYPE_ENUM | null
}

export interface CreateEmailInput {
    certificateEmissionId: string
    subject: string
    body: string
    emailColumn: string
    scheduledAt: Date | null
    emailErrorType: EMAIL_ERROR_TYPE_ENUM | null
}

export interface EmailOutput extends EmailInput {}

export class Email extends AggregateRoot {
    private certificateEmissionId: string
    private subject: string
    private body: string
    private emailColumn: string
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

        email.registerDomainEvent(event)

        return email
    }

    private static validateSubject(subject: string): void {
        if (!subject) {
            throw new Error('Email subject is required')
        }
        if (subject.length > 255) {
            throw new Error('Email subject must have at most 255 characters')
        }
    }

    private static validateBody(body: string): void {
        if (!body) {
            throw new Error('Email body is required')
        }
        if (body.length > 800) {
            throw new Error('Email body must have at most 800 characters')
        }
    }

    private static validateEmailColumn(emailColumn: string): void {
        if (!emailColumn) {
            throw new Error('Email column is required')
        }
        if (emailColumn.length > 100) {
            throw new Error('Email column must have at most 100 characters')
        }
    }

    constructor(data: EmailInput) {
        super(data.id)

        if (!data.certificateEmissionId) {
            throw new Error('Email certificateEmissionId is required')
        }

        Email.validateSubject(data.subject)
        Email.validateBody(data.body)
        Email.validateEmailColumn(data.emailColumn)

        if (data.scheduledAt === undefined) {
            throw new Error('Email scheduledAt is required')
        }

        if (!data.status) {
            throw new Error('Email status is required')
        }

        if (data.emailErrorType === undefined) {
            throw new Error('emailErrorType is required')
        }

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

    getEmailColumn() {
        return this.emailColumn!
    }

    getScheduledAt() {
        return this.scheduledAt
    }

    getCertificateEmissionId() {
        return this.certificateEmissionId
    }

    serialize(): EmailOutput {
        return {
            id: this.getId(),
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