export interface INotificationEmailGateway {
    sendAccessRequest(email: string): Promise<void>
    sendAccessGranted(email: string): Promise<void>
}
