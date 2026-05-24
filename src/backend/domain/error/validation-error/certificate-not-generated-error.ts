import { ValidationError } from '.'

export class CertificateNotGeneratedError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'certificate-not-generated',
            title: 'Certificate has not been generated',
            detail,
        })
    }
}
