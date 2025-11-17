import base64
import smtplib
import os
from email.message import EmailMessage
from concurrent.futures import ThreadPoolExecutor
from google.cloud import storage
import requests
import functions_framework
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.id_token import fetch_id_token

load_dotenv()

# SMTP config (auhton Gmail ou SendGrid SMTP)
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

APP_BASE_URL = os.getenv('APP_BASE_URL')
AUDIENCE = os.getenv("TOKEN_AUDIENCE", APP_BASE_URL) # For local environments
CERTIFICATES_BUCKET = os.getenv('CERTIFICATES_BUCKET')

for var_name, var_value in {
    "APP_BASE_URL": APP_BASE_URL,
    "CERTIFICATES_BUCKET": CERTIFICATES_BUCKET,
    "SMTP_USER": SMTP_USER,
    "SMTP_PASSWORD": SMTP_PASSWORD,
}.items():
    if not var_value:
        raise ValueError(f"Environment variable '{var_name}' is not set.")

storage_client = storage.Client()

def get_from_bucket(file_path):
    bucket = storage_client.bucket(CERTIFICATES_BUCKET)
    blob = bucket.blob(file_path)
    return blob.download_as_bytes()


def update_email_status(email_id, status):
    print('Inside update')
    url = f"{APP_BASE_URL}/api/internal/emails/{email_id}"

    auth_req = Request()

    id_token = fetch_id_token(auth_req, AUDIENCE)

    headers = {
        "Authorization": f"Bearer {id_token}",
        "Content-Type": "application/json",
    }
    
    body = {
        "status": status
    }

    print('before sending patch')
    response = requests.patch(url, json=body, headers=headers)
    response.raise_for_status()

@functions_framework.http
def main(request):
    data = request.get_json()

    # TODO: validate data
    certificate_emission_id = data.get("certificateEmissionId")
    email_id = data.get("emailId")
    user_id = data.get("userId")
    sender = data.get("sender")
    subject = data.get("subject")
    body = data.get("body")
    recipients = data.get("recipients")

    try:
        def send_email_to_recipient(index, recipient):
            path = f"users/{user_id}/certificates/{certificate_emission_id}/certificate-{index + 1}.pdf"
            pdf_bytes = get_from_bucket(path)

            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = sender
            msg["To"] = recipient
            msg.set_content(body)

            msg.add_attachment(
                pdf_bytes,
                maintype="application",
                subtype="pdf",
                filename="certificado.pdf"
            )

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(send_email_to_recipient, idx, rec)
                for idx, rec in enumerate(recipients)
            ]

            # Wait for all to complete
            for f in futures:
                f.result()

        update_email_status(email_id, 'COMPLETED')

        return "", 204
    
    except Exception as e:
        original_error = str(e)
        update_error = None

        try:
            print('before error update')
            update_email_status(email_id, 'FAILED')
        except Exception as inner_e:
            update_error = str(inner_e)

        details = original_error if not update_error else f'Original error: {original_error}; Update error: {update_error}'

        print('Error details:', details)
        return {
            'title': 'Failed to send certificate emails',
            'details': details
        }, 500
