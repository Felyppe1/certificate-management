import { ValidationError } from '.'

export class CertificateEmittedError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'certificate-emitted',
            title: 'Certificate has already been emitted',
            detail,
        })
    }
}
