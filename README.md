# 🚀 Alpha-Learner v2.5 - Vite Edition

## ✅ Status: Migração Completa

Sistema de trading com Machine Learning totalmente migrado para Vite + React.

### Features
- ✅ Sistema completo em React modular (8,220 linhas)
- ✅ Vite + React + TensorFlow.js configurados
- ✅ Supabase client modularizado
- ✅ Build otimizado e funcionando
- ✅ Watchdog anti-freeze para execução contínua
- ✅ WebSocket com reconexão infinita
- ✅ Auto-cleanup de memória
- ✅ Integração IQ Option API (WebSocket + Python Bridge)

## 📦 Como Usar

```bash
npm install
npm run dev    # Desenvolvimento: http://localhost:3000
npm run build  # Produção
npm run preview # Preview da build
```

## 🏗️ Estrutura

```
src/
├── App.jsx           # Entry point
├── TradingSystem.jsx # Sistema completo (8,220 linhas)
├── services/
│   ├── iqOptionAPI.js    # IQ Option WebSocket direto
│   └── iqOptionBridge.js # IQ Option via Python Bridge
├── utils/
│   └── supabase.js   # Cliente Supabase
└── styles/
    └── main.css      # Estilos

python_bridge/
├── iqoption_server.py   # Servidor Flask para IQ Option
└── requirements.txt     # Dependências Python
```

## 📚 Documentação Adicional

- **[IQOPTION_SETUP.md](./IQOPTION_SETUP.md)** - Guia completo de instalação da IQ Option API
- **[QUICKSTART_IQOPTION.md](./QUICKSTART_IQOPTION.md)** - Início rápido IQ Option (5 minutos)
- **[SETUP.md](./SETUP.md)** - Setup geral do repositório

---

**Versão**: 2.5.0
**Status**: Produção
