from typing import Optional
import functions_framework
from dotenv import load_dotenv
import os
import requests
from io import BytesIO
from docx import Document
from pptx import Presentation
from google.cloud import storage
import re
import traceback
import google.auth.transport.requests
import google.oauth2.id_token
import io
import zipfile

import tempfile
import subprocess

from google.auth import default
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
# from google.oauth2 import service_account

load_dotenv()

APP_BASE_URL = os.getenv('APP_BASE_URL')
AUDIENCE = os.getenv("TOKEN_AUDIENCE", APP_BASE_URL) # For local environments
SOFFICE_PATH = os.getenv('SOFFICE_PATH')
CERTIFICATES_BUCKET = os.getenv('CERTIFICATES_BUCKET')

for var_name, var_value in {
    "APP_BASE_URL": APP_BASE_URL,
    "SOFFICE_PATH": SOFFICE_PATH,
    "CERTIFICATES_BUCKET": CERTIFICATES_BUCKET,
}.items():
    if not var_value:
        raise ValueError(f"Environment variable '{var_name}' is not set.")

DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
GOOGLE_DOCS_MIME_TYPE = 'application/vnd.google-apps.document'
PPTX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
GOOGLE_SLIDES_MIME_TYPE = 'application/vnd.google-apps.presentation'

storage_client = storage.Client()

def download_from_google_drive_api(drive_file_id: str, file_mime_type: str, access_token: Optional[str] = None) -> BytesIO:
    mime_type_mapping = {
        GOOGLE_DOCS_MIME_TYPE: DOCX_MIME_TYPE,
        GOOGLE_SLIDES_MIME_TYPE: PPTX_MIME_TYPE,
    }

    if file_mime_type in [GOOGLE_DOCS_MIME_TYPE, GOOGLE_SLIDES_MIME_TYPE]:
        url = f"https://www.googleapis.com/drive/v3/files/{drive_file_id}/export?mimeType={mime_type_mapping[file_mime_type]}"
    else:
        url = f"https://www.googleapis.com/drive/v3/files/{drive_file_id}?alt=media"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json'
    } if access_token else {}
    
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"Erro {response.status_code}:")
        print(response.text)
        response.raise_for_status()
        
    return BytesIO(response.content)

def replace_variables_in_docx(template_buffer, variable_mapping):
    pattern = re.compile(r"\{\{\s*(\w+)\s*\}\}")

    with zipfile.ZipFile(template_buffer, 'r') as zin:
        out_buffer = BytesIO()
        with zipfile.ZipFile(out_buffer, 'w') as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                # Replace only on XML contents (document, headers, footers, drawings)
                if item.filename.endswith(('.xml',)):
                    text = data.decode('utf-8')
                    def replacer(match):
                        key = match.group(1)
                        return str(variable_mapping.get(key, ''))
                    text = pattern.sub(replacer, text)
                    data = text.encode('utf-8')
                zout.writestr(item, data)
        out_buffer.seek(0)
    return out_buffer

def replace_variables_in_pptx(template_buffer, variable_mapping):
    prs = Presentation(template_buffer)
    pattern = re.compile(r"\{\{\s*(\w+)\s*\}\}")

    def replace_in_text(text):
        def replacer(match):
            key = match.group(1)
            return str(variable_mapping.get(key, ''))
        return pattern.sub(replacer, text)

    def process_shape(shape):
        if hasattr(shape, "text_frame") and shape.text_frame:
            for paragraph in shape.text_frame.paragraphs:
                full_text = "".join(run.text for run in paragraph.runs)
                new_text = replace_in_text(full_text)
                for run in paragraph.runs:
                    run.text = ""
                if paragraph.runs:
                    paragraph.runs[0].text = new_text
                else:
                    paragraph.add_run().text = new_text

        if shape.has_table:
            for row in shape.table.rows:
                for cell in row.cells:
                    for paragraph in cell.text_frame.paragraphs:
                        full_text = "".join(run.text for run in paragraph.runs)
                        new_text = replace_in_text(full_text)
                        for run in paragraph.runs:
                            run.text = ""
                        if paragraph.runs:
                            paragraph.runs[0].text = new_text
                        else:
                            paragraph.add_run().text = new_text

        if shape.shape_type == 6:  # 6 == MSO_SHAPE_TYPE.GROUP
            for subshape in shape.shapes:
                process_shape(subshape)


    # Percorre slides e shapes recursivamente
    for slide in prs.slides:
        for shape in slide.shapes:
            process_shape(shape)
    # for slide in prs.slides:
    #     for shape in slide.shapes:
    #         # Replace in text boxes and placeholders
    #         if hasattr(shape, "text_frame") and shape.text_frame:
    #             for paragraph in shape.text_frame.paragraphs:
    #                 for run in paragraph.runs:
    #                     new_text = replace_in_text(run.text)
    #                     run.text = new_text

    #         # Replace in tables
    #         if shape.has_table:
    #             for row in shape.table.rows:
    #                 for cell in row.cells:
    #                     for paragraph in cell.text_frame.paragraphs:
    #                         for run in paragraph.runs:
    #                             new_text = replace_in_text(run.text)
    #                             run.text = new_text

    output_buffer = BytesIO()
    prs.save(output_buffer)
    output_buffer.seek(0)
    return output_buffer

def convert_to_pdf_with_libreoffice(input_bytes: BytesIO, input_ext: str) -> BytesIO:
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, f"input.{input_ext}")
        output_path = os.path.join(tmpdir, f"input.pdf")

        with open(input_path, "wb") as f:
            f.write(input_bytes.read())

        subprocess.run([
            SOFFICE_PATH,
            "--headless",
            "--convert-to", "pdf:draw_pdf_Export",
            "--outdir", tmpdir,
            input_path
        ], check=True)

        with open(output_path, "rb") as pdf_file:
            pdf_bytes = BytesIO(pdf_file.read())

    pdf_bytes.seek(0)
    return pdf_bytes

# def get_drive_service():
#     creds, _ = default(scopes=["https://www.googleapis.com/auth/drive"])

#     return build("drive", "v3", credentials=creds)

# def convert_to_pdf_via_google_drive(file_bytes: bytes, file_extension: str) -> bytes:
#     FOLDER_ID = '189e7d3DtkzqfS4qrnOM_3wIG-PZMo39B'

#     ext = file_extension.lower().lstrip(".")

#     if ext == "docx":
#         mime_type_upload = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
#         mime_type_convert = "application/vnd.google-apps.document"
#     elif ext == "pptx":
#         mime_type_upload = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
#         mime_type_convert = "application/vnd.google-apps.presentation"
#     else:
#         raise ValueError(f"Extensão {ext} não suportada para conversão")

#     service = get_drive_service()

#     filename = f"input.{ext}"

#     media = MediaIoBaseUpload(file_bytes, mimetype=mime_type_upload)

#     file_metadata = {"name": filename, "mimeType": mime_type_upload, "parents": [FOLDER_ID]}
#     uploaded = service.files().create(
#         body=file_metadata, media_body=media, fields="id"
#     ).execute()
#     file_id = uploaded.get("id")

#     request = service.files().export_media(fileId=file_id, mimeType="application/pdf")
#     pdf_bytes = io.BytesIO()
#     downloader = MediaIoBaseDownload(pdf_bytes, request)

#     done = False
#     while not done:
#         status, done = downloader.next_chunk()

#     pdf_bytes.seek(0)

#     service.files().delete(fileId=file_id).execute()

#     return pdf_bytes.read()

def upload_to_bucket(file_buffer, file_path):
    bucket = storage_client.bucket(CERTIFICATES_BUCKET)
    blob = bucket.blob(file_path)
    blob.upload_from_file(file_buffer, rewind=True)
    return blob

def get_from_bucket(file_path):
    bucket = storage_client.bucket(CERTIFICATES_BUCKET)
    blob = bucket.blob(file_path)
    return blob.download_as_bytes()

def delete_by_prefix(prefix: str):
    bucket = storage_client.bucket(CERTIFICATES_BUCKET)

    blobs = bucket.list_blobs(prefix=prefix)

    deleted_files = []
    for blob in blobs:
        blob.delete()
        deleted_files.append(blob.name)

    return deleted_files

def save_to_local(buffer, file_path):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'wb') as f:
        f.write(buffer.getvalue())

def update_data_set_status(data_set_id, status, total_bytes=None):
    print('Inside update')
    url = f"{APP_BASE_URL}/api/internal/data-sets/{data_set_id}"
    auth_req = google.auth.transport.requests.Request()

    id_token = google.oauth2.id_token.fetch_id_token(auth_req, AUDIENCE)

    headers = {
        "Authorization": f"Bearer {id_token}",
        "Content-Type": "application/json",
    }
    
    body = {k: v for k, v in {
        "generationStatus": status,
        "totalBytes": total_bytes,
    }.items() if v is not None}

    print('before sending patch')
    response = requests.patch(url, json=body, headers=headers)
    response.raise_for_status()

@functions_framework.http
def main(request):
    data = request.json
    
    if not data:
        return {'error': 'Request body is required'}, 400
    
    certificate_emission = data.get('certificateEmission')
    
    if not certificate_emission:
        return {'error': 'certificateEmission is required'}, 400
    
    certificate_emission_id = certificate_emission.get('id')
    if not certificate_emission_id:
        return {'error': 'certificateEmission id is missing'}, 400

    user_id = certificate_emission.get('userId')
    if not user_id:
        return {'error': 'User id is missing'}, 400
    
    template = certificate_emission.get('template')
    if not template:
        return {'error': 'Template is missing'}, 400
    
    data_source = certificate_emission.get('dataSource')
    if not data_source:
        return {'error': 'Data source is missing'}, 400
    
    data_set = data_source.get('dataSet')
    if not data_set:
        return {'error': 'Data set is missing'}, 400
    
    data_set_id = data_set.get('id')
    if not data_set_id:
        return {'error': 'Data set id is missing'}, 400
    
    rows = data_set.get('rows', [])
    if not rows:
        return {'error': 'Data set rows are empty'}, 400
    
    input_method = template.get('inputMethod')
    if not input_method:
        return {'error': 'Template inputMethod is missing'}, 400
    
    file_mime_type = template.get('fileExtension')
    if not file_mime_type:
        return {'error': 'Template fileExtension is missing'}, 400
    
    variable_mapping = certificate_emission.get('variableColumnMapping', {})

    try:
        template_buffer = None
        is_docx = None

        if file_mime_type in [DOCX_MIME_TYPE, GOOGLE_DOCS_MIME_TYPE]:
            is_docx = True
        elif file_mime_type in [PPTX_MIME_TYPE, GOOGLE_SLIDES_MIME_TYPE]:
            is_docx = False
        else:
            return {'error': f'Unsupported template file extension: {file_mime_type}'}, 422

        print('Input method: ', input_method)
        if input_method == 'UPLOAD':
            storage_file_url = template.get('storageFileUrl')
            if not storage_file_url:
                return {'error': 'Template storageFileUrl not found'}, 400
            
            template_bytes = get_from_bucket(storage_file_url)
            template_buffer = BytesIO(template_bytes)

        elif input_method == 'URL':
            drive_file_id = template.get('driveFileId')
            if not drive_file_id:
                return {'error': 'Template driveFileId not found'}, 400

            template_buffer = download_from_google_drive_api(drive_file_id, file_mime_type)

        elif input_method == 'GOOGLE_DRIVE':
            drive_file_id = template.get('driveFileId')
            if not drive_file_id:
                return {'error': 'Template driveFileId not found'}, 400
            
            google_access_token = certificate_emission.get('googleAccessToken')
            if not google_access_token:
                return {'error': 'Google access token is missing'}, 400

            template_buffer = download_from_google_drive_api(drive_file_id, file_mime_type, access_token=google_access_token)
        if is_docx:
            file_extension_str = 'docx'
        else:
            file_extension_str = 'pptx'

        total_bytes = 0
        delete_by_prefix(f"users/{user_id}/certificates/{certificate_emission_id}/certificate")

        print('Generating certificates...')
        for index, row in enumerate(rows):
            print(f'Row {index}: ', row)
            certificate_buffer = BytesIO(template_buffer.getvalue())

            if variable_mapping:
                row_variable_mapping = {}
                for template_var, column_name in variable_mapping.items():
                    if column_name and column_name in row:
                        row_variable_mapping[template_var] = row[column_name]
                
                if is_docx:
                    certificate_buffer = replace_variables_in_docx(certificate_buffer, row_variable_mapping)
                else:
                    certificate_buffer = replace_variables_in_pptx(certificate_buffer, row_variable_mapping)
            
            pdf_buffer = convert_to_pdf_with_libreoffice(certificate_buffer, file_extension_str)

            # pdf_buffer = convert_to_pdf_via_google_drive(template_buffer, file_extension_str)

            # Save file
            # file_path = f"output/certificate-{index + 1}.pdf"
            # save_to_local(pdf_buffer, file_path)

            # file_path = f"output/certificate-{index + 1}.{file_extension_str}"
            # save_to_local(filled_buffer, file_path)

            # Uploading to bucket
            pdf_path = f"users/{user_id}/certificates/{certificate_emission_id}/certificate-{index + 1}.pdf"
            blob = upload_to_bucket(pdf_buffer, pdf_path)

            # file_path = f"users/{user_id}/certificates/{certificate_emission_id}/certificate-{index + 1}.{file_extension_str}"
            # upload_to_bucket(certificate_buffer, file_path)

            total_bytes += blob.size
        
        update_data_set_status(data_set_id, 'COMPLETED', total_bytes)
        
        return "", 204
        
    except Exception as e:
        original_error = str(e)
        update_error = None

        try:
            print('Sending error status update...')
            update_data_set_status(data_set_id, 'FAILED')
        except Exception as inner_e:
            update_error = str(inner_e)

        details = original_error if not update_error else f'Original error: {original_error}; Update error: {update_error}'

        print('Error details:', details)
        return {
            'title': 'Failed to generate certificates',
            'details': details
        }, 500