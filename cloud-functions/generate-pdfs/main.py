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

load_dotenv()

APP_BASE_URL = os.getenv('APP_BASE_URL')
CERTIFICATES_BUCKET = os.getenv('CERTIFICATES_BUCKET')

for var_name, var_value in {
    "APP_BASE_URL": APP_BASE_URL,
    # "CERTIFICATES_BUCKET": CERTIFICATES_BUCKET,
}.items():
    if not var_value:
        raise ValueError(f"Environment variable '{var_name}' is not set.")

storage_client = storage.Client()

def download_file_from_url(url):
    response = requests.get(url, allow_redirects=True)
    response.raise_for_status()
    return BytesIO(response.content)

def replace_variables_in_docx(template_buffer, variable_mapping):
    doc = Document(template_buffer)
    
    pattern = re.compile(r"\{\{\s*(\w+)\s*\}\}")

    def replace_in_text(text):
        def replacer(match):
            key = match.group(1)
            return str(variable_mapping.get(key, ''))
        return pattern.sub(replacer, text)

    for paragraph in doc.paragraphs:
        for run in paragraph.runs:
            run.text = replace_in_text(run.text)

    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.text = replace_in_text(run.text)

    output_buffer = BytesIO()
    doc.save(output_buffer)
    output_buffer.seek(0)
    return output_buffer

def replace_variables_in_pptx(template_buffer, variable_mapping):
    prs = Presentation(template_buffer)
    pattern = re.compile(r"\{\{\s*(\w+)\s*\}\}")

    def replace_in_text(text):
        def replacer(match):
            key = match.group(1)
            return str(variable_mapping.get(key, ''))
        return pattern.sub(replacer, text)

    for slide in prs.slides:
        for shape in slide.shapes:
            # Replace in text boxes and placeholders
            if hasattr(shape, "text_frame") and shape.text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    for run in paragraph.runs:
                        new_text = replace_in_text(run.text)
                        run.text = new_text

            # Replace in tables
            if shape.has_table:
                for row in shape.table.rows:
                    for cell in row.cells:
                        for paragraph in cell.text_frame.paragraphs:
                            for run in paragraph.runs:
                                new_text = replace_in_text(run.text)
                                run.text = new_text

    output_buffer = BytesIO()
    prs.save(output_buffer)
    output_buffer.seek(0)
    return output_buffer

def upload_to_bucket(file_buffer, file_path):
    bucket = storage_client.bucket(CERTIFICATES_BUCKET)
    blob = bucket.blob(file_path)
    blob.upload_from_file(file_buffer, rewind=True)
    return file_path

def save_to_local(buffer, file_path):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'wb') as f:
        f.write(buffer.getvalue())

def update_data_set_status(data_set_id, status):
    url = f"{APP_BASE_URL}/api/internal/data-sets/{data_set_id}/status"
    auth_req = google.auth.transport.requests.Request()

    id_token = google.oauth2.id_token.fetch_id_token(auth_req, APP_BASE_URL)

    headers = {
        "Authorization": f"Bearer {id_token}",
        "Content-Type": "application/json",
    }

    response = requests.put(url, json={"generationStatus": status}, headers=headers)
    response.raise_for_status()

@functions_framework.http
def main(request):
    data = request.json
    
    if not data:
        return {'error': 'Request body is required'}, 400
    
    certificate_emission = data.get('certificateEmission')
    
    if not certificate_emission:
        return {'error': 'certificateEmission is required'}, 400
    
    try:
        certificate_emission_id = certificate_emission.get('id')
        template = certificate_emission.get('template')
        data_source = certificate_emission.get('dataSource')
        variable_mapping = certificate_emission.get('variableColumnMapping', {})
        
        if not template:
            return {'error': 'Template is missing'}, 400
        
        if not data_source:
            return {'error': 'Data source is missing'}, 400
        
        data_set = data_source.get('dataSet')
        if not data_set:
            return {'error': 'DataSet is missing'}, 400
        
        data_set_id = data_set.get('id')
        rows = data_set.get('rows', [])
        
        if not rows:
            return {'error': 'DataSet rows are empty'}, 400
        
        template_buffer = None
        user_id = None
        input_method = template.get('inputMethod')

        if input_method == 'URL':
            drive_file_id = template.get('driveFileId')
            file_mime_type = template.get('fileExtension')
            
            if not drive_file_id:
                return {'error': 'Template driveFileId not found'}, 404
            
            # Montar URL de export do Google Drive baseado no tipo
            mime_types_for_docx = [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.google-apps.document'
            ]

            mime_types_for_pptx = [
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.google-apps.presentation'
            ]

            if file_mime_type in mime_types_for_docx:
                template_url = f"https://docs.google.com/document/d/{drive_file_id}/export?format=docx"
                is_docx = True
            elif file_mime_type in mime_types_for_pptx:
                template_url = f"https://docs.google.com/presentation/d/{drive_file_id}/export?format=pptx"
                is_docx = False
            else:
                return {'error': f'Unsupported template file extension: {file_mime_type}'}, 400
            
            # Baixar o template
            template_buffer = download_file_from_url(template_url)
            
            # Gerar PDFs para cada row
            user_id = certificate_emission.get('userId')
            generated_files = []

        # TODO: get the template from other input method options
        
        if variable_mapping:
            for index, row in enumerate(rows):
                print(row)
                row_variable_mapping = {}
                for template_var, column_name in variable_mapping.items():
                    if column_name and column_name in row:
                        row_variable_mapping[template_var] = row[column_name]
                
                # Substituir variáveis no template
                template_buffer.seek(0)
                if is_docx:
                    filled_buffer = replace_variables_in_docx(BytesIO(template_buffer.read()), row_variable_mapping)
                    file_extension_str = 'docx'
                else:
                    filled_buffer = replace_variables_in_pptx(BytesIO(template_buffer.read()), row_variable_mapping)
                    file_extension_str = 'pptx'
            
                # TODO: transform to PDF before saving to bucket

                # file_path = f"users/{user_id}/certificates/{certificate_emission_id}/certificate-{index + 1}.{file_extension_str}"
                # upload_to_bucket(filled_buffer, file_path)

                file_path = f"output/certificate-{index + 1}.{file_extension_str}"
                save_to_local(filled_buffer, file_path)

                generated_files.append(file_path)
        else:
            pass
            # TODO: transform to PDF before saving to bucket
        
        # update_data_set_status(data_set_id, 'COMPLETED')
        
        return {
            'success': True,
            'message': f'Generated {len(generated_files)} certificates successfully',
            'files': generated_files
        }, 200
        
    except Exception as e:
        print(f"Error generating certificates: {str(e)}")
        print(traceback.format_exc())
        
        # try:
        #     if 'data_set_id' in locals():
        #         update_data_set_status(data_set_id, 'FAILED')
        # except:
        #     pass
        
        return {
            'error': 'Failed to generate certificates',
            'details': str(e)
        }, 500