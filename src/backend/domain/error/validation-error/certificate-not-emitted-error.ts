import { ValidationError } from '.'

export class CertificateNotEmittedError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'certificate-not-emitted',
            title: 'Certificate has not been emitted',
            detail,
        })
    }
}
