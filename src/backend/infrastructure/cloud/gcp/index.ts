import { PubSub } from '@google-cloud/pubsub'
import { Storage } from '@google-cloud/storage'
import { CloudTasksClient } from '@google-cloud/tasks'

const globalForGcp = globalThis as unknown as {
    gcpStorage: Storage
    gcpPubsub: PubSub
    gcpCloudTasks: CloudTasksClient
}

// To avoid creating multiple instances of clients during development with hot reloads
export const gcpStorage = globalForGcp.gcpStorage || new Storage()
export const gcpPubsub = globalForGcp.gcpPubsub || new PubSub()
export const gcpCloudTasks =
    globalForGcp.gcpCloudTasks || new CloudTasksClient()

if (process.env.NODE_ENV !== 'production') {
    globalForGcp.gcpStorage = gcpStorage
    globalForGcp.gcpPubsub = gcpPubsub
    globalForGcp.gcpCloudTasks = gcpCloudTasks
}
