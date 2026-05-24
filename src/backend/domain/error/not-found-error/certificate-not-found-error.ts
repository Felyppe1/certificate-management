import { NotFoundError } from '.'

export class CertificateNotFoundError extends NotFoundError {
    constructor(detail?: string) {
        super({
            type: 'certificate-not-found',
            title: 'Certificate not found',
            detail,
        })
    }
}
