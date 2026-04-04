# Cloud Function: generate-pdfs

Responsável por gerar certificados em PDF a partir de templates com sintaxe [Liquid](https://shopify.github.io/liquid/). Suporta templates nos formatos DOCX, Google Docs, PPTX e Google Slides.

O fluxo consiste em:

1. Receber os dados das linhas da fonte de dados via requisição HTTP.
2. Baixar o template do Google Cloud Storage.
3. Renderizar as variáveis Liquid no template.
4. Converter o documento em PDF usando Google Drive.
5. Fazer upload do PDF gerado para o bucket no Cloud Storage.
6. Notificar a aplicação principal com o status da geração via callback.

## Pré‑requisitos

- Python 3.12+

## Variáveis de ambiente

Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env
```

## Como rodar

1. **Crie e ative um ambiente virtual Python**:

    ```bash
    python -m venv .venv
    source .venv/bin/activate
    ```

2. **Instale as dependências**:

    ```bash
    pip install -r requirements.txt
    ```

3. **Rode a função localmente**:
    ```bash
    functions-framework --target=main --port=8080 --debug
    ```

A função ficará acessível em: `http://localhost:8080`