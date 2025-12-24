from typing import Optional
import functions_framework
from dotenv import load_dotenv
import os
import requests
from io import BytesIO
from docx import Document
from docx.text.paragraph import Paragraph
from pptx import Presentation
from google.cloud import storage
import re
import google.auth.transport.requests
import google.oauth2.id_token
import zipfile
from liquid import Template

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

BLOCK_START_TAGS = {
    'if', 'unless', 'case', 'for', 'tablerow', 'capture', 'form', 'paginate'
}
BLOCK_END_TAGS = {
    'endif', 'endunless', 'endcase', 'endfor', 'endtablerow', 'endcapture', 'endform', 'endpaginate'
}

# Regex to find opening tags: {% if, {%- if, {% endfor, etc.
TAG_REGEX = re.compile(r'{%-?\s*(\w+)')

################################ Functions to process DOCX with Liquid ################################
def paragraph_universal_iterator(doc):
    """Returns all body, table, and textbox paragraphs."""
    for p in doc.paragraphs:
        yield p
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    yield p
    
    ns_map = doc.element.nsmap
    txbx_contents = doc.element.body.findall('.//w:txbxContent', ns_map)
    for txbx in txbx_contents:
        xml_paragraphs = txbx.findall('.//w:p', ns_map)
        for xml_p in xml_paragraphs:
            yield Paragraph(xml_p, doc)

def consolidate_broken_runs(paragraph):
    """Merges runs within the SAME paragraph to fix Word breaks."""
    text = paragraph.text
    if not ('{{' in text or '{%' in text):
        return

    runs = paragraph.runs
    if not runs: return

    i = 0
    while i < len(runs):
        text_run = runs[i].text
        has_open = '{%' in text_run or '{{' in text_run
        
        if has_open:
            closure = '%}' if '{%' in text_run else '}}'
            j = i + 1
            while closure not in runs[i].text and j < len(runs):
                next_run = runs[j]
                runs[i].text += next_run.text
                next_run.text = ""
                j += 1
        i += 1

def calculate_delta_blocks(text):
    """
    Returns the variation of opened/closed blocks in this text.
    +1 for each 'if', 'for'...
    -1 for each 'endif', 'endfor'...
    """
    delta = 0
    # Finds all tags {% tag ... %}
    matches = TAG_REGEX.findall(text)
    
    for tag_name in matches:
        if tag_name in BLOCK_START_TAGS:
            delta += 1
        elif tag_name in BLOCK_END_TAGS:
            delta -= 1
    return delta

def process_buffer(paragraph_list, text_list, context):
    """
    Takes N paragraphs, joins the text, runs Liquid, and returns the result
    in the FIRST paragraph, deleting the others.
    """
    # Joins with line breaks to simulate the original document
    complete_text = "\n".join(text_list)
    
    # If there is no liquid syntax, ignore
    if not ("{{" in complete_text or "{%" in complete_text):
        return

    sanitized_text = (complete_text
                      .replace('“', '"').replace('”', '"')
                      .replace('‘', "'").replace('’', "'"))
    if "append" in sanitized_text:
        print(f"DEBUG LIQUID: {sanitized_text}")
        
    try:
        template = Template(sanitized_text)
        new_complete_text = template.render(**context)
        # If the text did not change, do nothing (preserves original formatting)
        if new_complete_text == complete_text:
            return

        # MULTI-LINE REPLACEMENT STRATEGY:
        # 1. Put EVERYTHING in the first paragraph of the buffer
        main_paragraph = paragraph_list[0]
        
        # Clear runs of the main paragraph
        for run in main_paragraph.runs:
            run.text = ""
        # Add the new text (may contain line breaks resulting from liquid)
        # Note: python-docx handles '\n' inside a run by creating soft breaks, 
        # but visually it works for the purpose.
        if main_paragraph.runs:
            main_paragraph.runs[0].text = new_complete_text
        else:
            main_paragraph.add_run(new_complete_text)

        # 2. Clear the subsequent paragraphs that were part of the block
        # Ex: The paragraph that had the "{% else %}" and the "{% endif %}"
        for p_lixo in paragraph_list[1:]:
            for run in p_lixo.runs:
                run.text = ""
            # Optional: If you want to remove the paragraph entirely (may break layout if it's a table)
            # p_lixo._element.getparent().remove(p_lixo._element) 
            # Recommended to just clear the text to keep the table/doc structure safe.

    except Exception as e:
        print(f"Error Liquid block started in '{text_list[0][:20]}...': {e}")

def replace_variables_in_docx_liquid(in_buffer, context_data):
    in_buffer.seek(0)
    doc = Document(in_buffer)
    
    # 1. Pre-processing: Consolidate runs (intra-line)
    # This ensures that '{% if' is not split across different runs in the same line
    all_paragraphs = list(paragraph_universal_iterator(doc))
    for p in all_paragraphs:
        consolidate_broken_runs(p)

    # 2. Processing with Buffer (Inter-line)
    buffer_paragraphs = [] # List of Paragraph objects
    accumulated_text = []   # List of strings (paragraph texts)
    block_level = 0        # 0 = no block open, >0 = inside block

    # We iterate over the list we already created to be able to skip indices if necessary
    # but here we will use a continuous flow logic
    
    idx = 0
    while idx < len(all_paragraphs):
        p = all_paragraphs[idx]
        paragraph_text = p.text
        
        # Calculate if this paragraph opens or closes blocks
        delta = calculate_delta_blocks(paragraph_text)
        
        # DECISION LOGIC
        # If we have open blocks OR if this paragraph opens new blocks that do not close here
        if block_level > 0 or (delta > 0):
            # We are inside a multi-line logic or starting one
            buffer_paragraphs.append(p)
            accumulated_text.append(paragraph_text)
            block_level += delta # Update level
            
            # If we return to zero, it means the block closed in this paragraph.
            # Time to process the entire buffer!
            if block_level == 0:
                process_buffer(buffer_paragraphs, accumulated_text, context_data)
                # Clear buffer
                buffer_paragraphs = []
                accumulated_text = []
                
        else:
            # We are not in a multi-line block. 
            # But there may be simple variables {{name}} or if/endif on the same line.
            # We process individually.
            process_buffer([p], [paragraph_text], context_data)
        
        idx += 1

    # If something remains in the buffer (e.g., syntax error, if without endif at the end of the doc)
    if buffer_paragraphs:
        print("WARNING: Liquid block not closed at the end of the document.")
        process_buffer(buffer_paragraphs, accumulated_text, context_data)

    # 3. Save
    out_buffer = BytesIO()
    doc.save(out_buffer)
    out_buffer.seek(0)
    return out_buffer



def inspecionar_runs_docx(buffer):
    buffer.seek(0)
    doc = Document(buffer)
    
    print("--- INICIANDO INSPEÇÃO PROFUNDA ---\n")

    # 1. Verificar o Corpo Principal (o que você já fez)
    print("📍 [ÁREA 1] CORPO DO DOCUMENTO (Main Body)")
    tem_conteudo = False
    for p in doc.paragraphs:
        if p.text.strip():
            tem_conteudo = True
            print(f"   Parágrafo: '{p.text}'")
    if not tem_conteudo:
        print("   (Vazio)")

    # 2. Verificar Tabelas (Muito comum em certificados para layout)
    print("\n📍 [ÁREA 2] TABELAS")
    total_tabelas = len(doc.tables)
    print(f"   Encontradas {total_tabelas} tabelas.")
    
    celulas_processadas = set()

    for i, table in enumerate(doc.tables):
        print(f"📍 Tabela {i}")
        for row in table.rows:
            for cell in row.cells:
                # Se já vimos esta célula (mesmo objeto), pula
                if cell in celulas_processadas:
                    continue
                
                # Marca como processada
                celulas_processadas.add(cell)
                
                # Agora lemos os parágrafos dentro dessa célula única
                texto_celula = cell.text.strip()
                if texto_celula:
                    print(f"   [Célula Única]: {texto_celula}") # Printando só o começo
                    
                    # Verificando a estrutura interna (runs) para o seu Liquid
                    for p in cell.paragraphs:
                        if "{%" in p.text or "{{" in p.text:
                            print(f"      👉 Lógica encontrada: '{p.text}'")

    # 3. Verificar Caixas de Texto / Shapes (O pesadelo do python-docx)
    # python-docx não tem uma API fácil para isso, precisamos ir no XML
    print("\n📍 [ÁREA 3] CAIXAS DE TEXTO / SHAPES")
    
    # Vamos iterar sobre o XML procurando tags de conteúdo de textbox (w:txbxContent)
    # Isso é apenas para leitura; editar isso via python-docx é complexo.
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    
    # Procura todos os elementos de texto dentro do corpo
    # Nota: Isso é uma busca 'bruta' no XML para te mostrar onde está o texto
    text_boxes = doc.element.body.findall('.//w:txbxContent', ns)
    
    if text_boxes:
        print(f"   Encontradas {len(text_boxes)} caixas de texto.")
        for i, tb in enumerate(text_boxes):
            # Tenta extrair o texto de dentro do XML da caixa
            texts = tb.findall('.//w:t', ns)
            conteudo = "".join([t.text for t in texts if t.text])
            if conteudo.strip():
                print(f"      Caixa {i}: '{conteudo}'")
    else:
        print("   Nenhuma caixa de texto detectada via XML padrão.")

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
    print('Generate PDFs function invoked')
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

        inspecionar_runs_docx(template_buffer)
        print('Generating certificates...')
        for index, row in enumerate(rows):
            print(f'Row {index}: ', row)
            row['Idade'] = int(row['Idade'])
            certificate_buffer = BytesIO(template_buffer.getvalue())

            if variable_mapping:
                row_variable_mapping = {}
                for template_var, column_name in variable_mapping.items():
                    if column_name and column_name in row:
                        row_variable_mapping[template_var] = row[column_name]
                print('Row variable mapping: ', row_variable_mapping)
                if is_docx:
                    # certificate_buffer = replace_variables_in_docx(certificate_buffer, row_variable_mapping)
                    certificate_buffer = replace_variables_in_docx_liquid(certificate_buffer, row_variable_mapping)
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