# Cestas Básicas União - Chat Bot

Sistema de pedidos de cestas básicas via chat com integração WhatsApp.

## Características

- Interface de chat interativa
- Catálogo de cestas básicas
- Integração com WhatsApp para envio de pedidos
- Processamento assíncrono de mensagens
- Feedback visual durante o processamento

## Requisitos

- Python 3.13.0
- WhatsApp Web (para envio de mensagens)
- Navegador web moderno

## Configuração Local

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd cestas_basicas_uniao
```

2. Crie um ambiente virtual e ative-o:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. Instale as dependências:
```bash
pip install -r requirements.txt
```

4. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto com:
```
FLASK_SECRET_KEY=sua_chave_secreta
WHATSAPP_NUMBER=5551999999999
FLASK_ENV=development
```

5. Execute o servidor:
```bash
python app.py
```

## Deploy

### Heroku

1. Instale o [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

2. Faça login no Heroku:
```bash
heroku login
```

3. Crie um novo app:
```bash
heroku create seu-app-name
```

4. Configure as variáveis de ambiente:
```bash
heroku config:set FLASK_SECRET_KEY=sua_chave_secreta
heroku config:set WHATSAPP_NUMBER=5551999999999
heroku config:set FLASK_ENV=production
```

5. Faça o deploy:
```bash
git push heroku main
```

### Outras Plataformas

O projeto está configurado para rodar em qualquer plataforma que suporte Python e WSGI. Os arquivos necessários já estão incluídos:

- `Procfile`: Configuração para servidores WSGI
- `runtime.txt`: Especifica a versão do Python
- `requirements.txt`: Lista todas as dependências

## Estrutura do Projeto

```
cestas_basicas_uniao/
├── app.py              # Aplicação principal
├── requirements.txt    # Dependências
├── Procfile           # Configuração para deploy
├── runtime.txt        # Versão do Python
├── .env              # Variáveis de ambiente (não versionado)
├── static/           # Arquivos estáticos
│   ├── css/         # Estilos
│   ├── js/          # JavaScript
│   └── img/         # Imagens
└── templates/        # Templates HTML
```

## Segurança

- Todas as configurações sensíveis devem ser definidas através de variáveis de ambiente
- Em produção, sempre use HTTPS
- Mantenha o WhatsApp Web logado no servidor de produção

## Suporte

Para suporte, entre em contato através do WhatsApp: [número da empresa]
