import { CertificateEmission } from '../domain/certificate'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'

interface CreateUseCaseEmissionUseCaseInput {
    name: string
    userId: string
}

export class CreateCertificateEmissionUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'save'
        >,
    ) {}

    async execute({ name, userId }: CreateUseCaseEmissionUseCaseInput) {
        const newCertificate = CertificateEmission.create({
            name,
            userId,
            template: null,
            dataSource: null,
        })

        await this.certificateEmissionsRepository.save(newCertificate)

        return newCertificate.getId()
    }
}
