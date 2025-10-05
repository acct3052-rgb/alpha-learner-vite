/*
 * Alpha-Learner v2.5 - Vite Edition
 * Sistema de Trading com IA e Machine Learning
 */

import React from 'react'
import { supabase } from './utils/supabase'
import * as tf from '@tensorflow/tfjs'
import TradingSystemApp from './TradingSystem'
import { clearAllData } from './utils/clearData'

console.log('🔍 Debug - supabase client:', supabase)
console.log('🔍 Debug - supabase.from existe?', typeof supabase?.from)

// Expor dependências globalmente
window.React = React
window.supabase = supabase
window.tf = tf

// Função de limpeza de dados (standalone para uso no console)
window.clearAllData = async function(options = {}) {
    const {
        keepAPIs = true,
        keepTelegram = true,
        clearSupabase = true,
        clearLocalStorage = true
    } = options;

    console.log('🧹 ========================================');
    console.log('🧹 INICIANDO LIMPEZA DE DADOS');
    console.log('🧹 ========================================');

    const results = {
        supabase: { success: false, error: null },
        localStorage: { success: false, error: null }
    };

    // LIMPAR SUPABASE
    if (clearSupabase && window.supabase) {
        console.log('\n📦 Limpando dados do Supabase...');
        try {
            let totalDeleted = 0;

            // Limpar tabela de sinais
            const { error: signalsError, count: signalsCount } = await window.supabase
                .from('signals')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (signalsError) {
                console.warn(`   ⚠️ Erro ao limpar signals: ${signalsError.message}`);
            } else {
                const deleted = signalsCount || 0;
                totalDeleted += deleted;
                console.log(`   ✅ ${deleted} sinais removidos`);
            }

            // Limpar ML weights (usa timestamp ao invés de id)
            const { error: weightsError, count: weightsCount } = await window.supabase
                .from('ml_weights_evolution')
                .delete()
                .gte('timestamp', 0);

            if (weightsError) {
                console.warn(`   ⚠️ Erro ao limpar ml_weights_evolution: ${weightsError.message}`);
            } else {
                const deleted = weightsCount || 0;
                totalDeleted += deleted;
                console.log(`   ✅ ${deleted} registros ML removidos`);
            }

            // Limpar audit logs (usa timestamp ao invés de id)
            const { error: auditError, count: auditCount } = await window.supabase
                .from('audit_logs')
                .delete()
                .gte('timestamp', 0);

            if (auditError) {
                console.warn(`   ⚠️ Erro ao limpar audit_logs: ${auditError.message}`);
            } else {
                const deleted = auditCount || 0;
                totalDeleted += deleted;
                console.log(`   ✅ ${deleted} logs removidos`);
            }

            // Limpar performance stats (usa timestamp ao invés de id)
            const { error: statsError, count: statsCount } = await window.supabase
                .from('performance_stats')
                .delete()
                .gte('timestamp', 0);

            if (statsError) {
                console.warn(`   ⚠️ Erro ao limpar performance_stats: ${statsError.message}`);
            } else {
                const deleted = statsCount || 0;
                totalDeleted += deleted;
                console.log(`   ✅ ${deleted} estatísticas removidas`);
            }

            results.supabase.success = true;
            console.log(`✅ Supabase limpo! Total: ${totalDeleted} registros`);

            // Limpar memória do AuditSystem se existir
            if (window.auditSystemRef) {
                window.auditSystemRef.auditLogs = [];
                window.auditSystemRef.performanceByHour = {};
                window.auditSystemRef.performanceByScore = {};
                window.auditSystemRef.indicatorPerformance = {};
                window.auditSystemRef.notifyChange();
                console.log('✅ Memória do AuditSystem limpa');
            }
        } catch (error) {
            console.error('❌ Erro ao limpar Supabase:', error);
            results.supabase.error = error.message;
        }
    }

    // LIMPAR LOCALSTORAGE
    if (clearLocalStorage) {
        console.log('\n💾 Limpando localStorage...');
        try {
            const itemsToRemove = [
                'execution_manager_data',
                'tpsl_optimal_ratios',
            ];

            itemsToRemove.forEach(item => {
                if (localStorage.getItem(item)) {
                    localStorage.removeItem(item);
                    console.log(`   ✅ Removido: ${item}`);
                }
            });

            if (!keepAPIs) {
                ['alpha_config', 'binance_api_key', 'binance_secret_key'].forEach(item => {
                    if (localStorage.getItem(item)) {
                        localStorage.removeItem(item);
                        console.log(`   ✅ Removido: ${item}`);
                    }
                });
            } else {
                console.log('   ℹ️  APIs preservadas');
            }

            if (!keepTelegram) {
                if (localStorage.getItem('telegram_config')) {
                    localStorage.removeItem('telegram_config');
                    console.log(`   ✅ Removido: telegram_config`);
                }
            } else {
                console.log('   ℹ️  Telegram preservado');
            }

            results.localStorage.success = true;
            console.log('✅ localStorage limpo!');
        } catch (error) {
            console.error('❌ Erro ao limpar localStorage:', error);
            results.localStorage.error = error.message;
        }
    }

    console.log('\n🧹 ========================================');
    console.log('🧹 RESUMO DA LIMPEZA');
    console.log('🧹 ========================================');
    console.log(`Supabase: ${results.supabase.success ? '✅ Limpo' : '❌ Erro'}`);
    console.log(`localStorage: ${results.localStorage.success ? '✅ Limpo' : '❌ Erro'}`);
    if (keepAPIs) console.log('ℹ️  APIs: PRESERVADAS');
    if (keepTelegram) console.log('ℹ️  Telegram: PRESERVADO');
    console.log('\n✅ Concluído! Recarregue a página.');

    return results;
}

console.log('💡 clearAllData() disponível no console');
console.log('💡 Uso: clearAllData() - limpa tudo, mantém APIs');
console.log('💡 Uso: clearAllData({ keepAPIs: false }) - limpa TUDO');

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
