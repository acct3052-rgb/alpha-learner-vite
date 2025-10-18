# 🚀 Quick Start - IQ Option Integration

Guia rápido para começar a usar a integração IQ Option no Alpha-Learner.

## ⚡ Início Rápido (5 minutos)

### Passo 1: Escolha seu método

Você tem **duas opções**:

- **Opção A**: WebSocket Direto (Node.js) - Mais rápido, mas menos testado
- **Opção B**: Bridge Python - Mais estável, requer Python instalado

### Passo 2: Setup Básico

```bash
# Clone e instale dependências
cd alpha-learner-vite
npm install
```

---

## 🟢 Opção A: WebSocket Direto (Recomendado para Teste)

### 1. Testar no Console do Navegador

```bash
# Inicie o servidor de desenvolvimento
npm run dev
```

Abra o navegador em `http://localhost:3000` e cole no console:

```javascript
// Importar API
const IQOptionAPI = (await import('./src/services/iqOptionAPI.js')).default;

// Criar instância
const iq = new IQOptionAPI();

// Conectar (USE SUAS CREDENCIAIS REAIS)
await iq.connect('seu-email@example.com', 'sua-senha', true);

// Verificar saldo
const balance = await iq.getBalance();
console.log('💰 Saldo:', balance);

// Obter candles
const candles = await iq.getCandles('EURUSD', 60, 10);
console.log('📊 Candles:', candles);

// Subscrever cotações em tempo real
iq.subscribeQuotes('EURUSD');
iq.on('quote-generated', (quote) => {
    console.log('💹 Nova cotação:', quote);
});
```

---

## 🔵 Opção B: Bridge Python (Mais Estável)

### 1. Instalar Python e Dependências

```bash
# Instalar dependências Python
cd python_bridge
pip install -r requirements.txt
```

### 2. Iniciar Servidor Bridge

```bash
python iqoption_server.py
```

O servidor vai iniciar em `http://localhost:5000`

### 3. Testar no Console do Navegador

```bash
# Em outro terminal, inicie o frontend
npm run dev
```

No console do navegador:

```javascript
// Importar Bridge
const IQOptionBridge = (await import('./src/services/iqOptionBridge.js')).default;

// Criar instância
const bridge = new IQOptionBridge('http://localhost:5000');

// Conectar
await bridge.connect('seu-email@example.com', 'sua-senha', true);

// Verificar saldo
const balance = await bridge.getBalance();
console.log('💰 Saldo:', balance);

// Obter candles
const candles = await bridge.getCandles('EURUSD', 60, 100);
console.log('📊 Candles:', candles);
```

---

## 🎯 Teste Rápido de Trade (DEMO)

⚠️ **IMPORTANTE**: Use sempre conta DEMO (practice=true) para testes!

```javascript
// Fazer um trade de TESTE
const result = await iq.trade('EURUSD', 1, 'call', 1);
console.log('📈 Trade:', result);
```

---

## 📊 Ativos Disponíveis

Alguns pares populares:

### Forex
- `EURUSD` - Euro / Dólar
- `GBPUSD` - Libra / Dólar
- `USDJPY` - Dólar / Iene
- `AUDUSD` - Dólar Australiano / Dólar

### Criptomoedas
- `BTCUSD` - Bitcoin
- `ETHUSD` - Ethereum
- `LTCUSD` - Litecoin

### Ações (quando disponível)
- `GOOGL` - Google
- `AAPL` - Apple
- `TSLA` - Tesla

---

## 🔧 Configuração via .env

Para não precisar digitar credenciais toda vez:

```bash
# Copie o exemplo
cp .env.example .env

# Edite o .env e adicione suas credenciais
VITE_IQOPTION_EMAIL=seu-email@example.com
VITE_IQOPTION_PASSWORD=sua-senha
VITE_IQOPTION_PRACTICE=true
```

Depois use no código:

```javascript
const email = import.meta.env.VITE_IQOPTION_EMAIL;
const password = import.meta.env.VITE_IQOPTION_PASSWORD;
const practice = import.meta.env.VITE_IQOPTION_PRACTICE === 'true';

await iq.connect(email, password, practice);
```

---

## ⚠️ Problemas Comuns

### "Invalid credentials"
✅ Solução: Verifique email/senha e tente fazer login manual no site primeiro

### "Connection refused" 
✅ Solução: Verifique sua internet ou tente usar VPN se estiver em região bloqueada

### "iqoptionapi not installed" (Opção B)
✅ Solução: Execute `pip install iqoptionapi` no terminal

### WebSocket fechando imediatamente
✅ Solução: A IQ Option pode estar bloqueando. Tente a Opção B (Bridge)

---

## 📚 Documentação Completa

Para mais detalhes, consulte:
- **[IQOPTION_SETUP.md](./IQOPTION_SETUP.md)** - Guia completo e detalhado
- **README.md** - Visão geral do projeto

---

## 🆘 Precisa de Ajuda?

1. Verifique se está usando conta DEMO
2. Teste sua conexão no site oficial da IQ Option primeiro
3. Verifique os logs do console para erros
4. Leia a documentação completa em IQOPTION_SETUP.md

---

## ⚖️ Disclaimer

⚠️ **IMPORTANTE**:
- A API da IQ Option é **não oficial**
- Use **apenas** em conta DEMO para testes
- O uso pode violar Termos de Serviço
- Pode resultar em bloqueio de conta
- **Use por sua conta e risco**

---

**Pronto para começar? Boa sorte nos seus trades! 📈💰**
