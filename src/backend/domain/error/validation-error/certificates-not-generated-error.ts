import { ValidationError } from '.'

export class CertificatesNotGeneratedError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'certificates-not-generated',
            title: 'Certificates have not been generated',
            detail,
        })
    }
}
