import { ForbiddenError } from '.'

export class NotCertificateOwnerError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'not-certificate-owner',
            title: 'You are not the certificate owner',
            detail,
        })
    }
}
