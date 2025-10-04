#!/bin/bash

# Script para converter o código do Alpha-Learner para React moderno

echo "🔄 Convertendo código para React moderno..."

# Extrair código JavaScript completo (linha 533 a 8232)
sed -n '533,8232p' /workspaces/alpha-learner/index.html.backup > /tmp/raw-code.js

# Adicionar imports no início
cat > /workspaces/alpha-learner-vite/src/TradingSystem.jsx << 'EOF'
/*
 * Trading System - Sistema Completo de Trading
 * Convertido automaticamente do index.html para React moderno
 */

import React, { useState, useEffect, useRef } from 'react'
import * as ReactDOM from 'react-dom/client'

// Código extraído do sistema original
const { useState: useStateHook, useEffect: useEffectHook, useRef: useRefHook } = React
const supabase = window.supabase.createClient()

EOF

# Adicionar código JavaScript (removendo linhas de configuração duplicadas)
tail -n +25 /tmp/raw-code.js | head -n -35 >> /workspaces/alpha-learner-vite/src/TradingSystem.jsx

# Adicionar export no final
echo "" >> /workspaces/alpha-learner-vite/src/TradingSystem.jsx
echo "export default App" >> /workspaces/alpha-learner-vite/src/TradingSystem.jsx

echo "✅ Conversão concluída!"
