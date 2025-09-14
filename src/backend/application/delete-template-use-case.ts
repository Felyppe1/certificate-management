import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { SessionsRepository } from './interfaces/sessions-repository'
import { TemplatesRepository } from './interfaces/templates-repository'

interface DeleteTemplateUseCaseInput {
    templateId: string
    sessionToken: string
}

export class DeleteTemplateUseCase {
    constructor(
        private templatesRepository: TemplatesRepository,
        private sessionsRepository: SessionsRepository,
    ) {}

    async execute({ templateId, sessionToken }: DeleteTemplateUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('Session not found')
        }

        const template = await this.templatesRepository.getById(templateId)

        if (!template) {
            throw new NotFoundError('Template not found')
        }

        if (template.getUserId() !== session.userId) {
            throw new UnauthorizedError(
                'You do not have permission to delete this template',
            )
        }

        await this.templatesRepository.deleteById(templateId)
    }
}
