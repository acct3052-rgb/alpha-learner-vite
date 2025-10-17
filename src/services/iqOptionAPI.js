/**
 * IQ Option API - WebSocket Direct Connection
 * 
 * ATENÇÃO: Esta é uma implementação não oficial da API da IQ Option.
 * O uso pode violar os Termos de Serviço. Use por sua conta e risco.
 * 
 * Funcionalidades:
 * - Conexão via WebSocket
 * - Login e autenticação
 * - Obter candles (velas)
 * - Subscrever cotações em tempo real
 * - Fazer operações (trades)
 * - Consultar saldo
 */

class IQOptionAPI {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.requestId = 1;
        this.callbacks = new Map();
        this.ssid = null;
        this.listeners = new Map();
    }

    /**
     * Conectar à IQ Option
     * @param {string} email - Email da conta IQ Option
     * @param {string} password - Senha da conta IQ Option
     * @param {boolean} practice - true para conta demo, false para real
     */
    async connect(email, password, practice = true) {
        return new Promise((resolve, reject) => {
            // ATENÇÃO: Este endpoint pode não ser o correto
            // A IQ Option não fornece documentação oficial
            const wsUrl = 'wss://iqoption.com/echo/websocket';
            
            try {
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('✅ Conectado ao WebSocket da IQ Option');
                    // Fazer login
                    this.login(email, password, practice)
                        .then(resolve)
                        .catch(reject);
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ Erro no WebSocket:', error);
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    console.log('⚠️ Conexão WebSocket fechada');
                    this.isConnected = false;
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Fazer login na IQ Option
     */
    async login(email, password, practice) {
        const message = {
            name: 'ssid',
            msg: {
                email,
                password,
                platform: practice ? 'PRACTICE' : 'REAL'
            },
            request_id: this.requestId++
        };
        
        const response = await this.sendRequest(message);
        
        if (response && response.msg && response.msg.ssid) {
            this.ssid = response.msg.ssid;
            this.isConnected = true;
            console.log('✅ Login bem-sucedido!');
        }
        
        return response;
    }

    /**
     * Enviar requisição e aguardar resposta
     */
    sendRequest(message) {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket não está conectado'));
                return;
            }
            
            const requestId = message.request_id;
            
            this.callbacks.set(requestId, { resolve, reject });
            
            this.ws.send(JSON.stringify(message));
            
            // Timeout de 30 segundos
            setTimeout(() => {
                if (this.callbacks.has(requestId)) {
                    this.callbacks.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Processar mensagens recebidas
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            // Resposta a uma requisição específica
            if (message.request_id && this.callbacks.has(message.request_id)) {
                const { resolve } = this.callbacks.get(message.request_id);
                this.callbacks.delete(message.request_id);
                resolve(message);
                return;
            }
            
            // Mensagem de broadcast (candles, quotes, etc)
            this.processMessage(message);
        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
        }
    }

    /**
     * Processar mensagens em tempo real
     */
    processMessage(message) {
        if (!message.name) return;
        
        // Notificar listeners registrados
        if (this.listeners.has(message.name)) {
            const callbacks = this.listeners.get(message.name);
            callbacks.forEach(callback => callback(message));
        }
        
        // Log para debug
        if (message.name !== 'heartbeat') {
            console.log('📨 Mensagem recebida:', message.name);
        }
    }

    /**
     * Registrar listener para tipo de mensagem
     * @param {string} messageType - Tipo de mensagem (ex: 'candles', 'quotes')
     * @param {Function} callback - Função a ser chamada quando mensagem chegar
     */
    on(messageType, callback) {
        if (!this.listeners.has(messageType)) {
            this.listeners.set(messageType, []);
        }
        this.listeners.get(messageType).push(callback);
    }

    /**
     * Remover listener
     */
    off(messageType, callback) {
        if (!this.listeners.has(messageType)) return;
        
        const callbacks = this.listeners.get(messageType);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Obter candles (velas) de um ativo
     * @param {string} active - Par de moedas (ex: 'EURUSD')
     * @param {number} size - Tamanho do candle em segundos (60, 300, 900, etc)
     * @param {number} count - Quantidade de candles
     * @param {number} from - Timestamp de início (opcional)
     */
    async getCandles(active, size = 60, count = 100, from = null) {
        const message = {
            name: 'candles',
            msg: {
                active_id: active,
                size: size,
                count: count,
                from: from || Math.floor(Date.now() / 1000)
            },
            request_id: this.requestId++
        };
        
        return this.sendRequest(message);
    }

    /**
     * Subscrever a candles em tempo real
     * @param {string} active - Par de moedas
     * @param {number} size - Tamanho do candle em segundos
     */
    subscribeCandles(active, size = 60) {
        const message = {
            name: 'subscribeMessage',
            msg: {
                name: 'candle-generated',
                params: {
                    routingFilters: {
                        active_id: active,
                        size: size
                    }
                }
            }
        };
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            console.log(`✅ Inscrito em candles: ${active} (${size}s)`);
        }
    }

    /**
     * Subscrever a cotações em tempo real
     * @param {string} active - Par de moedas
     */
    subscribeQuotes(active) {
        const message = {
            name: 'subscribeMessage',
            msg: {
                name: 'quote-generated',
                params: {
                    routingFilters: {
                        active_id: active
                    }
                }
            }
        };
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            console.log(`✅ Inscrito em quotes: ${active}`);
        }
    }

    /**
     * Cancelar subscrição de candles
     */
    unsubscribeCandles(active, size = 60) {
        const message = {
            name: 'unsubscribeMessage',
            msg: {
                name: 'candle-generated',
                params: {
                    routingFilters: {
                        active_id: active,
                        size: size
                    }
                }
            }
        };
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Fazer uma operação (OPÇÕES BINÁRIAS)
     * @param {string} active - Par de moedas
     * @param {number} amount - Valor em USD
     * @param {string} direction - 'call' ou 'put'
     * @param {number} duration - Duração em minutos
     */
    async trade(active, amount, direction, duration) {
        const message = {
            name: 'binary-options.open-option',
            msg: {
                active_id: active,
                amount: amount,
                direction: direction === 'call' ? 'call' : 'put',
                expired: duration,
                option_type_id: 3, // Binary options
                user_balance_id: null // Usar saldo padrão
            },
            request_id: this.requestId++
        };
        
        return this.sendRequest(message);
    }

    /**
     * Obter perfil e saldo da conta
     */
    async getProfile() {
        const message = {
            name: 'profile',
            request_id: this.requestId++
        };
        
        return this.sendRequest(message);
    }

    /**
     * Obter saldo da conta
     */
    async getBalance() {
        const profile = await this.getProfile();
        if (profile && profile.msg && profile.msg.balances) {
            return profile.msg.balances.find(b => b.type === 'PRACTICE' || b.type === 'REAL');
        }
        return null;
    }

    /**
     * Obter lista de ativos disponíveis
     */
    async getActives() {
        const message = {
            name: 'get-initialization-data',
            request_id: this.requestId++
        };
        
        return this.sendRequest(message);
    }

    /**
     * Verificar se um ativo está aberto para trading
     * @param {string} active - Nome do ativo
     */
    async isActiveOpen(active) {
        const message = {
            name: 'get-active-schedule',
            msg: {
                active_id: active
            },
            request_id: this.requestId++
        };
        
        return this.sendRequest(message);
    }

    /**
     * Obter operações abertas
     */
    async getOpenPositions() {
        const message = {
            name: 'get-positions',
            msg: {
                instrument_type: 'binary-option'
            },
            request_id: this.requestId++
        };
        
        return this.sendRequest(message);
    }

    /**
     * Desconectar
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.isConnected = false;
            this.ssid = null;
            this.callbacks.clear();
            this.listeners.clear();
            console.log('✅ Desconectado da IQ Option');
        }
    }

    /**
     * Verificar se está conectado
     */
    get connected() {
        return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

export default IQOptionAPI;
