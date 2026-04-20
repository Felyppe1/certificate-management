export interface INotificationGateway {
    sendEmailVerification(email: string, code: string): Promise<void>
    sendAccessRequest(email: string): Promise<void>
    sendAccessGranted(email: string): Promise<void>
}
