/*
 * Alpha-Learner v2.5 - Vite Edition
 * Sistema de Trading com IA e Machine Learning
 */

import React from 'react'
import { supabase } from './utils/supabase'
import * as tf from '@tensorflow/tfjs'
import TradingSystemApp from './TradingSystem'

// Expor dependências globalmente
window.React = React
window.supabase = supabase
window.tf = tf

// Configuração de auditoria global
window.auditSystemRef = null
window.debugAudit = true

window.auditDiag = function() {
    console.log('====== DIAGNÓSTICO RÁPIDO ======')
    console.log('AuditSystem:', window.auditSystemRef ? 'OK' : 'ERRO')
    if (window.auditSystemRef) {
        console.log('Total de logs:', window.auditSystemRef.auditLogs.length)
        console.log('Último log:', window.auditSystemRef.auditLogs[window.auditSystemRef.auditLogs.length - 1])
    }
    console.log('================================')
}

console.log('✅ Supabase inicializado')

function App() {
    return <TradingSystemApp />
}

export default App
