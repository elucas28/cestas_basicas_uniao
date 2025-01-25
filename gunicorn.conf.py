import os

# Configuração do Gunicorn para o Render
bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"
workers = 1
worker_class = "gevent"
timeout = 120
keepalive = 5
