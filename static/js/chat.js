const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

let currentStep = 'nome';
let pedidoInfo = {
    nome: '',
    whatsapp: '',
    cesta: null,
    trocas: '',
    endereco: '',
    formaPagamento: ''
};

// Elementos do DOM
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Controle de mensagens sequenciais
let isProcessingMessage = false;
const messageQueue = [];

// Função para processar a fila de mensagens
async function processMessageQueue() {
    if (isProcessingMessage || messageQueue.length === 0) return;
    
    isProcessingMessage = true;
    const nextMessage = messageQueue.shift();
    
    try {
        await nextMessage();
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
    }
    
    isProcessingMessage = false;
    processMessageQueue();
}

// Função para adicionar mensagem à fila
function queueMessage(messageFunction) {
    messageQueue.push(messageFunction);
    processMessageQueue();
}

// Função para mostrar indicador de digitação
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator message message-bot';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingDiv);
    
    const clearDiv = document.createElement('div');
    clearDiv.className = 'clear';
    chatMessages.appendChild(clearDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typingDiv;
}

// Função para remover indicador de digitação
function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.nextElementSibling?.remove();
        indicator.remove();
    }
}

// Função para capitalizar primeira letra
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Função para formatar mensagem
function formatMessage(message) {
    // Divide a mensagem em frases (por pontos, exclamações ou interrogações)
    const sentences = message.split(/([.!?]+)/g);
    let formattedMessage = '';
    
    for (let i = 0; i < sentences.length; i++) {
        let sentence = sentences[i].trim();
        if (sentence) {
            // Se não for pontuação, capitaliza a primeira letra
            if (!sentence.match(/^[.!?]+$/)) {
                sentence = capitalizeFirstLetter(sentence);
            }
            formattedMessage += sentence;
            // Adiciona espaço após a pontuação, exceto no final
            if (i < sentences.length - 1 && sentences[i + 1] && !sentences[i + 1].match(/^[.!?]+$/)) {
                formattedMessage += ' ';
            }
        }
    }
    
    return formattedMessage;
}

// Função para adicionar mensagem ao chat com delay e feedback visual
async function addMessageWithDelay(message, isBot = false) {
    const formattedMessage = formatMessage(message);
    
    if (isBot) {
        const typingIndicator = showTypingIndicator();
        await new Promise(resolve => setTimeout(resolve, 2000));
        removeTypingIndicator(typingIndicator);
    } else {
        // Desabilita o input enquanto processa a mensagem
        userInput.disabled = true;
        sendButton.disabled = true;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isBot ? 'message-bot' : 'message-user'}`;
    messageDiv.textContent = formattedMessage;
    chatMessages.appendChild(messageDiv);
    
    const clearDiv = document.createElement('div');
    clearDiv.className = 'clear';
    chatMessages.appendChild(clearDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (!isBot) {
        // Reabilita o input após processar a mensagem
        userInput.disabled = false;
        sendButton.disabled = false;
        focusInput();
    }
}

// Função para adicionar botões com delay
async function addButtonsWithDelay(buttons) {
    const typingIndicator = showTypingIndicator();
    await new Promise(resolve => setTimeout(resolve, 2000));
    removeTypingIndicator(typingIndicator);

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'message message-bot';
    buttons.forEach(button => {
        buttonsDiv.appendChild(button);
    });
    chatMessages.appendChild(buttonsDiv);
    
    const clearDiv = document.createElement('div');
    clearDiv.className = 'clear';
    chatMessages.appendChild(clearDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Função para mostrar catálogo com delay
async function showCatalogWithDelay(data) {
    const typingIndicator = showTypingIndicator();
    await new Promise(resolve => setTimeout(resolve, 2000));
    removeTypingIndicator(typingIndicator);

    Object.entries(data.cestas).forEach(([id, cesta]) => {
        const cestaDiv = document.createElement('div');
        cestaDiv.className = 'message message-bot catalog-item';
        cestaDiv.innerHTML = `
            <h4>${cesta.nome}</h4>
            <ul>
                ${cesta.itens.map(item => `<li>${item}</li>`).join('')}
            </ul>
            <p class="price">Preço: ${cesta.preco}</p>
            <button class="btn btn-primary btn-option" onclick="escolherCesta(${id})">
                Escolher esta cesta
            </button>
        `;
        chatMessages.appendChild(cestaDiv);
    });
}

// Função para adicionar botão único
function addButton(button) {
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'button-container';
    
    const btn = document.createElement('button');
    btn.textContent = button.texto;
    btn.className = button.estilo || 'chat-button';
    btn.onclick = () => {
        if (button.valor === 'whatsapp') {
            socket.emit('enviar_whatsapp');
        } else {
            handleButtonClick(button.valor);
        }
    };
    
    buttonDiv.appendChild(btn);
    chatMessages.appendChild(buttonDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Iniciar conversa
socket.emit('iniciar_conversa');

// Receber mensagens do bot
socket.on('mensagem_bot', (data) => {
    queueMessage(async () => {
        await addMessageWithDelay(data.mensagem, true);
        restoreFocusAfterClick();
    });
});

// Mostrar catálogo
socket.on('mostrar_catalogo', (data) => {
    queueMessage(() => showCatalogWithDelay(data));
});

// Mostrar opções de troca
socket.on('mostrar_opcoes_troca', () => {
    const buttons = [
        createButton('Sim', 'btn-sim', () => handleTrocaResponse('sim')),
        createButton('Não', 'btn-nao', () => handleTrocaResponse('não'))
    ];
    queueMessage(() => addButtonsWithDelay(buttons));
});

// Mostrar opções de pagamento
socket.on('mostrar_opcoes_pagamento', () => {
    const buttons = [
        createButton('PIX', 'btn-option', () => handlePagamento('PIX')),
        createButton('Cartão', 'btn-option', () => handlePagamento('Cartão')),
        createButton('Dinheiro', 'btn-option', () => handlePagamento('Dinheiro'))
    ];
    queueMessage(() => addButtonsWithDelay(buttons));
});

// Mostrar botão
socket.on('mostrar_botao', (data) => {
    queueMessage(() => addButton(data.botao));
});

// Tratamento de erros de conexão
socket.on('connect_error', (error) => {
    addMessageWithDelay('Erro de conexão. Tentando reconectar...', true);
    console.error('Erro de conexão:', error);
});

socket.on('disconnect', () => {
    addMessageWithDelay('Conexão perdida. Tentando reconectar...', true);
});

socket.on('reconnect', (attemptNumber) => {
    addMessageWithDelay('Reconectado com sucesso!', true);
});

socket.on('reconnect_failed', () => {
    addMessageWithDelay('Não foi possível reconectar. Por favor, recarregue a página.', true);
});

// Função para criar botão
function createButton(text, className, onClick) {
    const button = document.createElement('button');
    button.className = `btn ${className}`;
    button.textContent = text;
    button.onclick = onClick;
    return button;
}

// Handler para envio de mensagem
function handleSend() {
    const message = userInput.value.trim();
    if (!message) return;

    queueMessage(() => addMessageWithDelay(message, false));
    
    switch(currentStep) {
        case 'nome':
            pedidoInfo.nome = capitalizeFirstLetter(message);
            socket.emit('enviar_nome', { nome: pedidoInfo.nome });
            currentStep = 'whatsapp';
            break;
        case 'whatsapp':
            pedidoInfo.whatsapp = message;
            socket.emit('receber_whatsapp', { numero: message });
            currentStep = 'cesta';
            break;
        case 'troca':
            pedidoInfo.trocas = capitalizeFirstLetter(message);
            socket.emit('enviar_troca', { troca: pedidoInfo.trocas });
            currentStep = 'endereco';
            break;
        case 'endereco':
            pedidoInfo.endereco = capitalizeFirstLetter(message);
            socket.emit('enviar_endereco', { endereco: pedidoInfo.endereco });
            currentStep = 'pagamento';
            break;
        case 'pagamento':
            pedidoInfo.pagamento = capitalizeFirstLetter(message);
            socket.emit('enviar_pagamento', { pagamento: pedidoInfo.pagamento });
            currentStep = 'finalizado';
            break;
    }
    
    userInput.value = '';
}

// Função para escolher cesta
function escolherCesta(id) {
    pedidoInfo.cesta = id;
    socket.emit('escolher_cesta', { cesta_id: id });
    currentStep = 'troca_opcao';
}

// Handler para resposta de troca
function handleTrocaResponse(resposta) {
    socket.emit('resposta_troca', { resposta });
    if (resposta === 'sim') {
        currentStep = 'troca';
    } else {
        currentStep = 'endereco';
    }
}

// Handler para forma de pagamento
function handlePagamento(forma) {
    pedidoInfo.formaPagamento = forma;
    const pedidoCompleto = `
*NOVO PEDIDO - CESTAS BÁSICAS UNIÃO*\n
Nome: ${pedidoInfo.nome}\n
WhatsApp: ${pedidoInfo.whatsapp}\n
Cesta escolhida: ${pedidoInfo.cesta}\n
${pedidoInfo.trocas ? `Trocas solicitadas: ${pedidoInfo.trocas}\n` : ''}
Endereço: ${pedidoInfo.endereco}\n
Forma de pagamento: ${pedidoInfo.formaPagamento}\n
`;

    queueMessage(() => addMessageWithDelay('Resumo do seu pedido:', true));
    queueMessage(() => addMessageWithDelay(pedidoCompleto, true));

    const btnWhatsApp = createWhatsAppButton();
    queueMessage(() => addButtonsWithDelay([btnWhatsApp]));
}

// Variável para controlar se um pedido está em andamento
let isProcessingOrder = false;

// Função para enviar pedido via WhatsApp
function enviarPedidoWhatsApp() {
    if (isProcessingOrder) {
        addMessageWithDelay('Aguarde, seu pedido está sendo processado...', true);
        return;
    }
    socket.emit('enviar_whatsapp');
}

// Função para criar botão do WhatsApp
function createWhatsAppButton() {
    const btnWhatsApp = document.createElement('button');
    btnWhatsApp.className = 'btn btn-success btn-whatsapp';
    btnWhatsApp.innerHTML = '<i class="fab fa-whatsapp"></i> Enviar Pedido por WhatsApp';
    btnWhatsApp.onclick = enviarPedidoWhatsApp;
    return btnWhatsApp;
}

// Handler para envio de WhatsApp
socket.on('whatsapp_status', async (data) => {
    if (data.status === 'processing') {
        isProcessingOrder = true;
        const typingIndicator = showTypingIndicator();
        
        // Aguarda 3 segundos para simular o processamento
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        removeTypingIndicator(typingIndicator);
    } else {
        isProcessingOrder = false;
        if (data.success) {
            addMessageWithDelay('Pedido enviado com sucesso! Em breve entraremos em contato via WhatsApp.', true);
        } else {
            addMessageWithDelay('Desculpe, houve um erro ao enviar o pedido. Por favor, tente novamente.', true);
        }
    }
});

// Função para focar no input
function focusInput() {
    userInput.focus();
}

// Prevenir que o foco seja perdido ao clicar em botões
document.addEventListener('mouseup', (e) => {
    if (!e.target.matches('button')) {
        focusInput();
    }
});

// Restaurar foco após clicar em botões
const restoreFocusAfterClick = () => setTimeout(focusInput, 100);

// Focar no input quando a página carregar
document.addEventListener('DOMContentLoaded', focusInput);

// Focar no input quando clicar em qualquer lugar da página
document.addEventListener('click', focusInput);

// Event listeners
sendButton.onclick = handleSend;
userInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
        handleSend();
    }
};
