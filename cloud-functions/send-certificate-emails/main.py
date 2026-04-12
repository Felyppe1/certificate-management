import base64
import os
from concurrent.futures import ThreadPoolExecutor
from google.cloud import storage
import requests
import functions_framework
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.id_token import fetch_id_token
from datetime import date
from pydantic import BaseModel, ValidationError
from typing import List
import resend

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
ENV = os.getenv('ENV', 'production')
APP_BASE_URL = os.getenv('APP_BASE_URL')
AUDIENCE = os.getenv("TOKEN_AUDIENCE", APP_BASE_URL) # For local environments
CERTIFICATES_BUCKET = os.getenv('CERTIFICATES_BUCKET')

for var_name, var_value in {
    "APP_BASE_URL": APP_BASE_URL,
    "CERTIFICATES_BUCKET": CERTIFICATES_BUCKET,
    "RESEND_API_KEY": RESEND_API_KEY,
}.items():
    if not var_value:
        raise ValueError(f"Environment variable '{var_name}' is not set.")

resend.api_key = RESEND_API_KEY
storage_client = storage.Client()

class RecipientModel(BaseModel):
    rowId: str
    email: str

class SendCertificateEmailsInput(BaseModel):
    certificateEmissionId: str
    emailId: str
    userId: str
    subject: str
    body: str
    recipients: List[RecipientModel]

def get_from_bucket(file_path):
    bucket = storage_client.bucket(CERTIFICATES_BUCKET)
    blob = bucket.blob(file_path)
    return blob.download_as_bytes()


def update_email_status(email_id, status, user_id=None, emails_sent_count=None):
    print('Inside update')
    url = f"{APP_BASE_URL}/api/internal/emails/{email_id}"


    if ENV != 'local':
        auth_req = Request()

        id_token = fetch_id_token(auth_req, AUDIENCE)

        headers = {
            "Authorization": f"Bearer {id_token}",
            "Content-Type": "application/json",
        }
    else:
        headers = {
            "Content-Type": "application/json",
        }
    
    body = {
        "status": status,
    }

    if user_id is not None:
        body["userId"] = user_id

    if emails_sent_count is not None:
        body["emailsSentCount"] = emails_sent_count

    print('before sending patch')
    response = requests.patch(url, json=body, headers=headers)
    response.raise_for_status()

@functions_framework.http
def main(request):
    raw_data = request.get_json()
    email_id = None
    user_id = None

    try:
        input_data = SendCertificateEmailsInput(**raw_data)

        certificate_emission_id = input_data.certificateEmissionId
        email_id = input_data.emailId
        user_id = input_data.userId
        sender = input_data.sender
        subject = input_data.subject
        body = input_data.body
        recipients = input_data.recipients

        def send_email_to_recipient(recipient_data: RecipientModel):
            row_id = recipient_data.rowId
            recipient = recipient_data.email
            path = f"users/{user_id}/certificates/{certificate_emission_id}/certificate-{row_id}.pdf"
            pdf_bytes = get_from_bucket(path)

            html_content = f"""
            <html>
                <body style="font-family: sans-serif; color: #333;">
                    <p style="white-space: pre-line;">{body}</p>
                    <br>
                    
                    <div style="background-color: #26272B; padding: .75rem 1rem; max-width: 39rem; border-radius: .75rem; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: .75rem;">
                        <div style="background-color: #18191E; padding: 1rem 1rem; border-radius: .75rem; border: 2px solid #4A4A52; text-align: center;">
                            <div style="font-size: 1rem; font-weight: 600; color: white;">
                                <img src="{APP_BASE_URL}/logo.png" alt="Certifica" style="width: 1.5rem; height: 1.5rem; vertical-align: middle;">
                                <span style="vertical-align: middle;">
                                    Certifica
                                </span>
                            </div>
                            <p style="color: #a1a1aa; text-align: center; margin: .5rem;">
                                Este email foi enviado pela<br>plataforma de gerenciamento de certificados.
                            </p>
                            <p style="margin: 0; color: #71717a; text-align: center;">
                                <a href="{APP_BASE_URL}" target="_blank"
                                    style="color: #2563eb; text-decoration: underline;">Certifica</a>
                                <span style="margin: 0 8px; color: #52525b;">|</span>
                                <span>© {date.today().year}</span>
                            </p>
                        </div>
                    </div>
                </body>
            </html>
            """

            try:
                params = {
                    "from": "Certifica <nao-responda@certifica.felyppe.com.br>",
                    "to": [recipient],
                    "subject": subject,
                    "text": body,
                    "html": html_content,
                    "attachments": [
                        {
                            "filename": "certificado.pdf",
                            "content": list(pdf_bytes) 
                        }
                    ]
                }
                print(f"Sending email to {recipient} via Resend...")
                response = resend.Emails.send(params)
                print(f"Enviado com sucesso! ID: {response['id']}")
                return True
            except Exception as e:
                print(f"Erro ao enviar e-mail: {e}")
                return False

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(send_email_to_recipient, recipient_data)
                for recipient_data in recipients
            ]

            # Wait for all to complete
            for f in futures:
                f.result()

        update_email_status(email_id, 'COMPLETED', user_id, len(recipients))

        return "", 204
    
    except ValidationError as e:
        def format_pydantic_errors(errors):
            formatted_errors = []

            for error in errors:
                field = ".".join([str(x) for x in error['loc']])
                message = error['msg']
                formatted_errors.append({
                    "field": field,
                    "message": message
                })

            return formatted_errors

        friendly_errors = format_pydantic_errors(e.errors())

        print("Validation errors:", friendly_errors)

        return {"error": friendly_errors}, 200

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
