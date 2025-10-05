# 🧹 Como Limpar Dados de Teste

Este guia explica como limpar todos os dados de teste do sistema e começar do zero com dados reais.

## 📋 O que será limpo?

### ✅ DADOS QUE SERÃO REMOVIDOS:
- **Supabase**:
  - Histórico de sinais (`signals_history`)
  - Evolução de pesos do ML (`ml_weights_evolution`)
  - Snapshots de configuração (`config_snapshots`)

- **LocalStorage**:
  - Histórico de execuções (`execution_manager_data`)
  - Ratios otimizados TP/SL (`tpsl_optimal_ratios`)

### 🔒 DADOS QUE SERÃO PRESERVADOS (por padrão):
- Chaves de API (Binance, etc.)
- Configuração do Telegram
- Configurações gerais do sistema

---

## 🚀 Como Usar

### **Método 1: Via Console do Navegador** (Recomendado)

1. Abra o sistema no navegador
2. Abra o Console do desenvolvedor (`F12` ou `Ctrl+Shift+I`)
3. Digite um dos comandos:

```javascript
// Limpar tudo, mantendo APIs e Telegram
await clearAllData()

// Limpar tudo, mantendo apenas APIs
await clearAllData({ keepTelegram: false })

// Limpar ABSOLUTAMENTE TUDO (inclusive APIs)
await clearAllData({ keepAPIs: false, keepTelegram: false })

// Limpar apenas localStorage
await clearAllData({ clearSupabase: false })

// Limpar apenas Supabase
await clearAllData({ clearLocalStorage: false })
```

4. Aguarde a confirmação no console
5. Recarregue a página (`F5` ou `Ctrl+R`)

---

### **Método 2: Importar no Código**

Se quiser criar um botão ou executar via código:

```javascript
import { clearAllData } from './src/utils/clearData.js';

// Em algum lugar do seu código
async function limparSistema() {
    const resultado = await clearAllData({
        keepAPIs: true,        // Manter configurações de API
        keepTelegram: true,    // Manter configuração do Telegram
        clearSupabase: true,   // Limpar banco Supabase
        clearLocalStorage: true // Limpar localStorage
    });

    console.log('Resultado:', resultado);

    // Recarregar página após limpeza
    window.location.reload();
}
```

---

## ⚙️ Opções Disponíveis

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `keepAPIs` | boolean | `true` | Preservar chaves de API (Binance, etc.) |
| `keepTelegram` | boolean | `true` | Preservar configuração do Telegram |
| `clearSupabase` | boolean | `true` | Limpar dados do Supabase |
| `clearLocalStorage` | boolean | `true` | Limpar dados do localStorage |

---

## 📊 Exemplo de Saída

```
🧹 ========================================
🧹 INICIANDO LIMPEZA DE DADOS
🧹 ========================================

📦 Limpando dados do Supabase...
   ✅ 147 sinais removidos da tabela signals_history
   ✅ 23 registros de ML removidos da tabela ml_weights_evolution
   ✅ 12 snapshots de config removidos da tabela config_snapshots
✅ Supabase limpo com sucesso!

💾 Limpando localStorage...
   ✅ Removido: execution_manager_data
   ✅ Removido: tpsl_optimal_ratios
   ℹ️  Configurações de API preservadas
   ℹ️  Configuração do Telegram preservada
✅ localStorage limpo com sucesso!

🧹 ========================================
🧹 RESUMO DA LIMPEZA
🧹 ========================================
Supabase: ✅ Limpo
localStorage: ✅ Limpo
ℹ️  Configurações de API: PRESERVADAS
ℹ️  Configuração Telegram: PRESERVADA

✅ Limpeza concluída! Você pode começar com dados limpos.
💡 Dica: Recarregue a página para ver o sistema limpo.
```

---

## ⚠️ IMPORTANTE

1. **Backup**: Esta operação é **IRREVERSÍVEL**! Certifique-se de fazer backup se precisar dos dados.
2. **Recarregar**: Sempre recarregue a página após limpar os dados.
3. **APIs**: Por padrão, suas chaves de API são preservadas para não precisar reconfigurá-las.
4. **Produção**: Use `keepAPIs: false` apenas se quiser resetar TUDO completamente.

---

## 🎯 Quando Usar?

- ✅ Após testar o sistema e querer começar com dados reais
- ✅ Quando o banco está cheio de dados de teste
- ✅ Para resetar o ML e começar o aprendizado do zero
- ✅ Ao migrar de ambiente de teste para produção

---

## 🆘 Problemas?

Se encontrar erros durante a limpeza:

1. Verifique se está conectado ao Supabase (veja console)
2. Verifique se as tabelas existem no Supabase
3. Tente limpar apenas localStorage primeiro: `clearAllData({ clearSupabase: false })`
4. Em último caso, limpe manualmente pelo painel do Supabase

---

**Desenvolvido com ❤️ para o Alpha Learner**
