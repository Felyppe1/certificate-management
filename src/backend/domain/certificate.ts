import { createId } from '@paralleldrive/cuid2'
import { AggregateRoot } from './primitives/aggregate-root'
import { CertificateCreatedDomainEvent } from './events/certificate-created-domain-event'
import {
    Template,
    TemplateOutput,
    CreateTemplateInput,
    UpdateTemplateInput,
} from './template'
import { TemplateSetDomainEvent } from './events/template-set-domain-event'
import { FORBIDDEN_ERROR_TYPE, ForbiddenError } from './error/forbidden-error'
import { DomainEvent } from './primitives/domain-event'
import {
    DataSource,
    DataSourceOutput,
    CreateDataSourceInput,
    UpdateDataSourceInput,
} from './data-source'
import { NOT_FOUND_ERROR_TYPE, NotFoundError } from './error/not-found-error'
import { DataSourceSetDomainEvent } from './events/data-source-set-domain-event'

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
        >
    > {}

interface CertificateOutput
    extends Omit<CertificateInput, 'template' | 'dataSource'> {
    template: TemplateOutput | null
    dataSource: DataSourceOutput | null
    domainEvents: DomainEvent[]
}

export class Certificate extends AggregateRoot {
    private id: string
    private name: string
    private template: Template | null
    private dataSource: DataSource | null
    private status: CERTIFICATE_STATUS
    private userId: string
    private createdAt: Date
    private variableColumnMapping: Record<string, string | null> | null

    static create(data: CreateCertificateInput): Certificate {
        const template = data.template ? Template.create(data.template) : null
        const dataSource = data.dataSource
            ? DataSource.create(data.dataSource)
            : null

        const variableColumnMapping = Certificate.mapVariablesToColumns(
            template,
            dataSource,
        )

        const certificate = new Certificate({
            id: createId(),
            name: data.name,
            userId: data.userId,
            template,
            dataSource,
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
                .some(column => column === mappedColumn)

            if (mappedColumn && !columnExistsInDataSource) {
                throw new Error(
                    `Column "${mappedColumn}" does not exist in the data source`,
                )
            }
        }
    }

    setTemplate(data: CreateTemplateInput) {
        const template = Template.create(data)
        this.template = template

        this.variableColumnMapping = Certificate.mapVariablesToColumns(
            template,
            this.dataSource,
            this.variableColumnMapping,
        )

        const domainEvent = new TemplateSetDomainEvent(template.getId())

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

    getTemplateId() {
        return this.template?.getId() ?? null
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

        const domainEvent = new DataSourceSetDomainEvent(dataSource.getId())

        this.addDomainEvent(domainEvent)
    }

    getDataSourceId() {
        return this.dataSource?.getId() ?? null
    }

    hasDataSource() {
        return !!this.dataSource
    }

    getDataSourceStorageFileUrl() {
        return this.dataSource?.getStorageFileUrl() ?? null
    }

    getDriveDataSourceFileId() {
        return this.dataSource?.getDriveFileId() ?? null
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

    updateDataSource(data: UpdateDataSourceInput) {
        if (!this.dataSource) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        this.dataSource.update(data)

        this.variableColumnMapping = Certificate.mapVariablesToColumns(
            this.template,
            this.dataSource,
            this.variableColumnMapping,
        )
    }

    updateTemplate(data: UpdateTemplateInput) {
        if (!this.template) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        this.template.update(data)

        this.variableColumnMapping = Certificate.mapVariablesToColumns(
            this.template,
            this.dataSource,
            this.variableColumnMapping,
        )
    }

    static mapVariablesToColumns(
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
                        normalizeString(column) ===
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
                    normalizeString(column) === normalizeString(variable) &&
                    Object.values(variableColumnMapping).every(mappedColumn => {
                        return (
                            normalizeString(mappedColumn || '') !==
                            normalizeString(column)
                        )
                    })
                )
            })

            variableColumnMapping[variable] =
                sameNameNotMapped && !hasAlreadyBeenMapped
                    ? sameNameNotMapped
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
            status: this.status,
            createdAt: this.createdAt,
            userId: this.userId,
            domainEvents: this.getDomainEvents(),
            variableColumnMapping: this.variableColumnMapping,
        }
    }
}
