import { IPubSub } from '@/backend/application/interfaces/ipubsub'
import { PubSub } from '@google-cloud/pubsub'

export class GcpPubSub implements IPubSub {
    private pubsub: PubSub

    constructor() {
        this.pubsub = new PubSub()
    }

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
