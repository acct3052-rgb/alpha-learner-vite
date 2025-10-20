# 🚀 Guia de Instalação - IQ Option API

## 📋 Sobre a IQ Option API

A IQ Option possui uma API para acesso a dados de trading, porém a documentação oficial é **limitada** e não é oficialmente recomendada para uso público. O acesso aos dados é principalmente feito através de **bibliotecas não oficiais** desenvolvidas pela comunidade.

### ⚠️ Aviso Importante

- A API da IQ Option **NÃO é oficial** para uso público
- As bibliotecas disponíveis são **não oficiais** e mantidas pela comunidade
- O uso pode violar os Termos de Serviço da IQ Option
- A IQ Option pode bloquear contas que usam APIs não oficiais
- **Use por sua conta e risco**

## 🔧 Opções de Integração

Como este projeto é baseado em **JavaScript/Node.js**, há duas abordagens principais:

### Opção 1: WebSocket Direct (Recomendado para Node.js)

Conectar diretamente via WebSocket ao servidor da IQ Option.

### Opção 2: API Bridge com Python

Usar uma biblioteca Python como intermediária e comunicar via API REST local.

---

## 📦 Opção 1: Integração WebSocket Node.js

### Passo 1: Instalar Dependências

```bash
npm install ws node-fetch
```

### Passo 2: Criar Módulo de Conexão IQ Option

Crie o arquivo `src/services/iqOptionAPI.js`:

```javascript
import WebSocket from 'ws';

class IQOptionAPI {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.requestId = 1;
        this.callbacks = new Map();
    }

    /**
     * Conectar à IQ Option
     * @param {string} email - Email da conta IQ Option
     * @param {string} password - Senha da conta IQ Option
     * @param {boolean} practice - true para conta demo, false para real
     */
    async connect(email, password, practice = true) {
        return new Promise((resolve, reject) => {
            const wsUrl = 'wss://iqoption.com/echo/websocket';
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.on('open', () => {
                console.log('✅ Conectado ao WebSocket da IQ Option');
                // Fazer login
                this.login(email, password, practice)
                    .then(resolve)
                    .catch(reject);
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ Erro no WebSocket:', error);
                reject(error);
            });
            
            this.ws.on('close', () => {
                console.log('⚠️ Conexão WebSocket fechada');
                this.isConnected = false;
            });
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
        
        return this.sendRequest(message);
    }

    /**
     * Enviar requisição e aguardar resposta
     */
    sendRequest(message) {
        return new Promise((resolve, reject) => {
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
            const message = JSON.parse(data.toString());
            
            if (message.request_id && this.callbacks.has(message.request_id)) {
                const { resolve } = this.callbacks.get(message.request_id);
                this.callbacks.delete(message.request_id);
                resolve(message);
            }
            
            // Processar outros tipos de mensagem (candles, quotes, etc)
            this.processMessage(message);
        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
        }
    }

    /**
     * Processar mensagens em tempo real
     */
    processMessage(message) {
        // Implementar processamento de candles, cotações, etc
        console.log('📨 Mensagem recebida:', message.name);
    }

    /**
     * Obter candles (velas) de um ativo
     * @param {string} active - Par de moedas (ex: 'EURUSD')
     * @param {number} size - Tamanho do candle em segundos (60, 300, 900, etc)
     * @param {number} count - Quantidade de candles
     */
    async getCandles(active, size, count) {
        const message = {
            name: 'candles',
            msg: {
                active_id: active,
                size: size,
                count: count
            },
            request_id: this.requestId++
        };
        
        return this.sendRequest(message);
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
                    active_id: active
                }
            }
        };
        
        this.ws.send(JSON.stringify(message));
    }

    /**
     * Fazer uma operação
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
                expired: duration
            },
            request_id: this.requestId++
        };
        
        return this.sendRequest(message);
    }

    /**
     * Obter saldo da conta
     */
    async getBalance() {
        const message = {
            name: 'profile',
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
        }
    }
}

export default IQOptionAPI;
```

### Passo 3: Integrar no TradingSystem.jsx

Adicione ao início do arquivo `src/TradingSystem.jsx`:

```javascript
import IQOptionAPI from './services/iqOptionAPI';
```

E adicione ao componente:

```javascript
const [iqOption, setIQOption] = useState(null);

// Função para conectar IQ Option
const connectIQOption = async (email, password, practice = true) => {
    try {
        const api = new IQOptionAPI();
        await api.connect(email, password, practice);
        setIQOption(api);
        console.log('✅ IQ Option conectado!');
        
        // Subscrever a dados em tempo real
        api.subscribeQuotes('EURUSD');
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar IQ Option:', error);
        return false;
    }
};
```

---

## 📦 Opção 2: API Bridge com Python

### Passo 1: Instalar iqoptionapi (Python)

```bash
pip install iqoptionapi
```

### Passo 2: Criar Servidor Bridge Python

Crie o arquivo `python_bridge/iqoption_server.py`:

```python
from flask import Flask, jsonify, request
from flask_cors import CORS
from iqoptionapi.stable_api import IQ_Option
import time

app = Flask(__name__)
CORS(app)

# Variável global para manter conexão
iq = None

@app.route('/api/connect', methods=['POST'])
def connect():
    global iq
    data = request.json
    email = data.get('email')
    password = data.get('password')
    practice = data.get('practice', True)
    
    try:
        iq = IQ_Option(email, password)
        check, reason = iq.connect()
        
        if check:
            iq.change_balance('PRACTICE' if practice else 'REAL')
            return jsonify({
                'success': True,
                'message': 'Conectado com sucesso'
            })
        else:
            return jsonify({
                'success': False,
                'message': f'Falha na conexão: {reason}'
            }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/balance', methods=['GET'])
def get_balance():
    global iq
    if not iq:
        return jsonify({'error': 'Não conectado'}), 400
    
    try:
        balance = iq.get_balance()
        return jsonify({
            'balance': balance,
            'currency': 'USD'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/candles', methods=['POST'])
def get_candles():
    global iq
    if not iq:
        return jsonify({'error': 'Não conectado'}), 400
    
    data = request.json
    active = data.get('active', 'EURUSD')
    size = data.get('size', 60)  # 1 minuto
    count = data.get('count', 100)
    
    try:
        candles = iq.get_candles(active, size, count, time.time())
        return jsonify({
            'candles': candles
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trade', methods=['POST'])
def make_trade():
    global iq
    if not iq:
        return jsonify({'error': 'Não conectado'}), 400
    
    data = request.json
    active = data.get('active')
    amount = data.get('amount')
    direction = data.get('direction')  # 'call' ou 'put'
    duration = data.get('duration', 1)  # minutos
    
    try:
        status, order_id = iq.buy(amount, active, direction, duration)
        
        if status:
            return jsonify({
                'success': True,
                'order_id': order_id
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Falha na operação'
            }), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### Passo 3: Instalar Flask

```bash
pip install flask flask-cors
```

### Passo 4: Executar Servidor Bridge

```bash
python python_bridge/iqoption_server.py
```

### Passo 5: Criar Cliente JavaScript

Crie o arquivo `src/services/iqOptionBridge.js`:

```javascript
class IQOptionBridge {
    constructor(bridgeUrl = 'http://localhost:5000') {
        this.bridgeUrl = bridgeUrl;
        this.isConnected = false;
    }

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

            const data = await response.json();
            
            if (data.success) {
                this.isConnected = true;
                console.log('✅ Conectado à IQ Option via Bridge');
                return true;
            } else {
                console.error('❌ Erro ao conectar:', data.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            return false;
        }
    }

    async getBalance() {
        const response = await fetch(`${this.bridgeUrl}/api/balance`);
        const data = await response.json();
        return data.balance;
    }

    async getCandles(active, size = 60, count = 100) {
        const response = await fetch(`${this.bridgeUrl}/api/candles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ active, size, count })
        });
        
        const data = await response.json();
        return data.candles;
    }

    async trade(active, amount, direction, duration = 1) {
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
        
        const data = await response.json();
        return data;
    }
}

export default IQOptionBridge;
```

---

## 🔐 Configuração de Credenciais

### Criar arquivo `.env` na raiz do projeto:

```env
# IQ Option Credentials
VITE_IQOPTION_EMAIL=seu-email@example.com
VITE_IQOPTION_PASSWORD=sua-senha
VITE_IQOPTION_PRACTICE=true

# Python Bridge (se usar Opção 2)
VITE_IQOPTION_BRIDGE_URL=http://localhost:5000
```

⚠️ **IMPORTANTE**: Adicione `.env` ao `.gitignore` para não expor suas credenciais!

```bash
echo ".env" >> .gitignore
```

---

## 🧪 Testando a Integração

### Teste no Console do Navegador:

```javascript
// Opção 1 - WebSocket Direto
import IQOptionAPI from './services/iqOptionAPI';

const api = new IQOptionAPI();
await api.connect('email@example.com', 'senha', true);
const balance = await api.getBalance();
console.log('Saldo:', balance);

// Opção 2 - Bridge Python
import IQOptionBridge from './services/iqOptionBridge';

const bridge = new IQOptionBridge();
await bridge.connect('email@example.com', 'senha', true);
const balance = await bridge.getBalance();
console.log('Saldo:', balance);
```

---

## 📊 Integrando com o Sistema Alpha-Learner

### Adicionar IQ Option aos Provedores de API

No arquivo `src/TradingSystem.jsx`, adicione IQ Option aos provedores:

```javascript
const API_PROVIDERS = {
    // ... outros provedores existentes ...
    IQOPTION: {
        name: 'IQ Option',
        icon: '💹',
        requiresSecret: true,
        baseUrl: 'wss://iqoption.com/echo/websocket',
        description: 'Trading de opções binárias (REQUER CREDENCIAIS)'
    }
};
```

---

## ⚠️ Considerações de Segurança

1. **Nunca compartilhe suas credenciais**
2. **Use conta DEMO (practice) para testes**
3. **Monitore o uso da API** - a IQ Option pode limitar ou bloquear
4. **Implemente rate limiting** - evite fazer muitas requisições
5. **Adicione tratamento de erros robusto**
6. **Use HTTPS/WSS** para comunicação segura

---

## 🔗 Recursos Adicionais

### Bibliotecas Python (não oficiais):
- [iqoptionapi](https://github.com/Lu-Yi-Hsun/iqoptionapi) - Python
- [python-iqoption](https://github.com/n1a/python-iqoption) - Python

### Ativos Disponíveis:
- Forex: EURUSD, GBPUSD, USDJPY, etc.
- Criptomoedas: BTCUSD, ETHUSD, etc.
- Ações: GOOGL, AAPL, TSLA, etc.
- Commodities: GOLD, SILVER, OIL, etc.

### Timeframes:
- 1 minuto (60s)
- 5 minutos (300s)
- 15 minutos (900s)
- 30 minutos (1800s)
- 1 hora (3600s)

---

## 🆘 Problemas Comuns

### Erro: "Invalid credentials"
- Verifique email e senha
- Certifique-se que a conta está ativa
- Tente fazer login manual no site primeiro

### Erro: "Connection refused"
- Verifique sua conexão de internet
- Pode haver bloqueio de firewall/proxy
- A IQ Option pode estar bloqueando sua região

### Erro: "Rate limit exceeded"
- Reduza a frequência de requisições
- Implemente cache local
- Use delays entre requisições

---

## 📝 Licença e Disclaimer

Este guia é fornecido apenas para fins educacionais. O uso da API não oficial da IQ Option:

- ❌ NÃO é endossado pela IQ Option
- ❌ Pode violar os Termos de Serviço
- ❌ Pode resultar em bloqueio de conta
- ⚠️ Use por sua conta e risco

**Sempre leia e respeite os Termos de Serviço da plataforma.**

---

## ✅ Próximos Passos

1. ✅ Escolha uma opção de integração (WebSocket ou Bridge)
2. ✅ Instale as dependências necessárias
3. ✅ Configure suas credenciais no `.env`
4. ✅ Teste a conexão em conta DEMO
5. ✅ Integre com o sistema Alpha-Learner
6. ✅ Implemente estratégias de trading
7. ✅ Monitore performance e ajuste parâmetros

**Bons trades! 📈💰**
