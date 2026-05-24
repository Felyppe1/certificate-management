import { ConflictError } from '.'

export class CertificateAlreadyExistsError extends ConflictError {
    constructor(detail?: string) {
        super({
            type: 'certificate-already-exists',
            title: 'Certificate already exists',
            detail,
        })
    }
}
