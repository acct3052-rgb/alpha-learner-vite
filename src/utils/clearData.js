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
            // Limpar tabela de sinais
            const { error: signalsError, count: signalsCount } = await supabase
                .from('signals_history')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos (id nunca será esse)

            if (signalsError) {
                throw new Error(`Erro ao limpar signals_history: ${signalsError.message}`);
            }
            console.log(`   ✅ ${signalsCount || 0} sinais removidos da tabela signals_history`);

            // Limpar tabela de evolução de pesos ML
            const { error: weightsError, count: weightsCount } = await supabase
                .from('ml_weights_evolution')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (weightsError) {
                throw new Error(`Erro ao limpar ml_weights_evolution: ${weightsError.message}`);
            }
            console.log(`   ✅ ${weightsCount || 0} registros de ML removidos da tabela ml_weights_evolution`);

            // Limpar tabela de snapshots de configuração
            const { error: configError, count: configCount } = await supabase
                .from('config_snapshots')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (configError) {
                throw new Error(`Erro ao limpar config_snapshots: ${configError.message}`);
            }
            console.log(`   ✅ ${configCount || 0} snapshots de config removidos da tabela config_snapshots`);

            results.supabase.success = true;
            console.log('✅ Supabase limpo com sucesso!');

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
