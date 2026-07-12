import { IPubSub } from '@/backend/application/interfaces/messaging/ipubsub'
import { PubSub } from '@google-cloud/pubsub'

export class GcpPubSub implements IPubSub {
    constructor(private pubsub: PubSub) {}

    async publish(
        topicName: string,
        data: Record<string, any>,
    ): Promise<string> {
        const dataBuffer = Buffer.from(JSON.stringify(data))

        try {
            const messageId = await this.pubsub
                .topic(topicName)
                .publishMessage({ data: dataBuffer })

            console.log(`Message ${messageId} published to ${topicName}`)
            return messageId
        } catch (error) {
            console.error(`[PubSub] Error publishing to ${topicName}: ${error}`)
            throw new Error('Failed to publish message')
        }
    }
}
