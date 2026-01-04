import { Certificate } from '../domain/certificate'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'

interface CreateUseCaseEmissionUseCaseInput {
    name: string
    userId: string
}

export class CreateCertificateEmissionUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
    ) {}

    async execute({ name, userId }: CreateUseCaseEmissionUseCaseInput) {
        const newCertificate = Certificate.create({
            name,
            userId,
            template: null,
            dataSource: null,
        })

        await this.certificateEmissionsRepository.save(newCertificate)

        return newCertificate.getId()
    }
}
