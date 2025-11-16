import {
    IExternalProcessing,
    TriggerSendCertificateEmails,
} from '@/backend/application/interfaces/iexternal-processing'
import { IGoogleAuthGateway } from '@/backend/application/interfaces/igoogle-auth-gateway'

export class CloudFunctionExternalProcessing
    implements Omit<IExternalProcessing, 'triggerGenerateCertificatePDFs'>
{
    constructor(
        private googleAuthGateway: Pick<IGoogleAuthGateway, 'getAuthClient'>,
    ) {}

    async triggerSendCertificateEmails(
        data: TriggerSendCertificateEmails,
    ): Promise<void> {
        const sendCertificateEmailsUrl =
            process.env.CLOUD_FUNCTIONS_BASE_URL + '/send-certificate-emails'

        const auth = this.googleAuthGateway.getAuthClient()
        // TODO: Should it be a method from google auth? Check if it is the same id token from getToken method
        const client = await auth.getIdTokenClient(sendCertificateEmailsUrl)
        const idToken = await client.idTokenProvider.fetchIdToken(
            sendCertificateEmailsUrl,
        )

        fetch(sendCertificateEmailsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(data),
        })
    }
}
