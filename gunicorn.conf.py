import os
import multiprocessing

# Configuração do Gunicorn para o Render
bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"
workers = 1
worker_class = "eventlet"
worker_connections = 1000
timeout = 120
keepalive = 5

# Configurações para melhor performance
max_requests = 1000
max_requests_jitter = 50
graceful_timeout = 60

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'
