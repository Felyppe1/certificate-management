import { createId } from '@paralleldrive/cuid2'

export enum EMAIL_ERROR_TYPE_ENUM {
    DELETED_EMAIL_COLUMN = 'DELETED_EMAIL_COLUMN',
    INVALID_EMAILS = 'INVALID_EMAILS',
    UNMAPPED_VARIABLES = 'UNMAPPED_VARIABLES',
}

export interface EmailInput {
    id: string
    subject: string | null
    body: string | null
    emailColumn: string | null
    emailErrorType: EMAIL_ERROR_TYPE_ENUM | null
}

export interface CreateEmailInput {
    subject: string | null
    body: string | null
    emailColumn: string | null
    emailErrorType: EMAIL_ERROR_TYPE_ENUM | null
}

export interface EmailOutput extends EmailInput {}

export class Email {
    private id: string
    private subject: string | null
    private body: string | null
    private emailColumn: string | null
    private emailErrorType: EMAIL_ERROR_TYPE_ENUM | null

    static create(data: CreateEmailInput) {
        return new Email({
            ...data,
            id: createId(),
        })
    }

    constructor(data: EmailInput) {
        if (!data.id) {
            throw new Error('Email id is required')
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

        if (data.emailErrorType === undefined) {
            throw new Error('emailErrorType is required')
        }

        this.id = data.id
        this.subject = data.subject
        this.body = data.body
        this.emailColumn = data.emailColumn
        this.emailErrorType = data.emailErrorType
    }

    setEmailColumn(emailColumn: string) {}

    serialize(): EmailOutput {
        return {
            id: this.id,
            subject: this.subject,
            body: this.body,
            emailColumn: this.emailColumn,
            emailErrorType: this.emailErrorType,
        }
    }
}
