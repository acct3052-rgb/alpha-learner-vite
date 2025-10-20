# 🏗️ Arquitetura da Integração IQ Option

Este documento explica a arquitetura técnica da integração IQ Option no Alpha-Learner.

---

## 📐 Visão Geral das Duas Arquiteturas

### Opção 1: WebSocket Direto

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React)                        │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │         src/services/iqOptionAPI.js                │ │
│  │                                                     │ │
│  │  - connect(email, password, practice)              │ │
│  │  - getBalance()                                    │ │
│  │  - getCandles(active, size, count)                 │ │
│  │  - subscribeQuotes(active)                         │ │
│  │  - trade(active, amount, direction, duration)      │ │
│  │  - disconnect()                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                           │                               │
└───────────────────────────┼───────────────────────────────┘
                            │
                            │ WebSocket
                            │ wss://iqoption.com/echo/websocket
                            ▼
                  ┌──────────────────┐
                  │   IQ Option      │
                  │   Servers        │
                  └──────────────────┘
```

**Fluxo de Dados:**
1. Frontend cria instância de `IQOptionAPI`
2. Estabelece conexão WebSocket com IQ Option
3. Autentica com email/senha
4. Troca mensagens JSON via WebSocket
5. Recebe dados em tempo real (quotes, candles)

**Características:**
- ✅ Conexão direta (menos latência)
- ✅ Apenas JavaScript
- ⚠️ API não documentada oficialmente
- ⚠️ Endpoints podem mudar

---

### Opção 2: Python Bridge

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React)                        │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │      src/services/iqOptionBridge.js                │ │
│  │                                                     │ │
│  │  - connect(email, password, practice)              │ │
│  │  - getBalance()                                    │ │
│  │  - getCandles(active, size, count)                 │ │
│  │  - trade(active, amount, direction, duration)      │ │
│  │  - subscribeQuotes(active, callback)               │ │
│  │  - disconnect()                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                           │                               │
└───────────────────────────┼───────────────────────────────┘
                            │
                            │ HTTP/REST
                            │ http://localhost:5000/api/*
                            ▼
┌─────────────────────────────────────────────────────────┐
│            Python Bridge Server (Flask)                  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │      python_bridge/iqoption_server.py              │ │
│  │                                                     │ │
│  │  Endpoints:                                        │ │
│  │  - POST /api/connect                               │ │
│  │  - GET  /api/balance                               │ │
│  │  - POST /api/candles                               │ │
│  │  - POST /api/trade                                 │ │
│  │  - GET  /api/actives                               │ │
│  │  - GET  /api/positions                             │ │
│  │  - GET  /api/history                               │ │
│  │  - POST /api/disconnect                            │ │
│  └────────────────────────────────────────────────────┘ │
│                           │                               │
└───────────────────────────┼───────────────────────────────┘
                            │
                            │ iqoptionapi library
                            │ (WebSocket interno)
                            ▼
                  ┌──────────────────┐
                  │   IQ Option      │
                  │   Servers        │
                  └──────────────────┘
```

**Fluxo de Dados:**
1. Frontend faz requisições HTTP para Bridge
2. Bridge usa biblioteca `iqoptionapi` (Python)
3. Biblioteca estabelece WebSocket com IQ Option
4. Bridge retorna dados em formato JSON
5. Frontend processa resposta

**Características:**
- ✅ Biblioteca estável e bem testada
- ✅ Mais funcionalidades documentadas
- ✅ Comunidade ativa
- ⚠️ Requer Python + servidor adicional
- ⚠️ Latência ligeiramente maior

---

## 🔄 Fluxo de Autenticação

### Opção 1: WebSocket Direto

```
Frontend                    IQ Option Server
   │                              │
   │─────── WebSocket Open ──────▶│
   │                              │
   │◀────── Connection OK ────────│
   │                              │
   │───── Auth Request (JSON) ────▶│
   │  {                           │
   │    name: "ssid",             │
   │    msg: {                    │
   │      email: "...",           │
   │      password: "...",        │
   │      platform: "PRACTICE"    │
   │    }                         │
   │  }                           │
   │                              │
   │◀─── Auth Response (JSON) ────│
   │  {                           │
   │    msg: {                    │
   │      ssid: "..."             │
   │    }                         │
   │  }                           │
   │                              │
   │──── Requests/Subscriptions ──▶│
   │                              │
   │◀───── Real-time Data ────────│
   │                              │
```

### Opção 2: Python Bridge

```
Frontend          Bridge Server         IQ Option
   │                   │                    │
   │─ POST /api/connect ─▶                  │
   │  {                │                    │
   │    email: "...",  │                    │
   │    password: "..."│                    │
   │  }                │                    │
   │                   │                    │
   │                   │─── iqoptionapi ───▶│
   │                   │    connect()       │
   │                   │                    │
   │                   │◀──── Success ──────│
   │                   │                    │
   │◀── { success: true } ──│              │
   │                   │                    │
   │─ GET /api/balance ─▶                   │
   │                   │                    │
   │                   │── get_balance() ──▶│
   │                   │                    │
   │                   │◀─── Balance ───────│
   │                   │                    │
   │◀─ { balance: 1000 } ──│                │
   │                   │                    │
```

---

## 📨 Formato de Mensagens

### WebSocket Direto (JSON)

**Requisição:**
```json
{
  "name": "candles",
  "msg": {
    "active_id": "EURUSD",
    "size": 60,
    "count": 100,
    "from": 1729166520
  },
  "request_id": 123
}
```

**Resposta:**
```json
{
  "name": "candles",
  "msg": {
    "candles": [
      {
        "open": 1.0850,
        "close": 1.0852,
        "high": 1.0855,
        "low": 1.0848,
        "volume": 1234,
        "from": 1729166460,
        "to": 1729166520
      }
    ]
  },
  "request_id": 123
}
```

### Python Bridge (REST)

**Requisição HTTP:**
```http
POST /api/candles HTTP/1.1
Content-Type: application/json

{
  "active": "EURUSD",
  "size": 60,
  "count": 100
}
```

**Resposta HTTP:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "candles": [
    {
      "open": 1.0850,
      "close": 1.0852,
      "high": 1.0855,
      "low": 1.0848,
      "volume": 1234,
      "from": 1729166460,
      "to": 1729166520
    }
  ],
  "active": "EURUSD",
  "size": 60,
  "count": 1
}
```

---

## 🎯 Casos de Uso

### 1. Obter Candles Históricos

**WebSocket:**
```javascript
const iq = new IQOptionAPI();
await iq.connect(email, password, true);
const candles = await iq.getCandles('EURUSD', 60, 100);
```

**Bridge:**
```javascript
const bridge = new IQOptionBridge();
await bridge.connect(email, password, true);
const candles = await bridge.getCandles('EURUSD', 60, 100);
```

### 2. Subscrever Cotações em Tempo Real

**WebSocket:**
```javascript
iq.subscribeQuotes('EURUSD');
iq.on('quote-generated', (quote) => {
  console.log('Nova cotação:', quote);
});
```

**Bridge:**
```javascript
bridge.subscribeQuotes('EURUSD', (quote) => {
  console.log('Nova cotação:', quote);
});
```

### 3. Fazer Operação

**WebSocket:**
```javascript
const result = await iq.trade('EURUSD', 1, 'call', 1);
console.log('Trade ID:', result.msg.order_id);
```

**Bridge:**
```javascript
const result = await bridge.trade('EURUSD', 1, 'call', 1);
console.log('Trade ID:', result.order_id);
```

---

## 🔒 Considerações de Segurança

### 1. Armazenamento de Credenciais

```
❌ NÃO FAZER:
const email = "meu-email@example.com";
const password = "minha-senha";

✅ FAZER:
const email = import.meta.env.VITE_IQOPTION_EMAIL;
const password = import.meta.env.VITE_IQOPTION_PASSWORD;
```

### 2. Comunicação

```
WebSocket: wss:// (seguro)
Bridge:    http://localhost (apenas local)

⚠️ Em produção, Bridge deve usar HTTPS!
```

### 3. Validação

```javascript
// Sempre validar entrada
if (!email || !password) {
  throw new Error('Credenciais obrigatórias');
}

// Sempre usar try-catch
try {
  await iq.connect(email, password, true);
} catch (error) {
  console.error('Erro na conexão:', error);
}
```

---

## 📊 Comparação de Performance

| Característica        | WebSocket Direto | Python Bridge |
|-----------------------|------------------|---------------|
| Latência              | ~50ms            | ~100ms        |
| Throughput            | Alto             | Médio         |
| Confiabilidade        | Média            | Alta          |
| Setup                 | Simples          | Moderado      |
| Manutenção            | Difícil          | Fácil         |
| Documentação          | Limitada         | Boa           |
| Suporte Comunidade    | Baixo            | Alto          |

---

## 🚀 Integração com Alpha-Learner

### Adicionar ao TradingSystem.jsx

```javascript
import IQOptionAPI from './services/iqOptionAPI';
// ou
import IQOptionBridge from './services/iqOptionBridge';

// No componente
const [iqOption, setIQOption] = useState(null);

// Conectar
useEffect(() => {
  const connectIQ = async () => {
    const iq = new IQOptionAPI();
    // ou: const iq = new IQOptionBridge();
    
    await iq.connect(
      import.meta.env.VITE_IQOPTION_EMAIL,
      import.meta.env.VITE_IQOPTION_PASSWORD,
      true
    );
    
    setIQOption(iq);
  };
  
  connectIQ();
}, []);

// Usar nos sinais
const executeSignal = async (signal) => {
  if (iqOption && iqOption.connected) {
    await iqOption.trade(
      signal.active,
      signal.amount,
      signal.direction,
      signal.duration
    );
  }
};
```

### Adicionar aos Provedores de API

```javascript
const API_PROVIDERS = {
  // ... outros provedores
  IQOPTION: {
    name: 'IQ Option',
    icon: '💹',
    requiresSecret: true,
    baseUrl: 'wss://iqoption.com/echo/websocket',
    description: 'Trading de opções binárias'
  }
};
```

---

## 🧪 Testes

### Teste de Conexão

```javascript
// WebSocket
async function testWebSocket() {
  const iq = new IQOptionAPI();
  
  try {
    await iq.connect(email, password, true);
    console.log('✅ Conectado!');
    
    const balance = await iq.getBalance();
    console.log('💰 Saldo:', balance);
    
    iq.disconnect();
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Bridge
async function testBridge() {
  const bridge = new IQOptionBridge();
  
  try {
    await bridge.connect(email, password, true);
    console.log('✅ Conectado!');
    
    const balance = await bridge.getBalance();
    console.log('💰 Saldo:', balance);
    
    await bridge.disconnect();
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}
```

---

## 📚 Referências

### Documentação Interna
- `IQOPTION_SETUP.md` - Setup completo
- `QUICKSTART_IQOPTION.md` - Início rápido
- `IMPLEMENTACAO_IQOPTION.md` - Resumo da implementação

### Bibliotecas
- [iqoptionapi](https://github.com/Lu-Yi-Hsun/iqoptionapi) - Python
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) - Browser

### Recursos Externos
- [IQ Option](https://iqoption.com/) - Site oficial
- [Binary Options](https://www.investopedia.com/terms/b/binary-option.asp) - Conceitos

---

**Autor:** GitHub Copilot Agent  
**Versão:** 1.0  
**Data:** 2025-10-17
