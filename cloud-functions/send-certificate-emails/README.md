# Cloud Function: send-certificate-emails

Responsável por enviar os certificados gerados por email para os destinatários. Busca os PDFs no Google Cloud Storage e os envia via Gmail SMTP com suporte a envio concorrente.

O fluxo consiste em:

1. Receber os dados da emissão e a lista de destinatários via requisição HTTP.
2. Buscar os PDFs de cada destinatário no bucket do GCS.
3. Enviar emails HTML com o certificado em anexo via Gmail SMTP.
4. Notificar a aplicação principal com o status de envio via callback.

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
    functions-framework --target=main --port=8081 --debug
    ```

A função ficará acessível em: `http://localhost:8081`
