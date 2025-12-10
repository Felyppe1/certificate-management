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

            logo_path = os.path.join(os.path.dirname(__file__), "assets", "logo.png")

            with open(logo_path, 'rb') as f:
                logo_bytes = f.read()

            html_content = f"""
            <html>
                <body style="font-family: sans-serif; color: #333;">
                    <p style="white-space: pre-line;">{body}</p>
                    <br>
                    
                    <div style="background-color: #26272B; padding: .75rem 1rem; max-width: 39rem; border-radius: .75rem; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: .75rem;">
                        <div style="background-color: #18191E; padding: 1rem 1rem; border-radius: .75rem; border: 2px solid #4A4A52; text-align: center;">
                            <div style="font-size: 1rem; font-weight: 600; color: white;">
                                <img src="cid:logo_certifica" alt="Certifica" style="width: 1.5rem; height: 1.5rem; vertical-align: middle;">
                                <span style="vertical-align: middle;">
                                    Certifica
                                </span>
                            </div>
                            <p style="color: #a1a1aa; text-align: center; margin: .5rem;">
                                Este email foi enviado pela<br>plataforma de gerenciamento de certificados.
                            </p>
                            <p style="margin: 0; color: #71717a; text-align: center;">
                                <a href="https://certificate-management-924358881315.us-central1.run.app/" target="_blank"
                                    style="color: #2563eb; text-decoration: underline;">Certifica</a>
                                <span style="margin: 0 8px; color: #52525b;">|</span>
                                <span>© 2025</span>
                            </p>
                        </div>
                    </div>
                </body>
            </html>
            """

            # 3. Cria a mensagem
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = sender
            msg["To"] = recipient

            msg.set_content(body)
            msg.add_alternative(html_content, subtype="html")

            # # A. Define o conteúdo em TEXTO PURO (fallback para emails antigos)
            # msg.set_content(body) 

            # # B. Adiciona a versão HTML como alternativa
            # msg.add_alternative(html_content, subtype='html')

            # C. O Pulo do Gato: Anexar a imagem "dentro" da parte HTML
            # msg.get_payload()[1] pega a parte HTML que acabamos de criar acima
            msg.get_payload()[1].add_related(
                logo_bytes,
                maintype='image',
                subtype='png',
                cid='<logo_certifica>'
            )

            msg.add_attachment(
                pdf_bytes,
                maintype="application",
                subtype="pdf",
                filename="certificado.pdf"
            )

            print('Sending email to', recipient)
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(send_email_to_recipient, index, recipient)
                for index, recipient in enumerate(recipients)
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
