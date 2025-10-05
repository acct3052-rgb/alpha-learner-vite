/**
 * Script de Limpeza de Dados do Alpha Learner
 *
 * Este script limpa todos os dados de teste, mantendo apenas as configurações de API.
 * Use este comando quando estiver pronto para começar com dados limpos e reais.
 */

import { supabase } from './supabase.js';

export async function clearAllData(options = {}) {
    const {
        keepAPIs = true,           // Manter configurações de API
        keepTelegram = true,       // Manter configuração do Telegram
        clearSupabase = true,      // Limpar dados do Supabase
        clearLocalStorage = true   // Limpar localStorage
    } = options;

    console.log('🧹 ========================================');
    console.log('🧹 INICIANDO LIMPEZA DE DADOS');
    console.log('🧹 ========================================');

    const results = {
        supabase: { success: false, error: null },
        localStorage: { success: false, error: null }
    };

    // =====================================
    // 1. LIMPAR SUPABASE
    // =====================================
    if (clearSupabase) {
        console.log('\n📦 Limpando dados do Supabase...');
        try {
            let totalDeleted = 0;

            // Limpar tabela de sinais
            const { error: signalsError, count: signalsCount } = await supabase
                .from('signals')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos (id nunca será esse)

            if (signalsError) {
                console.warn(`   ⚠️ Erro ao limpar signals: ${signalsError.message}`);
            } else {
                const deleted = signalsCount || 0;
                totalDeleted += deleted;
                console.log(`   ✅ ${deleted} sinais removidos da tabela signals`);
            }

            // Limpar tabela de evolução de pesos ML
            const { error: weightsError, count: weightsCount } = await supabase
                .from('ml_weights_evolution')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (weightsError) {
                console.warn(`   ⚠️ Erro ao limpar ml_weights_evolution: ${weightsError.message}`);
            } else {
                const deleted = weightsCount || 0;
                totalDeleted += deleted;
                console.log(`   ✅ ${deleted} registros de ML removidos da tabela ml_weights_evolution`);
            }

            // Limpar tabela de audit_logs
            const { error: auditError, count: auditCount } = await supabase
                .from('audit_logs')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (auditError) {
                console.warn(`   ⚠️ Erro ao limpar audit_logs: ${auditError.message}`);
            } else {
                const deleted = auditCount || 0;
                totalDeleted += deleted;
                console.log(`   ✅ ${deleted} logs de auditoria removidos da tabela audit_logs`);
            }

            // Limpar tabela de performance_stats
            const { error: statsError, count: statsCount } = await supabase
                .from('performance_stats')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (statsError) {
                console.warn(`   ⚠️ Erro ao limpar performance_stats: ${statsError.message}`);
            } else {
                const deleted = statsCount || 0;
                totalDeleted += deleted;
                console.log(`   ✅ ${deleted} estatísticas removidas da tabela performance_stats`);
            }

            results.supabase.success = true;
            console.log(`✅ Supabase limpo com sucesso! Total: ${totalDeleted} registros removidos`);

        } catch (error) {
            console.error('❌ Erro ao limpar Supabase:', error);
            results.supabase.error = error.message;
        }
    }

    // =====================================
    // 2. LIMPAR LOCALSTORAGE
    // =====================================
    if (clearLocalStorage) {
        console.log('\n💾 Limpando localStorage...');
        try {
            // Salvar configurações que devem ser preservadas
            const apiConfigs = keepAPIs ? {
                alpha_config: localStorage.getItem('alpha_config'),
                binance_api_key: localStorage.getItem('binance_api_key'),
                binance_secret_key: localStorage.getItem('binance_secret_key')
            } : {};

            const telegramConfig = keepTelegram ? {
                telegram_config: localStorage.getItem('telegram_config')
            } : {};

            // Limpar dados de execução e histórico
            const itemsToRemove = [
                'execution_manager_data',  // Histórico de execuções
                'tpsl_optimal_ratios',     // Ratios otimizados do TP/SL
            ];

            itemsToRemove.forEach(item => {
                if (localStorage.getItem(item)) {
                    localStorage.removeItem(item);
                    console.log(`   ✅ Removido: ${item}`);
                }
            });

            // Se NÃO for manter APIs, remover também
            if (!keepAPIs) {
                ['alpha_config', 'binance_api_key', 'binance_secret_key'].forEach(item => {
                    if (localStorage.getItem(item)) {
                        localStorage.removeItem(item);
                        console.log(`   ✅ Removido: ${item}`);
                    }
                });
            } else {
                console.log('   ℹ️  Configurações de API preservadas');
            }

            // Se NÃO for manter Telegram, remover também
            if (!keepTelegram) {
                if (localStorage.getItem('telegram_config')) {
                    localStorage.removeItem('telegram_config');
                    console.log(`   ✅ Removido: telegram_config`);
                }
            } else {
                console.log('   ℹ️  Configuração do Telegram preservada');
            }

            results.localStorage.success = true;
            console.log('✅ localStorage limpo com sucesso!');

        } catch (error) {
            console.error('❌ Erro ao limpar localStorage:', error);
            results.localStorage.error = error.message;
        }
    }

    // =====================================
    // RESUMO
    // =====================================
    console.log('\n🧹 ========================================');
    console.log('🧹 RESUMO DA LIMPEZA');
    console.log('🧹 ========================================');
    console.log(`Supabase: ${results.supabase.success ? '✅ Limpo' : '❌ Erro'}`);
    console.log(`localStorage: ${results.localStorage.success ? '✅ Limpo' : '❌ Erro'}`);

    if (keepAPIs) {
        console.log('ℹ️  Configurações de API: PRESERVADAS');
    }
    if (keepTelegram) {
        console.log('ℹ️  Configuração Telegram: PRESERVADA');
    }

    console.log('\n✅ Limpeza concluída! Você pode começar com dados limpos.');
    console.log('💡 Dica: Recarregue a página para ver o sistema limpo.');

    return results;
}

// Exportar função auxiliar para uso no console do navegador
if (typeof window !== 'undefined') {
    window.clearAllData = clearAllData;
    console.log('💡 Função clearAllData() disponível no console do navegador');
    console.log('💡 Use: clearAllData() para limpar todos os dados mantendo APIs');
    console.log('💡 Use: clearAllData({ keepAPIs: false }) para limpar TUDO');
}
