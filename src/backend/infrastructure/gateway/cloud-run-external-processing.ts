import {
    IExternalProcessing,
    TriggerGenerateCertificatePDFsInput,
} from '@/backend/application/interfaces/iexternal-processing'
import { IGoogleAuthGateway } from '@/backend/application/interfaces/igoogle-auth-gateway'

export class CloudRunExternalProcessing
    implements Pick<IExternalProcessing, 'triggerGenerateCertificatePDFs'>
{
    constructor(private googleAuthGateway: IGoogleAuthGateway) {}

    async triggerGenerateCertificatePDFs(
        data: TriggerGenerateCertificatePDFsInput,
    ): Promise<void> {
        const generatePdfsUrl = this.getCloudFunctionUrl('generate-pdfs')

        const auth = this.googleAuthGateway.getAuthClient()
        // TODO: Should it be a method from google auth? Check if it is the same id token from getToken method
        const client = await auth.getIdTokenClient(generatePdfsUrl)
        const idToken =
            await client.idTokenProvider.fetchIdToken(generatePdfsUrl)

        /* const response = await  */ fetch(generatePdfsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(data),
        })

        // if (!response.ok) {
        //     const text = await response.text()
        //     throw new Error(`Failed (${response.status}): ${text}`)
        // }
    }

    private getCloudFunctionUrl(functionName: string): string {
        const projectId = process.env.GCP_PROJECT_ID
        const region = process.env.GCP_REGION
        const suffix = process.env.SUFFIX

        if (!projectId || !region) {
            throw new Error('GCP_PROJECT_ID or GCP_REGION not set')
        }

        const functionFullName = `${functionName}${suffix}`

        return `https://${functionFullName}-${projectId}.${region}.run.app`
    }
}
