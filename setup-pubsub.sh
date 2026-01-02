#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status

echo "PUBSUB_EMULATOR_HOST=$PUBSUB_EMULATOR_HOST"

if [ -z "$PUBSUB_EMULATOR_HOST" ]; then
  echo "❌ PUBSUB_EMULATOR_HOST not set — aborting"
  exit 1
fi

echo "Creating Topic: certificates-generation-started..."
curl -s -X PUT "http://$PUBSUB_EMULATOR_HOST/v1/projects/$GCP_PROJECT_ID/topics/certificates-generation-started"

echo "Creating Push Subscription: certificates-generation-started-cloud-run..."
curl -s -X PUT "http://$PUBSUB_EMULATOR_HOST/v1/projects/$GCP_PROJECT_ID/subscriptions/certificates-generation-started-cloud-run" \
    -H "Content-Type: application/json" \
    -d '{
      "topic": "projects/'"$GCP_PROJECT_ID"'/topics/certificates-generation-started",
      "pushConfig": {
        "pushEndpoint": "http://host.docker.internal:8080"
      },
      "ackDeadlineSeconds": 600,
      "retryPolicy": {
        "minimumBackoff": "10s",
        "maximumBackoff": "600s"
      }
    }'

echo -e "\n✅ Configuration completed successfully!"