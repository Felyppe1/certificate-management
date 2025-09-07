import officeParser from 'officeparser'
import { Template, TEMPLATE_TYPE } from '../domain/template'
import { ValidationError } from '../domain/error/validation-error'
import { CertificatesRepository } from './interfaces/certificates-repository'
import { NotFoundError } from '../domain/error/not-found-error'
import { SessionsRepository } from './interfaces/sessions-repository'
import { ForbiddenError } from '../domain/error/forbidden-error'
import { GoogleDriveGateway } from './interfaces/google-drive-gateway'

interface CreateTemplateByUrlUseCaseInput {
    certificateId: string
    fileUrl: string
    sessionToken: string
}

export class CreateTemplateByUrlUseCase {
    constructor(
        private certificatesRepository: CertificatesRepository,
        private sessionsRepository: SessionsRepository,
        private googleDriveGateway: GoogleDriveGateway,
    ) {}

    async execute(input: CreateTemplateByUrlUseCaseInput) {
        console.log('oi')
        const certificate = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new Error('Unauthorized')
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError(
                'You do not have permission to update this certificate',
            )
        }

        const fileId = Template.getFileIdFromUrl(input.fileUrl)

        if (!fileId) {
            throw new ValidationError('Invalid file URL')
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            fileId,
            mimeType: 'docx',
        })

        const content = await officeParser.parseOfficeAsync(buffer)

        const uniqueVariables = Template.extractVariablesFromContent(content)

        const newTemplate = Template.create({
            fileId,
            bucketUrl: null,
            type: TEMPLATE_TYPE.URL,
            variables: uniqueVariables,
        })

        certificate.addTemplate(newTemplate)

        await this.certificatesRepository.update(certificate)
    }
}
