import { createId } from '@paralleldrive/cuid2'
import { ValidationError } from './error/validation-error'
import { AggregateRoot } from './primitives/aggregate-root'
import { CertificateCreatedDomainEvent } from './events/certificate-created-domain-event'
import { Template, TemplateOutput } from './template'
import { TemplateSetDomainEvent } from './events/template-set-domain-event'
import { ForbiddenError } from './error/forbidden-error'
import { DomainEvent } from './primitives/domain-event'
import {
    DataSource,
    DataSourceOutput,
    UpdateDataSourceInput,
} from './data-source'

export enum CERTIFICATE_STATUS {
    DRAFT = 'DRAFT',
    PUBLISHED = 'EMITTED',
    SCHEDULED = 'SCHEDULED',
}

interface CertificateInput {
    id: string
    name: string
    template: Template | null
    dataSource: DataSource | null
    status: CERTIFICATE_STATUS
    userId: string
    createdAt: Date
    variableColumnMapping: Record<string, string | null> | null
}

interface CreateCertificateInput
    extends Omit<
        CertificateInput,
        'id' | 'status' | 'createdAt' | 'variableColumnMapping'
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
        const variableColumnMapping = Certificate.mapVariablesToColumns(
            data.template,
            data.dataSource,
        )

        const certificate = new Certificate({
            id: createId(),
            ...data,
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
        this.template = data.template
        this.dataSource = data.dataSource
        this.userId = data.userId
        this.status = data.status
        this.createdAt = data.createdAt
        this.variableColumnMapping = data.variableColumnMapping
    }

    getId() {
        return this.id
    }

    getUserId() {
        return this.userId
    }

    setTemplate(template: Template) {
        this.template = template

        this.variableColumnMapping = Certificate.mapVariablesToColumns(
            template,
            this.dataSource,
        )

        const domainEvent = new TemplateSetDomainEvent(template.getId())

        this.addDomainEvent(domainEvent)
    }

    removeTemplate(userIdTryingToRemove: string) {
        if (this.userId !== userIdTryingToRemove) {
            throw new ForbiddenError(
                'Only the owner of the certificate can remove the template',
            )
        }

        if (!this.template) {
            throw new ValidationError('Certificate does not have a template')
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
            throw new ValidationError('Certificate does not have a template')
        }

        this.template.setStorageFileUrl(url)
    }

    setTemplateThumbnailUrl(url: string) {
        if (!this.template) {
            throw new ValidationError('Certificate does not have a template')
        }

        this.template.setThumbnailUrl(url)
    }

    getTemplateStorageFileUrl() {
        return this.template?.getStorageFileUrl() ?? null
    }

    setDataSource(dataSource: DataSource) {
        this.dataSource = dataSource

        this.variableColumnMapping = Certificate.mapVariablesToColumns(
            this.template,
            dataSource,
        )
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
            throw new ValidationError('Certificate does not have a data source')
        }

        this.dataSource.setStorageFileUrl(url)
    }

    removeDataSource(userIdTryingToRemove: string) {
        if (this.userId !== userIdTryingToRemove) {
            throw new ForbiddenError(
                'Only the owner of the certificate can remove the data source',
            )
        }

        if (!this.dataSource) {
            throw new ValidationError('Certificate does not have a data source')
        }

        this.dataSource = null

        this.variableColumnMapping = Certificate.mapVariablesToColumns(
            this.template,
            this.dataSource,
        )
    }

    updateDataSource(data: UpdateDataSourceInput) {
        if (!this.dataSource) {
            throw new ValidationError('Certificate does not have a data source')
        }

        this.dataSource.update(data)
    }

    static mapVariablesToColumns(
        template: Template | null,
        dataSource: DataSource | null,
    ) {
        const normalizeString = (str: string) => {
            return str
                .normalize('NFD') // separa os acentos das letras
                .replace(/[\u0300-\u036f]/g, '') // remove os acentos
                .replace(/[\s_\-!@#$%^&*()+=\[\]{};:'",.<>?/\\|`~]/g, '') // remove símbolos e espaços
                .toLowerCase() // transforma em minúscula
        }

        if (template) {
            const variableColumnMapping: Record<string, string | null> = {}

            template.getVariables().forEach(variable => {
                if (!dataSource) {
                    variableColumnMapping[variable] = null
                    return
                }

                const sameName = dataSource
                    .getColumns()
                    .find(
                        column =>
                            normalizeString(column) ===
                            normalizeString(variable),
                    )

                variableColumnMapping[variable] = sameName ?? null
            })

            return variableColumnMapping
        }

        return null
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
