export interface IPubSub {
    publish(topicName: string, data: Record<string, any>): Promise<string>
}
