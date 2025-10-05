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

            // Limpar ML weights - buscar e deletar todos
            try {
                const { data: weights } = await window.supabase
                    .from('ml_weights_evolution')
                    .select('timestamp');

                if (weights && weights.length > 0) {
                    for (const w of weights) {
                        await window.supabase
                            .from('ml_weights_evolution')
                            .delete()
                            .eq('timestamp', w.timestamp);
                    }
                    totalDeleted += weights.length;
                    console.log(`   ✅ ${weights.length} registros ML removidos`);
                } else {
                    console.log(`   ✅ 0 registros ML removidos`);
                }
            } catch (e) {
                console.warn(`   ⚠️ Erro ao limpar ml_weights_evolution: ${e.message}`);
            }

            // Limpar audit logs - buscar e deletar todos
            try {
                const { data: logs } = await window.supabase
                    .from('audit_logs')
                    .select('signal_id, generated_at');

                if (logs && logs.length > 0) {
                    for (const log of logs) {
                        await window.supabase
                            .from('audit_logs')
                            .delete()
                            .eq('signal_id', log.signal_id)
                            .eq('generated_at', log.generated_at);
                    }
                    totalDeleted += logs.length;
                    console.log(`   ✅ ${logs.length} logs removidos`);
                } else {
                    console.log(`   ✅ 0 logs removidos`);
                }
            } catch (e) {
                console.warn(`   ⚠️ Erro ao limpar audit_logs: ${e.message}`);
            }

            // Limpar performance stats - buscar e deletar todos
            try {
                const { data: stats } = await window.supabase
                    .from('performance_stats')
                    .select('stat_type, stat_key');

                if (stats && stats.length > 0) {
                    for (const stat of stats) {
                        await window.supabase
                            .from('performance_stats')
                            .delete()
                            .eq('stat_type', stat.stat_type)
                            .eq('stat_key', stat.stat_key);
                    }
                    totalDeleted += stats.length;
                    console.log(`   ✅ ${stats.length} estatísticas removidas`);
                } else {
                    console.log(`   ✅ 0 estatísticas removidas`);
                }
            } catch (e) {
                console.warn(`   ⚠️ Erro ao limpar performance_stats: ${e.message}`);
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
