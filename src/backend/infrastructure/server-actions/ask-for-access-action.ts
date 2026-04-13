'use server'

import { AskForAccessUseCase } from '@/backend/application/ask-for-access-use-case'
import { ResendNotificationEmailGateway } from '@/backend/infrastructure/gateway/resend-notification-email-gateway'
import { ActionResponse } from '@/types'
import z from 'zod'

interface AskForAccessActionInput {
    email: string
}

const askForAccessSchema = z.object({
    email: z.email(),
})

export async function askForAccessAction(
    _: unknown,
    formData: FormData,
): Promise<ActionResponse<AskForAccessActionInput>> {
    const rawData: AskForAccessActionInput = {
        email: formData.get('email') as string,
    }

    try {
        const parsedData = askForAccessSchema.parse(rawData)

        const notificationEmailGateway = new ResendNotificationEmailGateway()
        const useCase = new AskForAccessUseCase(notificationEmailGateway)

        await useCase.execute({ email: parsedData.email })

        return { success: true }
    } catch {
        return {
            success: false,
        }
    }
}
