export interface INotificationGateway {
    sendEmailVerification(
        email: string,
        verificationToken: string,
    ): Promise<void>
    sendAccessRequest(email: string): Promise<void>
    sendAccessGranted(email: string): Promise<void>
}
