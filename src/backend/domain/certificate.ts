import { createId } from '@paralleldrive/cuid2'
import { AggregateRoot } from './primitives/aggregate-root'
import { CertificateCreatedDomainEvent } from './events/certificate-created-domain-event'
import { Template, TemplateOutput, CreateTemplateInput } from './template'
import { TemplateSetDomainEvent } from './events/template-set-domain-event'
import { FORBIDDEN_ERROR_TYPE, ForbiddenError } from './error/forbidden-error'
import { DomainEvent } from './primitives/domain-event'
import {
    DataSource,
    DataSourceOutput,
    CreateDataSourceInput,
} from './data-source'
import { NOT_FOUND_ERROR_TYPE, NotFoundError } from './error/not-found-error'
import { DataSourceSetDomainEvent } from './events/data-source-set-domain-event'
// import { Email, EmailOutput } from './email'

export enum INPUT_METHOD {
    URL = 'URL',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
    UPLOAD = 'UPLOAD',
}

export enum CERTIFICATE_STATUS {
    DRAFT = 'DRAFT',
    PUBLISHED = 'EMITTED',
    SCHEDULED = 'SCHEDULED',
}

export interface CertificateInput {
    id: string
    name: string
    template: Template | null
    dataSource: DataSource | null
    // email: Email
    status: CERTIFICATE_STATUS
    userId: string
    createdAt: Date
    variableColumnMapping: Record<string, string | null> | null
}

interface CreateCertificateInput {
    name: string
    userId: string
    template?: CreateTemplateInput | null
    dataSource?: CreateDataSourceInput | null
}

interface UpdateCertificateInput
    extends Partial<
        Omit<
            CertificateInput,
            'id' | 'userId' | 'createdAt' | 'status' | 'template' | 'dataSource'
            // | 'email'
        >
    > {}

interface CertificateOutput
    extends Omit<CertificateInput, 'template' | 'dataSource' /*  | 'email' */> {
    template: TemplateOutput | null
    dataSource: DataSourceOutput | null
    // email: EmailOutput
    domainEvents: DomainEvent[]
}

export class Certificate extends AggregateRoot {
    private id: string
    private name: string
    private template: Template | null
    private dataSource: DataSource | null
    // private email: Email
    private status: CERTIFICATE_STATUS
    private userId: string
    private createdAt: Date
    private variableColumnMapping: Record<string, string | null> | null

    static create(data: CreateCertificateInput): Certificate {
        const template = data.template ? new Template(data.template) : null
        const dataSource = data.dataSource
            ? DataSource.create(data.dataSource)
            : null

        const variableColumnMapping = this.mapVariablesToColumns(
            template,
            dataSource,
        )

        const certificateEmissionId = createId()

        // const email = Email.create({
        //     certificateEmissionId,
        //     subject: null,
        //     body: null,
        //     emailColumn: null,
        //     scheduledAt: null,
        //     emailErrorType: null,
        // })

        const certificate = new Certificate({
            id: certificateEmissionId,
            name: data.name,
            userId: data.userId,
            template,
            dataSource,
            // email,
            status: CERTIFICATE_STATUS.DRAFT,
            createdAt: new Date(),
            variableColumnMapping,
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
            throw new Error('Certificate ID is required')
        }

        if (!data.name) {
            throw new Error('Certificate name is required')
        }

        if (!data.userId) {
            throw new Error('Certificate user ID is required')
        }

        if (!data.status) {
            throw new Error('Certificate status is required')
        }

        if (!data.createdAt) {
            throw new Error('Certificate creation date is required')
        }

        this.id = data.id
        this.name = data.name
        this.template = data.template
        this.dataSource = data.dataSource
        this.userId = data.userId
        this.status = data.status
        this.createdAt = data.createdAt
        this.variableColumnMapping = data.variableColumnMapping

        this.validateVariableColumnMapping()
    }

    getId() {
        return this.id
    }

    getUserId() {
        return this.userId
    }

    setStatus(status: CERTIFICATE_STATUS) {
        this.status = status
    }

    update(data: UpdateCertificateInput) {
        if (data.name !== undefined) this.name = data.name
        if (data.variableColumnMapping !== undefined) {
            this.variableColumnMapping = data.variableColumnMapping
            this.validateVariableColumnMapping()
        }
    }

    validateVariableColumnMapping() {
        const templateHasVariable =
            this.template !== null && this.template.getVariables().length > 0

        if (templateHasVariable && !this.variableColumnMapping) {
            throw new Error(
                'Variable-column mapping is required when a template with variables is set',
            )
        }

        if (!this.variableColumnMapping) return

        for (const [mappedVariable, mappedColumn] of Object.entries(
            this.variableColumnMapping,
        )) {
            const variableExistsInTemplate = this.template
                ?.getVariables()
                .some(variable => variable === mappedVariable)

            if (mappedVariable && !variableExistsInTemplate) {
                throw new Error(
                    `Variable "${mappedVariable}" does not exist in the template`,
                )
            }

            const columnExistsInDataSource = this.dataSource
                ?.getColumns()
                .some(column => column.name === mappedColumn)

            if (mappedColumn && !columnExistsInDataSource) {
                throw new Error(
                    `Column "${mappedColumn}" does not exist in the data source`,
                )
            }
        }
    }

    setTemplate(data: CreateTemplateInput) {
        const template = new Template(data)
        this.template = template

        this.variableColumnMapping = Certificate.mapVariablesToColumns(
            template,
            this.dataSource,
            this.variableColumnMapping,
        )

        const domainEvent = new TemplateSetDomainEvent(this.id)

        this.addDomainEvent(domainEvent)
    }

    removeTemplate(userIdTryingToRemove: string) {
        if (this.userId !== userIdTryingToRemove) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (!this.template) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.TEMPLATE)
        }

        this.template = null

        this.variableColumnMapping = null
    }

    hasTemplate() {
        return !!this.template
    }

    getTemplateInputMethod() {
        return this.template?.getInputMethod() ?? null
    }

    getDriveTemplateFileId() {
        return this.template?.getDriveFileId() ?? null
    }

    setTemplateStorageFileUrl(url: string) {
        if (!this.template) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.TEMPLATE)
        }

        this.template.setStorageFileUrl(url)
    }

    setTemplateThumbnailUrl(url: string) {
        if (!this.template) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.TEMPLATE)
        }

        this.template.setThumbnailUrl(url)
    }

    getTemplateStorageFileUrl() {
        return this.template?.getStorageFileUrl() ?? null
    }

    setDataSource(data: CreateDataSourceInput) {
        const dataSource = DataSource.create(data)
        this.dataSource = dataSource

        this.variableColumnMapping = Certificate.mapVariablesToColumns(
            this.template,
            dataSource,
            this.variableColumnMapping,
        )

        const domainEvent = new DataSourceSetDomainEvent(this.id)

        this.addDomainEvent(domainEvent)
    }

    hasDataSource() {
        return !!this.dataSource
    }

    hasDataSourceColumn(columnName: string): boolean {
        return this.dataSource?.hasColumn(columnName) ?? false
    }

    getDataSourceStorageFileUrl() {
        return this.dataSource?.getStorageFileUrl() ?? null
    }

    getDriveDataSourceFileId() {
        return this.dataSource?.getDriveFileId() ?? null
    }

    getDataSourceInputMethod() {
        return this.dataSource?.getInputMethod() ?? null
    }

    getDataSourceColumns() {
        return this.dataSource?.getColumns() ?? []
    }

    setDataSourceStorageFileUrl(url: string) {
        if (!this.dataSource) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        this.dataSource.setStorageFileUrl(url)
    }

    removeDataSource(userIdTryingToRemove: string) {
        if (this.userId !== userIdTryingToRemove) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (!this.dataSource) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        this.dataSource = null

        this.variableColumnMapping = Certificate.mapVariablesToColumns(
            this.template,
            this.dataSource,
        )
    }

    // updateTemplate(data: UpdateTemplateInput) {
    //     if (!this.template) {
    //         throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
    //     }

    //     this.template.update(data)

    //     this.variableColumnMapping = Certificate.mapVariablesToColumns(
    //         this.template,
    //         this.dataSource,
    //         this.variableColumnMapping,
    //     )
    // }

    private static mapVariablesToColumns(
        template: Template | null,
        dataSource: DataSource | null,
        previousMapping?: Record<string, string | null> | null,
    ) {
        const normalizeString = (str: string) => {
            return str
                .normalize('NFD') // separa os acentos das letras
                .replace(/[\u0300-\u036f]/g, '') // remove os acentos
                .replace(/[\s_\-!@#$%^&*()+=\[\]{};:'",.<>?/\\|`~]/g, '') // remove símbolos e espaços
                .toLowerCase() // transforma em minúscula
        }

        if (!template) return null

        const variableColumnMapping: Record<string, string | null> = {}

        const columns = dataSource?.getColumns() || []
        const variables = template?.getVariables() || []

        for (const variable of variables) {
            const previousColumn = previousMapping?.[variable] ?? null

            // If it was mapped before, check if the column still exists in the new data source
            if (previousColumn) {
                const previousColumnStillExists = columns.some(
                    column =>
                        normalizeString(column.name) ===
                        normalizeString(previousColumn),
                )

                const hasAlreadyMapped = Object.values(
                    variableColumnMapping,
                ).some(
                    column =>
                        normalizeString(column || '') ===
                        normalizeString(previousColumn),
                )

                if (previousColumnStillExists && !hasAlreadyMapped) {
                    variableColumnMapping[variable] = previousColumn
                    continue
                }
            }

            const column = variableColumnMapping[variable]

            const hasAlreadyBeenMapped = column
                ? Object.values(variableColumnMapping).some(mappedColumn => {
                      return (
                          normalizeString(column) ===
                          normalizeString(mappedColumn || '')
                      )
                  })
                : false

            const sameNameNotMapped = columns.find(column => {
                return (
                    normalizeString(column.name) ===
                        normalizeString(variable) &&
                    Object.values(variableColumnMapping).every(mappedColumn => {
                        return (
                            normalizeString(mappedColumn || '') !==
                            normalizeString(column.name)
                        )
                    })
                )
            })

            variableColumnMapping[variable] =
                sameNameNotMapped && !hasAlreadyBeenMapped
                    ? sameNameNotMapped.name
                    : null
        }

        return variableColumnMapping
    }

    serialize(): CertificateOutput {
        return {
            id: this.id,
            name: this.name,
            template: this.template?.serialize() ?? null,
            dataSource: this.dataSource?.serialize() ?? null,
            // email: this.email.serialize(),
            status: this.status,
            createdAt: this.createdAt,
            userId: this.userId,
            domainEvents: this.getDomainEvents(),
            variableColumnMapping: this.variableColumnMapping,
        }
    }
}
