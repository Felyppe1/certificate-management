from threading import Event, Lock, current_thread
import functions_framework
from dotenv import load_dotenv
import os
import requests
from io import BytesIO
from docx import Document
from docx.text.paragraph import Paragraph
from pptx import Presentation
from google.cloud import storage
from google.cloud.storage.blob import Blob
import re
import google.auth.transport.requests
import google.oauth2.id_token
import zipfile
from liquid import Template
import base64
import json
import sys
from pydantic import BaseModel, Field, ValidationError
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

import tempfile
import subprocess

load_dotenv()

AUDIENCE = os.getenv("TOKEN_AUDIENCE", 'http://localhost:3000') # For local environments
SOFFICE_PATH = os.getenv('SOFFICE_PATH')
CERTIFICATES_BUCKET = os.getenv('CERTIFICATES_BUCKET')
APP_SERVICE_NAME = os.getenv('APP_SERVICE_NAME')
GCP_PROJECT_NUMBER = os.getenv('GCP_PROJECT_NUMBER')
GCP_REGION = os.getenv('GCP_REGION')

if APP_SERVICE_NAME and GCP_PROJECT_NUMBER and GCP_REGION:
    APP_BASE_URL = f"https://{APP_SERVICE_NAME}-{GCP_PROJECT_NUMBER}.{GCP_REGION}.run.app"
else:
    APP_BASE_URL = 'http://localhost:3000'

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



################################ Functions to use bucket ################################
def upload_to_bucket(file_buffer, file_path):
    bucket = storage_client.bucket(CERTIFICATES_BUCKET)
    blob = bucket.blob(file_path)
    blob.upload_from_file(file_buffer, rewind=True, content_type="application/pdf")
    return blob

def get_from_bucket(file_path) -> Blob:
    bucket = storage_client.bucket(CERTIFICATES_BUCKET)
    return bucket.blob(file_path)

def delete_by_prefix(prefix: str):
    bucket = storage_client.bucket(CERTIFICATES_BUCKET)

    blobs = bucket.list_blobs(prefix=prefix)

    deleted_files = []
    for blob in blobs:
        blob.delete()
        deleted_files.append(blob.name)

    return deleted_files



################################ Functions to call backend endpoints ################################
def finish_certificates_generation(data_source_row_id, success, total_bytes=None):
    print('Inside update')
    url = f"{APP_BASE_URL}/api/internal/data-source-rows/{data_source_row_id}/generations"
    auth_req = google.auth.transport.requests.Request()

    id_token = google.oauth2.id_token.fetch_id_token(auth_req, AUDIENCE)

    headers = {
        "Authorization": f"Bearer {id_token}",
        "Content-Type": "application/json",
    }
    
    body = {k: v for k, v in {
        "success": success,
        "totalBytes": total_bytes,
    }.items() if v is not None}

    print('before sending patch')
    response = requests.patch(url, json=body, headers=headers)
    response.raise_for_status()

def refresh_google_token(user_id):
    print('Refreshing google token')

    url = f"{APP_BASE_URL}/api/internal/auth/google/access-token"
    auth_req = google.auth.transport.requests.Request()

    id_token = google.oauth2.id_token.fetch_id_token(auth_req, AUDIENCE)

    headers = {
        "Authorization": f"Bearer {id_token}",
        "Content-Type": "application/json",
    }
    
    body = {
        "userId": user_id
    }

    response = requests.post(url, json=body, headers=headers)
    if response.status_code != 200:
        raise Exception("Falha crítica ao renovar o token: " + response.text)

    return response.json()["accessToken"]







# def refresh_google_token(refresh_token: str) -> str:
#     url = "https://oauth2.googleapis.com/token"
#     data = {
#         "client_id": GOOGLE_CLIENT_ID,
#         "client_secret": GOOGLE_CLIENT_SECRET,
#         "refresh_token": refresh_token,
#         "grant_type": "refresh_token",
#     }
    
#     response = requests.post(url, data=data)
#     if response.status_code != 200:
#         raise Exception("Falha crítica ao renovar o token: " + response.text)
#     print(response.json())
#     return response.json()["access_token"]

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

    output_buffer = BytesIO()
    prs.save(output_buffer)
    output_buffer.seek(0)
    return output_buffer


################################ Functions to process PPTX with Liquid ################################
def pptx_paragraph_iterator(prs):
    """
    Yields tuples of (paragraph, shape) for all paragraphs in the presentation.
    Includes text frames, tables, and grouped shapes.
    """
    def process_shape(shape):
        if hasattr(shape, "text_frame") and shape.text_frame:
            for paragraph in shape.text_frame.paragraphs:
                yield (paragraph, shape)

        if shape.has_table:
            for row in shape.table.rows:
                for cell in row.cells:
                    for paragraph in cell.text_frame.paragraphs:
                        yield (paragraph, shape)

        if shape.shape_type == 6:  # MSO_SHAPE_TYPE.GROUP
            for subshape in shape.shapes:
                yield from process_shape(subshape)

    for slide in prs.slides:
        for shape in slide.shapes:
            yield from process_shape(shape)


def consolidate_broken_runs_pptx(paragraph):
    """Merges runs within the SAME paragraph to fix PowerPoint breaks."""
    text = "".join(run.text for run in paragraph.runs)
    if not ('{{' in text or '{%' in text):
        return

    runs = paragraph.runs
    if not runs:
        return

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


def process_buffer_pptx(paragraph_list, text_list, context):
    """
    Takes N paragraphs, joins the text, runs Liquid, and returns the result
    in the FIRST paragraph, clearing the others.
    """
    complete_text = "\n".join(text_list)
    
    if not ("{{" in complete_text or "{%" in complete_text):
        return

    sanitized_text = (complete_text
                      .replace('“', '"').replace('”', '"')
                      .replace('‘', "'").replace('’', "'"))
    
    if "append" in sanitized_text:
        print(f"DEBUG LIQUID PPTX: {sanitized_text}")
        
    try:
        template = Template(sanitized_text)
        new_complete_text = template.render(**context)
        
        if new_complete_text == complete_text:
            return

        main_paragraph = paragraph_list[0]
        
        for run in main_paragraph.runs:
            run.text = ""
        
        if main_paragraph.runs:
            main_paragraph.runs[0].text = new_complete_text
        else:
            main_paragraph.add_run().text = new_complete_text

        for p in paragraph_list[1:]:
            for run in p.runs:
                run.text = ""

    except Exception as e:
        print(f"Error Liquid block started in '{text_list[0][:20]}...': {e}")


def replace_variables_in_pptx_liquid(in_buffer, context_data):
    in_buffer.seek(0)
    prs = Presentation(in_buffer)
    
    # 1. Pre-processing: Consolidate runs (intra-line)
    all_paragraphs = list(pptx_paragraph_iterator(prs))
    for p, _ in all_paragraphs:
        consolidate_broken_runs_pptx(p)

    # 2. Processing with Buffer (Inter-line)
    buffer_paragraphs = []
    accumulated_text = []
    block_level = 0

    idx = 0
    while idx < len(all_paragraphs):
        p, _ = all_paragraphs[idx]
        paragraph_text = "".join(run.text for run in p.runs)
        
        delta = calculate_delta_blocks(paragraph_text)
        
        if block_level > 0 or (delta > 0):
            buffer_paragraphs.append(p)
            accumulated_text.append(paragraph_text)
            block_level += delta
            
            if block_level == 0:
                process_buffer_pptx(buffer_paragraphs, accumulated_text, context_data)
                buffer_paragraphs = []
                accumulated_text = []
                
        else:
            process_buffer_pptx([p], [paragraph_text], context_data)
        
        idx += 1

    if buffer_paragraphs:
        print("WARNING: Liquid block not closed at the end of the presentation.")
        process_buffer_pptx(buffer_paragraphs, accumulated_text, context_data)

    # 3. Save
    out_buffer = BytesIO()
    prs.save(out_buffer)
    out_buffer.seek(0)
    return out_buffer

def convert_to_pdf_with_libreoffice(input_bytes: BytesIO, input_ext: str) -> BytesIO:
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, f"input.{input_ext}")
        output_path = os.path.join(tmpdir, f"input.pdf")
        user_profile = os.path.join(tmpdir, "profile")

        with open(input_path, "wb") as f:
            f.write(input_bytes.read())

        result = subprocess.run([
            SOFFICE_PATH,
            "--headless",
            f"-env:UserInstallation=file://{user_profile}",
            "--convert-to", "pdf",
            "--outdir", tmpdir,
            input_path
        ], check=True)

        if result.returncode != 0:
            raise RuntimeError(
                f"LibreOffice failed:\nSTDOUT={result.stdout.decode()}\nSTDERR={result.stderr.decode()}"
            )

        with open(output_path, "rb") as pdf_file:
            pdf_bytes = BytesIO(pdf_file.read())

    pdf_bytes.seek(0)
    return pdf_bytes

def save_to_local(buffer, file_path):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'wb') as f:
        f.write(buffer.getvalue())

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


CACHE = {}
IN_FLIGHT = {}
LOCK = Lock()

def get_template_cached(storage_file_url: str) -> bytes:
    thread_name = current_thread().name
    print(f"[{thread_name}] Requesting template: {storage_file_url}")

    template_blob = get_from_bucket(storage_file_url)
    template_blob.reload()
    generation = str(template_blob.generation)

    with LOCK:
        cached = CACHE.get(storage_file_url)
        if cached and cached["generation"] == generation:
            print(f"[{thread_name}] CACHE HIT (generation={generation})")
            return cached["bytes"]

        print(f"[{thread_name}] CACHE MISS")

        if storage_file_url in IN_FLIGHT:
            print(f"[{thread_name}] Another thread is downloading → waiting")
            event = IN_FLIGHT[storage_file_url]
            is_downloader = False
        else:
            print(f"[{thread_name}] Elected as downloader")
            event = Event()
            IN_FLIGHT[storage_file_url] = event
            is_downloader = True

    # 🔹 Threads that DO NOT download wait here
    if not is_downloader:
        event.wait()
        print(f"[{thread_name}] Download finished → reading from cache")
        return CACHE[storage_file_url]["bytes"]

    # 🔹 Only ONE thread arrives here
    try:
        print(f"[{thread_name}] Downloading template (generation={generation})")
        template_bytes = template_blob.download_as_bytes()

        with LOCK:
            CACHE[storage_file_url] = {
                "generation": generation,
                "bytes": template_bytes
            }
            print(f"[{thread_name}] Cache updated")
    finally:
        with LOCK:
            event.set()
            IN_FLIGHT.pop(storage_file_url, None)
            print(f"[{thread_name}] Released waiting threads")

    return template_bytes


class InputMethod(str, Enum):
    UPLOAD = "UPLOAD"
    URL = "URL"
    GOOGLE_DRIVE = "GOOGLE_DRIVE"

class TemplateFileExtension(str, Enum):
    PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    GOOGLE_SLIDES = 'application/vnd.google-apps.presentation',
    GOOGLE_DOCS = 'application/vnd.google-apps.document',
    DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

class DataSourceFileExtension(str, Enum):
    CSV = 'text/csv',
    XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ODS = 'application/vnd.oasis.opendocument.spreadsheet',
    GOOGLE_SHEETS = 'application/vnd.google-apps.spreadsheet'

class DataSourceRowModel(BaseModel):
    id: str
    data: Dict[str, Any]

class TemplateModel(BaseModel):
    storageFileUrl: Optional[str] = None
    fileExtension: TemplateFileExtension
    variables: List[str]

class ColumnType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    DATE = "date"
    ARRAY = "array"

class ArrayMetadata(BaseModel):
    separator: str

class Column(BaseModel):
    name: str
    type: ColumnType
    arrayMetadata: Optional[ArrayMetadata] = None

class DataSourceModel(BaseModel):
    columns: List[Column]

class CertificateEmissionModel(BaseModel):
    id: str
    userId: str
    variableColumnMapping: Optional[Dict[str, Optional[str]]] = None # Record<string, string | null> | null
    template: TemplateModel
    dataSource: DataSourceModel

class TriggerGenerateCertificatePDFsInput(BaseModel):
    certificateEmission: CertificateEmissionModel
    row: DataSourceRowModel

@functions_framework.http
def main(request):
    print('Generate PDFs function invoked via Pub/Sub Push')
    
    # raw_data = request.get_json(silent=True)
    # if raw_data is None:
    #     return {"error": "JSON is required"}, 400

    # try:
    #     input_data = TriggerGenerateCertificatePDFsInput(**raw_data)
        
    # except ValidationError as e:
    #     def format_pydantic_errors(errors):
    #         formatted_errors = []

    #         for error in errors:
    #             field = ".".join([str(x) for x in error['loc']])
    #             message = error['msg']
    #             formatted_errors.append({
    #                 "field": field,
    #                 "message": message
    #             })

    #         return formatted_errors

    #     friendly_errors = format_pydantic_errors(e.errors())
    #     print("Validation errors:", friendly_errors)
    #     return {"error": "Invalid fields", "details": friendly_errors}, 400

    envelop = request.get_json()
    data_source_row_id = None

    try:
        pubsub_message = envelop.get('message', {})
        data_str = base64.b64decode(pubsub_message.get('data', '')).decode('utf-8')
        raw_data = json.loads(data_str)

        data_source_row_id = raw_data.get('row', {}).get('id')
    except Exception as e:
        print(f"Error to decode message: {e}")

        return "Invalid Pub/Sub format", 200
    
    try:
        input_data = TriggerGenerateCertificatePDFsInput(**raw_data)
        
        certificate_emission = input_data.certificateEmission
        certificate_emission_id = certificate_emission.id
        template = certificate_emission.template
        data_source = certificate_emission.dataSource
        variable_mapping = certificate_emission.variableColumnMapping or {}
        row = input_data.row
        data_source_row_id = row.id
        user_id = certificate_emission.userId
        # input_method = template.inputMethod.value
        file_mime_type = template.fileExtension.value

        template_buffer = None
        is_docx = None

        if file_mime_type in [DOCX_MIME_TYPE, GOOGLE_DOCS_MIME_TYPE]:
            is_docx = True
            file_extension_str = 'docx'
        elif file_mime_type in [PPTX_MIME_TYPE, GOOGLE_SLIDES_MIME_TYPE]:
            is_docx = False
            file_extension_str = 'pptx'
        else:
            raise Exception(f'Unsupported template file extension: {file_mime_type}')

        print('Loading template from bucket: ', template.storageFileUrl)
        template_bytes = get_template_cached(template.storageFileUrl)
        template_buffer = BytesIO(template_bytes)

        # inspecionar_runs_docx(template_buffer)
        print(f'Generating certificate for row {data_source_row_id}: ', row)
        certificate_buffer = BytesIO(template_buffer.getvalue())

        print('variable_mapping: ', variable_mapping)
        if variable_mapping:
            row_variable_mapping = {}
            for template_var, column_name in variable_mapping.items():
                if column_name and column_name in row.data:
                    for column in data_source.columns:
                        if column.name == column_name:
                            row_value = row.data[column_name]

                            if column.type == ColumnType.ARRAY:
                                row_variable_mapping[template_var] = row_value.split(column.arrayMetadata.separator)
                            elif column.type == ColumnType.BOOLEAN:
                                normalizedValue = row_value.lower().strip()

                                row_variable_mapping[template_var] = True if normalizedValue == 'true' or normalizedValue == '1' else False
                            elif column.type == ColumnType.NUMBER:
                                row_variable_mapping[template_var] = float(row_value)
                            else:
                                row_variable_mapping[template_var] = row_value
                            
                            break
            print('Row variable mapping: ', row_variable_mapping)
            if is_docx:
                certificate_buffer = replace_variables_in_docx_liquid(certificate_buffer, row_variable_mapping)
            else:
                certificate_buffer = replace_variables_in_pptx_liquid(certificate_buffer, row_variable_mapping)
        
        pdf_buffer = convert_to_pdf_with_libreoffice(certificate_buffer, file_extension_str)

        pdf_path = f"users/{user_id}/certificates/{certificate_emission_id}/certificate-{data_source_row_id}.pdf"
        blob = upload_to_bucket(pdf_buffer, pdf_path)

        finish_certificates_generation(data_source_row_id, True, blob.size)
        
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
        
        if data_source_row_id:
            finish_certificates_generation(data_source_row_id, False)
            
        return {"error": friendly_errors}, 200
    
    except Exception as e:
        original_error = str(e)
        update_error = None

        try:
            print('Sending error status update...')
            if data_source_row_id:
                finish_certificates_generation(data_source_row_id, False)
        except Exception as inner_e:
            update_error = str(inner_e)

        details = original_error if not update_error else f'Original error: {original_error}; Update error: {update_error}'

        print('Error details:', details)
        return {
            'title': 'Failed to generate certificates',
            'details': details
        }, 200