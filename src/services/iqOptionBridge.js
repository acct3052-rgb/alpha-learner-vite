/**
 * IQ Option Bridge Client
 * 
 * Cliente JavaScript para comunicação com servidor Python Bridge
 * que usa a biblioteca iqoptionapi.
 * 
 * ATENÇÃO: Requer servidor Python rodando (veja IQOPTION_SETUP.md)
 * 
 * Uso:
 * 1. Inicie o servidor Python: python python_bridge/iqoption_server.py
 * 2. Conecte usando esta classe
 */

class IQOptionBridge {
    constructor(bridgeUrl = 'http://localhost:5000') {
        this.bridgeUrl = bridgeUrl;
        this.isConnected = false;
        this.eventSource = null;
    }

    /**
     * Conectar à IQ Option via Bridge Python
     * @param {string} email - Email da conta
     * @param {string} password - Senha da conta
     * @param {boolean} practice - true = demo, false = real
     */
    async connect(email, password, practice = true) {
        try {
            const response = await fetch(`${this.bridgeUrl}/api/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    practice
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Falha na conexão');
            }

            const data = await response.json();
            
            if (data.success) {
                this.isConnected = true;
                console.log('✅ Conectado à IQ Option via Bridge Python');
                return true;
            } else {
                console.error('❌ Erro ao conectar:', data.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro na conexão com Bridge:', error);
            throw error;
        }
    }

    /**
     * Obter saldo da conta
     * @returns {Promise<number>} Saldo em USD
     */
    async getBalance() {
        try {
            const response = await fetch(`${this.bridgeUrl}/api/balance`);
            
            if (!response.ok) {
                throw new Error('Falha ao obter saldo');
            }
            
            const data = await response.json();
            return data.balance;
        } catch (error) {
            console.error('❌ Erro ao obter saldo:', error);
            throw error;
        }
    }

    /**
     * Obter candles (velas) históricos
     * @param {string} active - Par de moedas (ex: 'EURUSD')
     * @param {number} size - Tamanho do candle em segundos (60, 300, 900, etc)
     * @param {number} count - Quantidade de candles
     * @returns {Promise<Array>} Array de candles
     */
    async getCandles(active, size = 60, count = 100) {
        try {
            const response = await fetch(`${this.bridgeUrl}/api/candles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active, size, count })
            });
            
            if (!response.ok) {
                throw new Error('Falha ao obter candles');
            }
            
            const data = await response.json();
            return data.candles;
        } catch (error) {
            console.error('❌ Erro ao obter candles:', error);
            throw error;
        }
    }

    /**
     * Fazer uma operação
     * @param {string} active - Par de moedas
     * @param {number} amount - Valor em USD
     * @param {string} direction - 'call' ou 'put'
     * @param {number} duration - Duração em minutos
     * @returns {Promise<Object>} Resultado da operação
     */
    async trade(active, amount, direction, duration = 1) {
        try {
            const response = await fetch(`${this.bridgeUrl}/api/trade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    active,
                    amount,
                    direction,
                    duration
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Falha na operação');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ Erro ao fazer trade:', error);
            throw error;
        }
    }

    /**
     * Obter lista de ativos disponíveis
     * @returns {Promise<Array>} Lista de ativos
     */
    async getActives() {
        try {
            const response = await fetch(`${this.bridgeUrl}/api/actives`);
            
            if (!response.ok) {
                throw new Error('Falha ao obter ativos');
            }
            
            const data = await response.json();
            return data.actives;
        } catch (error) {
            console.error('❌ Erro ao obter ativos:', error);
            throw error;
        }
    }

    /**
     * Obter operações abertas
     * @returns {Promise<Array>} Lista de operações abertas
     */
    async getOpenPositions() {
        try {
            const response = await fetch(`${this.bridgeUrl}/api/positions`);
            
            if (!response.ok) {
                throw new Error('Falha ao obter posições');
            }
            
            const data = await response.json();
            return data.positions;
        } catch (error) {
            console.error('❌ Erro ao obter posições:', error);
            throw error;
        }
    }

    /**
     * Obter histórico de operações
     * @param {number} count - Quantidade de operações
     * @returns {Promise<Array>} Histórico
     */
    async getTradeHistory(count = 50) {
        try {
            const response = await fetch(`${this.bridgeUrl}/api/history?count=${count}`);
            
            if (!response.ok) {
                throw new Error('Falha ao obter histórico');
            }
            
            const data = await response.json();
            return data.history;
        } catch (error) {
            console.error('❌ Erro ao obter histórico:', error);
            throw error;
        }
    }

    /**
     * Verificar se o Bridge está online
     * @returns {Promise<boolean>} true se online
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.bridgeUrl}/api/health`, {
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.error('❌ Bridge não está respondendo:', error);
            return false;
        }
    }

    /**
     * Subscrever a cotações em tempo real via Server-Sent Events
     * @param {string} active - Par de moedas
     * @param {Function} callback - Função a ser chamada com novas cotações
     */
    subscribeQuotes(active, callback) {
        if (this.eventSource) {
            this.eventSource.close();
        }

        const url = `${this.bridgeUrl}/api/stream/quotes?active=${active}`;
        this.eventSource = new EventSource(url);

        this.eventSource.onmessage = (event) => {
            try {
                const quote = JSON.parse(event.data);
                callback(quote);
            } catch (error) {
                console.error('❌ Erro ao processar quote:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('❌ Erro no stream:', error);
            this.eventSource.close();
        };

        console.log(`✅ Inscrito em quotes: ${active}`);
    }

    /**
     * Cancelar subscrição de cotações
     */
    unsubscribeQuotes() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            console.log('✅ Subscrição cancelada');
        }
    }

    /**
     * Desconectar do bridge
     */
    async disconnect() {
        try {
            this.unsubscribeQuotes();
            
            const response = await fetch(`${this.bridgeUrl}/api/disconnect`, {
                method: 'POST'
            });
            
            this.isConnected = false;
            console.log('✅ Desconectado do Bridge');
            
            return response.ok;
        } catch (error) {
            console.error('❌ Erro ao desconectar:', error);
            return false;
        }
    }

    /**
     * Verificar se está conectado
     */
    get connected() {
        return this.isConnected;
    }
}

export default IQOptionBridge;
