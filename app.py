from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import pywhatkit
import json
from datetime import datetime
import os
from dotenv import load_dotenv
import re
import time
from whitenoise import WhiteNoise

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'default_secret_key')
app.config['DEBUG'] = os.getenv('FLASK_ENV') == 'development'

# Configurar WhiteNoise para servir arquivos estáticos
app.wsgi_app = WhiteNoise(app.wsgi_app, root='static/', prefix='static/')

# Configurar SocketIO com modo de threading para produção
socketio = SocketIO(app, 
                   async_mode='threading',
                   cors_allowed_origins=os.getenv('CORS_ORIGINS', '*'),
                   ping_timeout=60,
                   ping_interval=25)

# Configurações das cestas básicas
CESTAS = [
    {
        'id': 0,
        'nome': 'Cesta Básica Tipo 1',
        'preco': 125.00,
        'itens': [
            '5 Kg Arroz Tipo 1 Branco',
            '2 kg Farinha de Trigo',
            '2 Un. Óleo de Soja',
            '2 kg Açúcar Refinado',
            '2 kg Feijão Preto Tipo 1',
            '1 Pct. Café 250gr Melitta',
            '1 Lt. Achoc. NESCAU 370 gr',
            '1 kg Sal Refinado',
            '1 Pct. Polentina',
            '1 Pct. Massa Parafuso 500g',
            '1 Pct. Massa Espaguete 500g',
            '1 Pacote Bolacha'
        ]
    },
    {
        'id': 1,
        'nome': 'Cesta Básica Tipo 2',
        'preco': 140.00,
        'itens': [
            '5 kg Arroz Tipo Branco',
            '2 Kg Farinha de Trigo',
            '2 Un. Óleo de Soja',
            '2 kg Açúcar Refinado',
            '2 kg Feijão Preto Tipo 1',
            '1 Pct Café 250gr Melitta',
            '1 Lt. Achoc. NESCAU 370 gr',
            '1 kg Sal Refinado',
            '1 Un Extrato de Tomate Sachê',
            '1 Pct Farofa',
            '1 Pct. Polentina 500gr',
            '1 Lt. Achoc.Nescau 370 gr',
            '1 Pt. Schimia ou 1 Goiabada',
            '2 Pct. Massa Espaguete 500g',
            '1 Pct. Massa Parafuso 500g',
            '1 Pct. Bolacha Doce'
        ]
    },
    {
        'id': 2,
        'nome': 'Cesta Básica Tipo 3',
        'preco': 190.00,
        'itens': [
            '10 kg Arroz Tipo 1 Branco',
            '3 Kg Farinha de Trigo',
            '4 Un. Óleo de Soja',
            '4 kg Açúcar Refinado',
            '2 kg Feijão Preto Tipo 1',
            '1 Pct. Café 250gr MELITTA',
            '1 kg Sal Refinado',
            '1 Un. Extrato de Tomate',
            '1 Pct. Farofa',
            '1 Pct. Polentina 500gr',
            '1 Und. Gelatina ou Pudim',
            '2 Pct. Massa Espaguete 500g',
            '1 Pct Massa Parafuso 500g',
            '1 Pct. Bolacha Salgada ou Doce',
            '1 Lt. Achoc. NESCAU 370gr'
        ]
    },
    {
        'id': 3,
        'nome': 'Cesta Básica Especial',
        'preco': 215.00,
        'itens': [
            '10 kg Arroz Tipo 1',
            '3 Kg Farinha de Trigo',
            '4 Un Óleo de Soja',
            '4 Kg Açúcar Refinado',
            '2 kg Feijão Preto Tipo 1',
            '1 Lt Ervilha',
            '1 Pct Café Melitta 500gr',
            '1 Pct. Mistura para Bolo',
            '1 kg Sal Refinado',
            '1 Lt. Extrato Tomate',
            '1 Pct. Farofa Temperada',
            '1 Pct. Polentina 500gr',
            '1 Pt. Schimia ou 1 Goiabada',
            '1 Un Gelatina',
            '1 Pct Suco',
            '2 Pct. Massa Espaguete 500g',
            '1 Pct. Massa Parafuso 500g',
            '1 Pct. Bolacha Salgada ou Doce',
            '1 Lt Achoc. NESCAU 370gr'
        ]
    }
]

# Número da empresa (agora vindo do .env)
NUMERO_EMPRESA = os.getenv('WHATSAPP_NUMBER')

pedido_info = {}

def validar_whatsapp(numero):
    # Remove caracteres não numéricos
    numero = re.sub(r'\D', '', numero)
    # Verifica se tem 11 dígitos (DDD + 9 + número)
    return len(numero) == 11 and numero.isdigit()

def validar_endereco(endereco):
    # Verifica se o endereço tem pelo menos 10 caracteres
    return len(endereco.strip()) >= 10

@app.route('/')
def home():
    return render_template('index.html')

@socketio.on('iniciar_conversa')
def handle_message():
    emit('mensagem_bot', {'mensagem': 'Olá, sou o assistente virtual da Cesta Básica União, me passa seu nome para iniciarmos o seu atendimento.'})

@socketio.on('enviar_nome')
def handle_nome(data):
    nome = data['nome']
    pedido_info['nome'] = nome
    mensagem = f'Prazer em conhecê-lo {nome}, agora me passa seu número de WhatsApp ex: (11)996961020'
    emit('mensagem_bot', {'mensagem': mensagem})

@socketio.on('receber_whatsapp')
def handle_whatsapp_number(data):
    numero = data['numero']
    if not validar_whatsapp(numero):
        emit('mensagem_bot', {'mensagem': 'Número de WhatsApp inválido. Por favor, digite no formato (11)996961020'})
        return
    pedido_info['whatsapp'] = numero
    emit('mensagem_bot', {'mensagem': 'Obrigado! Agora escolha a sua cesta:'})
    emit('mostrar_catalogo', {'cestas': CESTAS})

@socketio.on('escolher_cesta')
def handle_escolha_cesta(data):
    cesta_id = int(data['cesta_id'])
    pedido_info['cesta'] = CESTAS[cesta_id]
    emit('mostrar_itens_cesta', {'cesta': CESTAS[cesta_id]})
    emit('mensagem_bot', {'mensagem': 'Gostaria de fazer alguma troca de produtos?'})
    emit('mostrar_opcoes_troca')

@socketio.on('resposta_troca')
def handle_resposta_troca(data):
    if data['resposta'] == 'sim':
        emit('mensagem_bot', {'mensagem': 'Por favor, escreva o que você quer trocar (Ex: retirar 1 feijão colocar 1 óleo):'})
    else:
        pedido_info['trocas'] = 'Sem trocas'
        emit('mensagem_bot', {'mensagem': 'Por favor, me passe seu endereço para fazer a entrega:'})

@socketio.on('enviar_troca')
def handle_troca(data):
    pedido_info['trocas'] = data['troca']
    emit('mensagem_bot', {'mensagem': 'Por favor, me passe seu endereço para fazer a entrega:'})

@socketio.on('enviar_endereco')
def handle_endereco(data):
    endereco = data['endereco']
    if not validar_endereco(endereco):
        emit('mensagem_bot', {'mensagem': 'Endereço muito curto. Por favor, forneça um endereço completo.'})
        return
    pedido_info['endereco'] = endereco
    emit('mensagem_bot', {'mensagem': 'Qual a opção de pagamento?'})
    botoes_pagamento = [
        {'texto': 'PIX', 'valor': 'pix'},
        {'texto': 'Cartão', 'valor': 'cartao'},
        {'texto': 'Dinheiro', 'valor': 'dinheiro'}
    ]
    emit('mostrar_botoes', {'botoes': botoes_pagamento})

@socketio.on('enviar_pagamento')
def handle_pagamento(data):
    from datetime import datetime
    
    pedido_info['pagamento'] = data['pagamento']
    cesta = pedido_info['cesta']
    
    # Formatação da data/hora atual
    data_hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    # Formata o resumo do pedido com emojis e melhor organização
    resumo = f"""🛒 PEDIDO CESTAS BÁSICAS UNIÃO

📋 Detalhes do Cliente:
Nome: {pedido_info['nome']}
Telefone: {pedido_info['whatsapp']}
Endereço: {pedido_info['endereco']}

📦 Detalhes do Pedido:
{cesta['nome']} - R$ {cesta['preco']:.2f}

📝 Itens da Cesta:"""

    # Adiciona os itens da cesta numerados em linhas separadas
    for i, item in enumerate(cesta['itens'], 1):
        resumo += f"\n{i}. {item}"

    # Adiciona as trocas se houver
    if pedido_info.get('trocas') and pedido_info['trocas'] != 'Sem trocas':
        resumo += f"\n\n🔄 Trocas Solicitadas:\n{pedido_info['trocas']}"

    resumo += f"""

💰 Total do Pedido: R$ {cesta['preco']:.2f}

💳 Forma de Pagamento: {pedido_info['pagamento']}

⏰ Data/Hora: {data_hora}

Agradecemos sua preferência!
Em breve entraremos em contato para confirmar seu pedido."""

    emit('mensagem_bot', {'mensagem': resumo})
    pedido_info['resumo'] = resumo
    
    # Adiciona botão de envio por WhatsApp
    botao_whatsapp = {
        'texto': '📱 Enviar Pedido por WhatsApp',
        'valor': 'whatsapp',
        'estilo': 'whatsapp-button'
    }
    emit('mostrar_botao', {'botao': botao_whatsapp})

@socketio.on('enviar_whatsapp')
def handle_whatsapp_send():
    try:
        # Emite status inicial para mostrar indicador de digitação
        emit('whatsapp_status', {'status': 'processing'})
        
        # Pequeno delay para garantir que o WhatsApp Web esteja pronto
        time.sleep(2)
        
        # Formatação da mensagem do WhatsApp
        mensagem = f"""🛒 *PEDIDO CESTAS BÁSICAS UNIÃO*

📋 *Detalhes do Cliente:*
Nome: {pedido_info['nome']}
Telefone: {pedido_info['whatsapp']}
Endereço: {pedido_info['endereco']}

📦 *Detalhes do Pedido:*
{pedido_info['cesta']['nome']} - R$ {pedido_info['cesta']['preco']:.2f}

📝 *Itens da Cesta:*"""

        for i, item in enumerate(pedido_info['cesta']['itens'], 1):
            mensagem += f"\n{i}. {item}"

        if pedido_info.get('trocas') and pedido_info['trocas'] != 'Sem trocas':
            mensagem += f"\n\n🔄 *Trocas Solicitadas:*\n{pedido_info['trocas']}"

        mensagem += f"""

💰 *Total do Pedido:* R$ {pedido_info['cesta']['preco']:.2f}
💳 *Forma de Pagamento:* {pedido_info['pagamento']}"""

        # Formata o número do WhatsApp (remove caracteres não numéricos)
        numero = ''.join(filter(str.isdigit, NUMERO_EMPRESA))
        if not numero.startswith('55'):
            numero = '55' + numero

        # Envia mensagem via WhatsApp
        pywhatkit.sendwhatmsg_instantly(
            phone_no=f"+{numero}",
            message=mensagem,
            tab_close=True,
            wait_time=10  # Aumenta o tempo de espera para 10 segundos
        )
        
        # Pequeno delay antes de enviar a resposta de sucesso
        time.sleep(2)
        
        # Emite status de sucesso
        emit('whatsapp_status', {'success': True})
        
    except Exception as e:
        print(f"Erro ao enviar WhatsApp: {str(e)}")
        # Emite status de erro
        emit('whatsapp_status', {'success': False})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    socketio.run(app, 
                host='0.0.0.0',
                port=port,
                debug=app.config['DEBUG'])
