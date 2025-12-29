from google.cloud import pubsub_v1
from google.protobuf import duration_pb2
from dotenv import load_dotenv
import os

load_dotenv()

project_id = os.getenv("GCP_PROJECT_ID")

topic_id = "certificates-generation-started"
subscription_id = "certificates-generation-started-cloud-run"
endpoint = "http://host.docker.internal:8080" # Target URL

publisher = pubsub_v1.PublisherClient()
subscriber = pubsub_v1.SubscriberClient()

topic_path = publisher.topic_path(project_id, topic_id)
sub_path = subscriber.subscription_path(project_id, subscription_id)

try:
    publisher.create_topic(name=topic_path)
except Exception as e:
    print('ERROR', e)
    pass

# 2. Configurar a Política de Retentativa (Retry Policy)
# Min: 10s, Max: 600s (Exponencial)
retry_policy = {
    "minimum_backoff": duration_pb2.Duration(seconds=10),
    "maximum_backoff": duration_pb2.Duration(seconds=600),
}

push_config = pubsub_v1.types.PushConfig(push_endpoint=endpoint)

# 3. Criar a Assinatura com a Retry Policy
try:
    subscriber.create_subscription(
        request={
            "name": sub_path,
            "topic": topic_path,
            "push_config": push_config,
            "retry_policy": retry_policy, # <--- A mágica aqui
            "ack_deadline_seconds": 60,   # Tempo que ele espera o 200 OK antes de tentar de novo
        }
    )
    print(f"✅ Assinatura criada com Backoff Exponencial (10s - 600s)!")
except Exception as e:
    print(f"Aviso: {e}")