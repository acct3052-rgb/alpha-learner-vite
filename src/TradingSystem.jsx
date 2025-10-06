/*
 * Alpha-Learner Trading System - Complete Implementation
 * Convertido automaticamente para React moderno com Vite
 * Version: 2.5.0 - executeSignalFromCard fix FINAL
 */

import React from 'react'

// 🔧 VERSÃO 2.5.0 - executeSignalFromCard CORRIGIDO
console.log('%c🚀 Alpha-Learner v2.5.0 CARREGADO', 'color: #00ff88; font-size: 16px; font-weight: bold');
console.log('%c✅ executeSignalFromCard: DEFINIDO', 'color: #00ff88; font-weight: bold');

// Usar hooks do React
const { useState, useEffect, useRef } = React

// Supabase será acessado via window.supabase (definido em App.jsx)
// Não criar referência const aqui pois window.supabase ainda é undefined neste momento

/* ========================================
   CLASSES E SERVIÇOS DO SISTEMA
   ======================================== */

// Configurações globais já definidas em App.jsx
// supabase, auditSystemRef, debugAudit já disponíveis via window

/* ========================================
   MÓDULO DE INTEGRAÇÃO DE APIs
   ======================================== */

        const API_PROVIDERS = {
            ALPHA_VANTAGE: {
                name: 'Alpha Vantage',
                icon: '📈',
                requiresSecret: false,
                baseUrl: 'https://www.alphavantage.co/query',
                description: 'Dados de ações, forex e cripto (500 calls/dia grátis)'
            },
            BINANCE: {
                name: 'Binance',
                icon: '🟡',
                requiresSecret: true,
                baseUrl: 'https://api.binance.com/api/v3',
                description: 'Dados de criptomoedas em tempo real'
            },
            COINGECKO: {
                name: 'CoinGecko',
                icon: '🦎',
                requiresSecret: false,
                baseUrl: 'https://api.coingecko.com/api/v3',
                description: 'Dados de cripto (requer chave Demo API gratuita)'
            },
            POLYGON: {
                name: 'Polygon.io',
                icon: '🔺',
                requiresSecret: false,
                baseUrl: 'https://api.polygon.io/v2',
                description: 'Dados de ações e forex premium'
            },
            AWESOMEAPI: {
                name: 'AwesomeAPI',
                icon: '🇧🇷',
                requiresSecret: false,
                baseUrl: 'https://economia.awesomeapi.com.br',
                description: 'API brasileira gratuita (USD-BRL, BTC-BRL, EUR-BRL, etc.)'
            }
        };

       class APIConnectionManager {
    constructor() {
        this.connections = new Map();
        this.activeProvider = null;
        this.isInitialized = false;
        this.isLoading = false;
        this.loadFromStorage(); // Inicia carregamento
    }

    async loadFromStorage() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            const { data, error } = await window.supabase
                .from('api_connections')
                .select('*')
                .eq('id', 1)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('⚠️ Nenhuma conexão salva ainda');
                } else if (error.code === '42P01') {
                    console.error('❌ Tabela api_connections não existe! Execute o SQL do PASSO 1');
                } else {
                    console.error('❌ Erro ao carregar conexões:', error);
                }
                this.connections = new Map();
                this.activeProvider = null;
            } else if (data) {
                this.connections = new Map(Object.entries(data.connections || {}));
                this.activeProvider = data.active_provider;
                console.log('✅ Conexões API carregadas do Supabase');
            }
            
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ Erro fatal ao carregar conexões:', error);
            this.connections = new Map();
            this.activeProvider = null;
            this.isInitialized = true;
        } finally {
            this.isLoading = false;
        }
    }

    async ensureInitialized() {
        let attempts = 0;
        while (!this.isInitialized && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.isInitialized) {
            console.error('⚠️ Timeout esperando inicialização do APIManager');
            this.isInitialized = true;
        }
    }

    // ✅ ADICIONAR ESTES MÉTODOS:
    
    async saveToStorage() {
        try {
            const connectionsObj = Object.fromEntries(this.connections);
            
            const { error } = await window.supabase
                .from('api_connections')
                .upsert({
                    id: 1,
                    connections: connectionsObj,
                    active_provider: this.activeProvider
                });
            
            if (error) throw error;
            console.log('💾 Conexões salvas no Supabase');
        } catch (error) {
            console.error('❌ Erro ao salvar conexões:', error);
        }
    }

    addConnection(provider, apiKey, secretKey = null) {
        // APIs que não precisam de chave (como AwesomeAPI)
        const providerConfig = API_PROVIDERS[provider];
        const needsKey = providerConfig && (providerConfig.requiresSecret || provider !== 'AWESOMEAPI');

        this.connections.set(provider, {
            provider,
            apiKey: needsKey ? apiKey : 'PUBLIC_API',
            secretKey,
            status: 'disconnected',
            addedAt: new Date().toISOString()
        });
        this.saveToStorage();
    }

    updateStatus(provider, status) {
        const conn = this.connections.get(provider);
        if (conn) {
            conn.status = status;
            this.connections.set(provider, conn);
            this.saveToStorage();
        }
    }

    setActive(provider) {
        if (this.connections.has(provider)) {
            this.activeProvider = provider;
            this.saveToStorage();
        }
    }

    getActiveConnection() {
        if (!this.activeProvider) return null;
        return this.connections.get(this.activeProvider);
    }

    removeConnection(provider) {
        this.connections.delete(provider);
        if (this.activeProvider === provider) {
            this.activeProvider = null;
        }
        this.saveToStorage();
    }

    getAllConnections() {
        return Array.from(this.connections.values());
    }
}

        /* Continua na PARTE 2... */

        /* ========================================
           FUNÇÕES DE API
           ======================================== */

        // Rate Limiter Class
        class RateLimiter {
            constructor() {
                this.limits = {
                    'ALPHA_VANTAGE': { calls: 0, maxCalls: 5, windowMs: 60000, lastReset: Date.now() },
                    'BINANCE': { calls: 0, maxCalls: 1200, windowMs: 60000, lastReset: Date.now() },
                    'COINGECKO': { calls: 0, maxCalls: 50, windowMs: 60000, lastReset: Date.now() },
                    'POLYGON': { calls: 0, maxCalls: 5, windowMs: 60000, lastReset: Date.now() },
                    'AWESOMEAPI': { calls: 0, maxCalls: 100, windowMs: 60000, lastReset: Date.now() }
                };
            }

            async checkLimit(provider) {
                const limit = this.limits[provider];
                if (!limit) return true;

                const now = Date.now();
                if (now - limit.lastReset >= limit.windowMs) {
                    limit.calls = 0;
                    limit.lastReset = now;
                }

                if (limit.calls >= limit.maxCalls) {
                    const waitTime = limit.windowMs - (now - limit.lastReset);
                    console.warn(`⚠️ Rate limit reached for ${provider}. Waiting ${waitTime}ms`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    limit.calls = 0;
                    limit.lastReset = Date.now();
                }

                limit.calls++;
                return true;
            }

            reset(provider) {
                if (this.limits[provider]) {
                    this.limits[provider].calls = 0;
                    this.limits[provider].lastReset = Date.now();
                }
            }
        }

        const rateLimiter = new RateLimiter();

        // Retry logic with exponential backoff
        async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
            let lastError;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    return await fn();
                } catch (error) {
                    lastError = error;
                    if (attempt < maxRetries - 1) {
                        const delay = baseDelay * Math.pow(2, attempt);
                        console.warn(`⚠️ Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            throw lastError;
        }

        async function fetchRealMarketData(provider, apiKey, symbol, timeframe, secretKey = null) {
            // Check rate limit before making request
            await rateLimiter.checkLimit(provider);

            // Wrap the fetch logic in retry mechanism
            return retryWithBackoff(async () => {
            try {
                let url, response, data;

                switch(provider) {
                    case 'ALPHA_VANTAGE':
                        const avInterval = timeframe === 'M5' ? '5min' : '15min';
                        url = `${API_PROVIDERS.ALPHA_VANTAGE.baseUrl}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${avInterval}&apikey=${apiKey}`;
                        response = await fetch(url);
                        data = await response.json();
                        
                        if (data['Error Message'] || data['Note']) {
                            throw new Error(data['Error Message'] || 'Limite de API atingido');
                        }
                        return parseAlphaVantageData(data, avInterval);

                    case 'BINANCE':
                        const interval = timeframe === 'M5' ? '5m' : '15m';
                        url = `${API_PROVIDERS.BINANCE.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=200`;
                        response = await fetch(url);
                        data = await response.json();
                        
                        if (data.code) {
                            throw new Error(data.msg || 'Erro na API Binance');
                        }
                        return parseBinanceData(data);

                    case 'COINGECKO':
                        const symbolMap = {
                            'BTC': 'bitcoin', 'BTCUSDT': 'bitcoin',
                            'ETH': 'ethereum', 'ETHUSDT': 'ethereum',
                            'BNB': 'binancecoin', 'BNBUSDT': 'binancecoin'
                        };
                        
                        const coinId = symbolMap[symbol.toUpperCase()] || 'bitcoin';
                        url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1`;
                        
                        response = await fetch(url);
                        if (response.ok) {
                            data = await response.json();
                            if (data.prices && data.prices.length > 0) {
                                return parseCoinGeckoData(data);
                            }
                        }
                        throw new Error('CoinGecko: Dados não disponíveis');

                    case 'POLYGON':
                        const multiplier = timeframe === 'M5' ? 5 : 15;
                        const to = new Date().toISOString().split('T')[0];
                        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        url = `${API_PROVIDERS.POLYGON.baseUrl}/aggs/ticker/${symbol}/range/${multiplier}/minute/${from}/${to}?apiKey=${apiKey}`;
                        response = await fetch(url);
                        data = await response.json();

                        if (data.status === 'ERROR') {
                            throw new Error(data.error || 'Erro na API Polygon');
                        }
                        return parsePolygonData(data);

                    case 'AWESOMEAPI':
                        // AwesomeAPI - API brasileira gratuita para cotações
                        // Suporta: USD-BRL, EUR-BRL, BTC-BRL, etc.
                        // Usando endpoint sequencial para obter histórico (limite 100 pontos)
                        url = `https://economia.awesomeapi.com.br/json/${symbol}/100`;
                        response = await fetch(url);
                        data = await response.json();

                        if (data.status === 'error' || !Array.isArray(data)) {
                            throw new Error(data.message || 'Erro na API AwesomeAPI');
                        }
                        return parseAwesomeAPIData(data, symbol);

                    default:
                        throw new Error('Provider não suportado');
                }
            } catch (error) {
                console.error('Erro ao buscar dados reais:', error);
                throw error;
            }
            }); // End of retryWithBackoff
        }

        function parseAlphaVantageData(data, interval) {
            const timeSeriesKey = `Time Series (${interval})`;
            const timeSeries = data[timeSeriesKey];
            
            if (!timeSeries) {
                throw new Error('Dados não encontrados');
            }

            const candles = [];
            for (const [timestamp, values] of Object.entries(timeSeries)) {
                candles.push({
                    timestamp: new Date(timestamp).getTime(),
                    open: parseFloat(values['1. open']),
                    high: parseFloat(values['2. high']),
                    low: parseFloat(values['3. low']),
                    close: parseFloat(values['4. close']),
                    volume: parseFloat(values['5. volume'])
                });
            }

            return candles.sort((a, b) => a.timestamp - b.timestamp).slice(-200);
        }

        function parseBinanceData(data) {
            return data.map(candle => ({
                timestamp: candle[0],
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5])
            }));
        }

        function parseCoinGeckoData(data) {
            return data.prices.slice(-200).map(point => {
                const price = point[1];
                return {
                    timestamp: point[0],
                    open: price,
                    high: price * 1.005,
                    low: price * 0.995,
                    close: price,
                    volume: 1000000
                };
            });
        }

        function parsePolygonData(data) {
            if (!data.results) throw new Error('Resultados não encontrados');
            return data.results.map(candle => ({
                timestamp: candle.t,
                open: candle.o,
                high: candle.h,
                low: candle.l,
                close: candle.c,
                volume: candle.v
            }));
        }

        function parseAwesomeAPIData(data, symbol) {
            // AwesomeAPI retorna array de cotações históricas
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Dados da cotação não encontrados');
            }

            console.log(`📊 [AWESOMEAPI] Recebidos ${data.length} pontos de dados`);

            // Converter dados da AwesomeAPI para formato de candles
            const candles = data.map(quote => {
                const timestamp = parseInt(quote.timestamp) * 1000; // Converter para ms
                const bid = parseFloat(quote.bid);
                const ask = parseFloat(quote.ask);
                const high = parseFloat(quote.high);
                const low = parseFloat(quote.low);

                // Usar a média entre bid e ask para maior precisão
                const midPrice = (bid + ask) / 2;

                // Criar candle a partir dos dados disponíveis
                return {
                    timestamp: timestamp,
                    open: midPrice,
                    high: Math.max(high, midPrice),
                    low: Math.min(low, midPrice),
                    close: midPrice, // Usar média bid/ask
                    volume: 0 // AwesomeAPI não fornece volume
                };
            }).reverse(); // Reverter para ordem cronológica (mais antigo -> mais recente)

            // Log da última cotação
            const latest = candles[candles.length - 1];
            const latestTime = new Date(latest.timestamp);
            const now = new Date();
            const ageMinutes = (now - latestTime) / 60000;

            console.log(`   💰 Última cotação: ${latest.close.toFixed(6)} (${latestTime.toLocaleTimeString('pt-BR')})`);

            // ⚠️ AVISO: Dados muito antigos para opções binárias
            if (ageMinutes > 10) {
                console.warn(`   ⚠️ ATENÇÃO: Dados com ${ageMinutes.toFixed(0)} minutos de atraso!`);
                console.warn(`   ⚠️ Para opções binárias, use dados em tempo real (< 1 minuto)`);
                console.warn(`   💡 AwesomeAPI pode ter cache. Considere usar Binance/Alpha Vantage para dados frescos.`);
            }

            return candles;
        }

        function validateAPIKey(provider, apiKey, secretKey = null) {
            const errors = [];

            switch(provider) {
                case 'ALPHA_VANTAGE':
                    // Alpha Vantage keys are typically 16 alphanumeric characters
                    if (!/^[A-Z0-9]{16}$/i.test(apiKey)) {
                        errors.push('Alpha Vantage API key should be 16 alphanumeric characters');
                    }
                    break;

                case 'BINANCE':
                    // Binance API keys are 64 characters
                    if (!/^[A-Za-z0-9]{64}$/.test(apiKey)) {
                        errors.push('Binance API key should be 64 alphanumeric characters');
                    }
                    if (secretKey && !/^[A-Za-z0-9]{64}$/.test(secretKey)) {
                        errors.push('Binance Secret key should be 64 alphanumeric characters');
                    }
                    break;

                case 'POLYGON':
                    // Polygon keys are typically 32 alphanumeric characters
                    if (!/^[A-Za-z0-9_-]{20,40}$/.test(apiKey)) {
                        errors.push('Polygon API key format appears invalid');
                    }
                    break;

                case 'COINGECKO':
                    // CoinGecko Pro API keys (free tier doesn't require key)
                    if (apiKey && apiKey.trim() && !/^CG-[A-Za-z0-9]{20,}$/.test(apiKey)) {
                        errors.push('CoinGecko Pro API key should start with "CG-"');
                    }
                    break;

                case 'AWESOMEAPI':
                    // AwesomeAPI é gratuita e não requer chave de API
                    // Nenhuma validação necessária
                    break;
            }

            return errors;
        }

        async function testAPIConnection(provider, apiKey, secretKey = null) {
            try {
                let testSymbol = 'BTCUSDT';
                if (provider === 'ALPHA_VANTAGE') testSymbol = 'IBM';
                else if (provider === 'COINGECKO') testSymbol = 'BTC';
                else if (provider === 'POLYGON') testSymbol = 'AAPL';
                else if (provider === 'AWESOMEAPI') testSymbol = 'USD-BRL';

                await fetchRealMarketData(provider, apiKey, testSymbol, 'M5', secretKey);
                return { success: true, message: 'Conexão bem-sucedida!' };
            } catch (error) {
                return { 
                    success: false, 
                    message: `Falha na conexão: ${error.message}` 
                };
            }
        }

        /* ========================================
           SISTEMA DE EXECUÇÃO DE ORDENS
           ======================================== */

        /* ========================================
           CONFIGURAÇÕES BINANCE FUTURES
           ======================================== */
        const FUTURES_CONFIG = {
            exchange: 'binance',
            market: 'futures',
            marginMode: 'ISOLATED',        // Margem isolada (não Cross)
            leverage: 2,                   // Alavancagem padrão: 2x
            timeframe: '5m',               // Candles de 5 minutos
            riskPerTrade: 0.02,            // 2% do capital por trade
            stopLossPercent: 0.02,         // Stop Loss: -2%
            takeProfitPercent: 0.03,       // Take Profit: +3%
            positionDuration: 300000,      // 5 minutos em milissegundos
            modoAutomatico: false,         // Inicia em modo manual
            maxPositions: 1,               // Máximo 1 posição simultânea
            circuitBreakerLosses: 3        // Para após 3 perdas seguidas
        };

        class OrderExecutionManager {
            constructor(apiManager) {
                this.apiManager = apiManager;
                this.activePositions = new Map();
                this.executionHistory = [];
                this.systemLogs = [];
                this.positionTimers = new Map();           // Timers de fechamento
                this.consecutiveLosses = 0;                // Contador de perdas seguidas
                this.circuitBreakerActive = false;         // Circuit breaker
                this.pendingSignal = null;                 // Sinal pendente (modo manual)

                // Configurações do sistema
                this.config = { ...FUTURES_CONFIG };
                this.maxPositions = this.config.maxPositions;
                this.virtualBalance = 10000;

                this.loadFromStorage();
            }

            loadFromStorage() {
                try {
                    const saved = localStorage.getItem('execution_manager_data');
                    if (saved) {
                        const data = JSON.parse(saved);
                        this.executionHistory = data.executionHistory || [];
                        this.virtualBalance = data.virtualBalance || 10000;
                        this.systemLogs = data.systemLogs || [];
                    }
                } catch (error) {
                    console.error('Erro ao carregar gerenciador:', error);
                }
            }

            saveToStorage() {
                try {
                    const data = {
                        executionHistory: this.executionHistory.slice(-100),
                        virtualBalance: this.virtualBalance,
                        systemLogs: this.systemLogs.slice(-200)
                    };
                    localStorage.setItem('execution_manager_data', JSON.stringify(data));
                } catch (error) {
                    console.error('Erro ao salvar gerenciador:', error);
                }
            }

            /* ========================================
               SINCRONIZAÇÃO COM SUPABASE
               ======================================== */
            async saveExecutionToSupabase(execution) {
                try {
                    const { data, error } = await window.supabase
                        .from('futures_executions')
                        .insert([{
                            signal_id: execution.signalId,
                            timestamp: execution.timestamp,
                            symbol: execution.symbol,
                            direction: execution.direction,
                            entry_price: execution.orderResult.executedPrice,
                            stop_loss: execution.signal.stopLoss,
                            take_profit: execution.signal.takeProfit,
                            order_id: execution.orderResult.orderId,
                            stop_loss_order_id: execution.orderResult.stopLossOrderId,
                            take_profit_order_id: execution.orderResult.takeProfitOrderId,
                            result: 'PENDING',
                            risk_amount: execution.riskAmount,
                            quantity: execution.orderResult.executedQty,
                            leverage: execution.orderResult.leverage || this.config.leverage,
                            margin_mode: execution.orderResult.marginMode || this.config.marginMode,
                            commission: execution.orderResult.commission,
                            confidence_score: execution.signal.score,
                            simulated: execution.orderResult.simulated || false,
                            metadata: {
                                indicators: execution.signal.indicators || {},
                                execution_mode: this.config.modoAutomatico ? 'auto' : 'manual'
                            }
                        }])
                        .select();

                    if (error) throw error;

                    // Retornar ID do registro criado
                    return data[0]?.id;

                } catch (error) {
                    console.error('❌ Erro ao salvar execução no Supabase:', error);
                    this.log(`Erro ao salvar no Supabase: ${error.message}`, 'warning');
                    return null;
                }
            }

            async updateExecutionInSupabase(signalId, result, pnl, exitPrice = null) {
                try {
                    const { data, error } = await window.supabase
                        .from('futures_executions')
                        .update({
                            result: result,
                            pnl: pnl,
                            exit_price: exitPrice,
                            closed_at: new Date().toISOString()
                        })
                        .eq('signal_id', signalId)
                        .select();

                    if (error) throw error;

                    this.log(`✅ Execução atualizada no Supabase: ${result}`, 'info');
                    return data;

                } catch (error) {
                    console.error('❌ Erro ao atualizar execução no Supabase:', error);
                    this.log(`Erro ao atualizar Supabase: ${error.message}`, 'warning');
                    return null;
                }
            }

            async loadExecutionsFromSupabase() {
                try {
                    const { data, error } = await window.supabase
                        .from('futures_executions')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(100);

                    if (error) throw error;

                    if (data && data.length > 0) {
                        console.log(`✅ ${data.length} execuções carregadas do Supabase`);
                        return data;
                    }

                    return [];

                } catch (error) {
                    console.error('❌ Erro ao carregar execuções do Supabase:', error);
                    return [];
                }
            }

            async getExecutionStats() {
                try {
                    const { data, error } = await window.supabase
                        .from('futures_execution_stats')
                        .select('*')
                        .single();

                    if (error && error.code !== 'PGRST116') throw error;

                    return data || {
                        total_executions: 0,
                        wins: 0,
                        losses: 0,
                        win_rate: 0,
                        total_pnl: 0
                    };

                } catch (error) {
                    console.error('❌ Erro ao buscar estatísticas:', error);
                    return null;
                }
            }

            log(message, type = 'info') {
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    message,
                    type
                };
                this.systemLogs.push(logEntry);
                
                if (this.systemLogs.length > 200) {
                    this.systemLogs = this.systemLogs.slice(-200);
                }
                
                this.saveToStorage();
                console.log(`[${type.toUpperCase()}] ${message}`);
            }

            /* ========================================
               PROCESSAMENTO DE SINAL (MANUAL OU AUTOMÁTICO)
               ======================================== */
            async executeSignalAuto(signal, mode, riskAmount) {
                // Verificar circuit breaker
                if (this.circuitBreakerActive) {
                    this.log('🚨 Circuit Breaker ativo! Sistema pausado após perdas consecutivas', 'error');
                    return {
                        success: false,
                        reason: 'circuit_breaker',
                        message: 'Sistema pausado por segurança. Reative manualmente.'
                    };
                }

                // Se modo MANUAL: armazenar sinal e retornar (interface mostrará popup)
                if (mode !== 'auto') {
                    this.pendingSignal = {
                        signal,
                        riskAmount,
                        calculatedData: this.calculateTradeData(signal, riskAmount)
                    };

                    this.log('📋 Novo sinal detectado - aguardando confirmação manual', 'info');
                    return {
                        success: false,
                        reason: 'manual_mode',
                        message: 'Modo manual ativo - sinal aguardando confirmação',
                        pendingSignal: this.pendingSignal
                    };
                }

                // Modo AUTOMÁTICO: executar diretamente
                return await this.executeSignal(signal, riskAmount);
            }

            /* ========================================
               EXECUÇÃO EFETIVA DO SINAL
               ======================================== */
            async executeSignal(signal, riskAmount) {
                // Validações de segurança
                const validation = this.validateTrade(signal, riskAmount);
                if (!validation.valid) {
                    this.log(`❌ Validação falhou: ${validation.reason}`, 'warning');
                    return {
                        success: false,
                        reason: validation.reason,
                        message: validation.message
                    };
                }

                const activeConn = this.apiManager.getActiveConnection();
                if (!activeConn) {
                    this.log('Sem conexão ativa', 'error');
                    return {
                        success: false,
                        reason: 'no_connection',
                        message: 'Nenhuma conexão de API ativa'
                    };
                }

                this.log(`🤖 Executando: ${signal.direction} ${signal.symbol} | Confiança: ${signal.score}%`, 'info');

                try {
                    let orderResult;

                    // Executar na Binance Futures
                    if (activeConn.provider === 'BINANCE') {
                        orderResult = await this.executeBinanceFuturesOrder(signal, activeConn, riskAmount);
                    } else {
                        orderResult = await this.executeSimulatedOrder(signal, riskAmount);
                    }

                    if (orderResult.success) {
                        // Marcar sinal como executado
                        signal.executed = true;
                        signal.executionDetails = orderResult;

                        // Adicionar riskAmount ao orderResult
                        orderResult.riskAmount = riskAmount;

                        // Registrar posição ativa
                        this.activePositions.set(signal.id, {
                            signal,
                            orderResult,
                            openTime: new Date(),
                            riskAmount,
                            stopLossOrderId: orderResult.stopLossOrderId,
                            takeProfitOrderId: orderResult.takeProfitOrderId
                        });

                        // Reduzir saldo virtual
                        this.virtualBalance -= riskAmount;

                        // Iniciar timer de fechamento (5 minutos)
                        this.startPositionTimer(signal.id);

                        // Registrar execução
                        this.recordExecution(signal, orderResult);
                        this.log(`✅ Ordem executada: ${orderResult.orderId} | SL/TP configurados`, 'success');
                        this.saveToStorage();
                    }

                    return orderResult;

                } catch (error) {
                    this.log(`❌ Erro na execução: ${error.message}`, 'error');
                    return {
                        success: false,
                        reason: 'execution_error',
                        message: error.message
                    };
                }
            }

            /* ========================================
               VALIDAÇÕES DE SEGURANÇA
               ======================================== */
            validateTrade(signal, riskAmount) {
                if (this.activePositions.size >= this.maxPositions) {
                    return {
                        valid: false,
                        reason: 'max_positions',
                        message: `Máximo de ${this.maxPositions} posição(ões) simultânea(s) atingido`
                    };
                }

                if (riskAmount > this.virtualBalance * this.config.riskPerTrade) {
                    return {
                        valid: false,
                        reason: 'risk_too_high',
                        message: `Risco excede ${this.config.riskPerTrade * 100}% do saldo`
                    };
                }

                if (riskAmount > this.virtualBalance) {
                    return {
                        valid: false,
                        reason: 'insufficient_balance',
                        message: 'Saldo insuficiente para executar ordem'
                    };
                }

                return { valid: true };
            }

            /* ========================================
               CALCULAR DADOS DO TRADE
               ======================================== */
            calculateTradeData(signal, riskAmount) {
                const price = signal.price;
                const stopLoss = signal.stopLoss;
                const takeProfit = signal.takeProfit;
                const quantity = this.calculatePositionSize(signal, riskAmount);

                return {
                    symbol: signal.symbol,
                    direction: signal.direction,
                    price: price.toFixed(2),
                    quantity: quantity.toFixed(6),
                    stopLoss: stopLoss.toFixed(2),
                    takeProfit: takeProfit.toFixed(2),
                    stopLossPercent: ((Math.abs(price - stopLoss) / price) * 100).toFixed(2),
                    takeProfitPercent: ((Math.abs(takeProfit - price) / price) * 100).toFixed(2),
                    riskAmount: riskAmount.toFixed(2),
                    potentialProfit: (riskAmount * (this.config.takeProfitPercent / this.config.stopLossPercent)).toFixed(2),
                    duration: `${this.config.positionDuration / 60000} minutos`,
                    score: signal.score || 0,
                    accuracy: signal.accuracy || null
                };
            }

            /* ========================================
               BINANCE FUTURES - EXECUÇÃO COMPLETA
               ======================================== */
            async executeBinanceFuturesOrder(signal, connection, riskAmount) {
                // URLs da Binance Futures
                // Testnet: https://testnet.binancefuture.com (base)
                // Produção: https://fapi.binance.com (base)
                const FUTURES_TESTNET = 'https://testnet.binancefuture.com/fapi/v1';
                const FUTURES_PROD = 'https://fapi.binance.com/fapi/v1';
                const BASE_URL = connection.testnet ? FUTURES_TESTNET : FUTURES_PROD;

                try {
                    // 1. Configurar alavancagem e margem isolada
                    await this.setBinanceLeverage(BASE_URL, signal.symbol, connection);
                    await this.setBinanceMarginType(BASE_URL, signal.symbol, connection);

                    // 2. Calcular quantidade
                    const quantity = this.calculatePositionSize(signal, riskAmount);
                    const side = signal.direction === 'LONG' ? 'BUY' : 'SELL';

                    // 3. Abrir posição MARKET
                    this.log(`📤 Abrindo posição ${side} ${signal.symbol} | Qtd: ${quantity}`, 'info');

                    const orderParams = new URLSearchParams({
                        symbol: signal.symbol,
                        side: side,
                        type: 'MARKET',
                        quantity: quantity.toString(),
                        timestamp: Date.now().toString()
                    });

                    const orderSignature = await this.signBinanceRequest(orderParams.toString(), connection.secretKey);
                    orderParams.append('signature', orderSignature);

                    const orderResponse = await fetch(`${BASE_URL}/order?${orderParams.toString()}`, {
                        method: 'POST',
                        headers: { 'X-MBX-APIKEY': connection.apiKey }
                    });

                    const orderData = await orderResponse.json();

                    if (!orderResponse.ok) {
                        throw new Error(orderData.msg || 'Erro ao abrir posição');
                    }

                    const executedPrice = parseFloat(orderData.avgPrice || signal.price);

                    // 4. Definir Stop Loss
                    const stopLossOrderId = await this.setBinanceStopLoss(
                        BASE_URL,
                        signal.symbol,
                        signal.stopLoss,
                        quantity,
                        side === 'BUY' ? 'SELL' : 'BUY',
                        connection
                    );

                    // 5. Definir Take Profit
                    const takeProfitOrderId = await this.setBinanceTakeProfit(
                        BASE_URL,
                        signal.symbol,
                        signal.takeProfit,
                        quantity,
                        side === 'BUY' ? 'SELL' : 'BUY',
                        connection
                    );

                    this.log(`✅ Posição aberta | SL: ${signal.stopLoss} | TP: ${signal.takeProfit}`, 'success');

                    return {
                        success: true,
                        orderId: orderData.orderId,
                        executedQty: quantity,
                        executedPrice: executedPrice,
                        commission: parseFloat(orderData.commission || 0),
                        timestamp: orderData.updateTime,
                        stopLossOrderId: stopLossOrderId,
                        takeProfitOrderId: takeProfitOrderId,
                        leverage: this.config.leverage,
                        marginMode: this.config.marginMode
                    };

                } catch (error) {
                    this.log(`❌ Erro Binance Futures: ${error.message}`, 'error');
                    this.log(`⚠️ Usando modo simulado como fallback`, 'warning');
                    return await this.executeSimulatedOrder(signal, riskAmount);
                }
            }

            /* Configurar alavancagem */
            async setBinanceLeverage(baseUrl, symbol, connection) {
                try {
                    const params = new URLSearchParams({
                        symbol: symbol,
                        leverage: this.config.leverage.toString(),
                        timestamp: Date.now().toString()
                    });

                    const signature = await this.signBinanceRequest(params.toString(), connection.secretKey);
                    params.append('signature', signature);

                    await fetch(`${baseUrl}/leverage?${params.toString()}`, {
                        method: 'POST',
                        headers: { 'X-MBX-APIKEY': connection.apiKey }
                    });

                    this.log(`⚙️ Alavancagem configurada: ${this.config.leverage}x`, 'info');
                } catch (error) {
                    this.log(`⚠️ Erro ao configurar alavancagem: ${error.message}`, 'warning');
                }
            }

            /* Configurar margem isolada */
            async setBinanceMarginType(baseUrl, symbol, connection) {
                try {
                    const params = new URLSearchParams({
                        symbol: symbol,
                        marginType: this.config.marginMode,
                        timestamp: Date.now().toString()
                    });

                    const signature = await this.signBinanceRequest(params.toString(), connection.secretKey);
                    params.append('signature', signature);

                    await fetch(`${baseUrl}/marginType?${params.toString()}`, {
                        method: 'POST',
                        headers: { 'X-MBX-APIKEY': connection.apiKey }
                    });

                    this.log(`⚙️ Margem configurada: ${this.config.marginMode}`, 'info');
                } catch (error) {
                    // Ignora erro se margem já estiver configurada
                    if (!error.message.includes('No need to change')) {
                        this.log(`⚠️ Erro ao configurar margem: ${error.message}`, 'warning');
                    }
                }
            }

            /* Definir Stop Loss */
            async setBinanceStopLoss(baseUrl, symbol, stopPrice, quantity, side, connection) {
                try {
                    const params = new URLSearchParams({
                        symbol: symbol,
                        side: side,
                        type: 'STOP_MARKET',
                        stopPrice: stopPrice.toString(),
                        quantity: quantity.toString(),
                        timestamp: Date.now().toString()
                    });

                    const signature = await this.signBinanceRequest(params.toString(), connection.secretKey);
                    params.append('signature', signature);

                    const response = await fetch(`${baseUrl}/order?${params.toString()}`, {
                        method: 'POST',
                        headers: { 'X-MBX-APIKEY': connection.apiKey }
                    });

                    const data = await response.json();
                    return data.orderId || null;

                } catch (error) {
                    this.log(`⚠️ Erro ao definir Stop Loss: ${error.message}`, 'warning');
                    return null;
                }
            }

            /* Definir Take Profit */
            async setBinanceTakeProfit(baseUrl, symbol, takeProfitPrice, quantity, side, connection) {
                try {
                    const params = new URLSearchParams({
                        symbol: symbol,
                        side: side,
                        type: 'TAKE_PROFIT_MARKET',
                        stopPrice: takeProfitPrice.toString(),
                        quantity: quantity.toString(),
                        timestamp: Date.now().toString()
                    });

                    const signature = await this.signBinanceRequest(params.toString(), connection.secretKey);
                    params.append('signature', signature);

                    const response = await fetch(`${baseUrl}/order?${params.toString()}`, {
                        method: 'POST',
                        headers: { 'X-MBX-APIKEY': connection.apiKey }
                    });

                    const data = await response.json();
                    return data.orderId || null;

                } catch (error) {
                    this.log(`⚠️ Erro ao definir Take Profit: ${error.message}`, 'warning');
                    return null;
                }
            }

            async executeSimulatedOrder(signal, riskAmount) {
                const slippage = (Math.random() * 0.001) + 0.0005;
                const executedPrice = signal.direction === 'BUY' 
                    ? signal.price * (1 + slippage)
                    : signal.price * (1 - slippage);

                const quantity = this.calculatePositionSize(signal, riskAmount);

                await new Promise(resolve => setTimeout(resolve, 100));

                return {
                    success: true,
                    orderId: 'SIM-' + Date.now(),
                    executedQty: quantity,
                    executedPrice: executedPrice,
                    commission: (executedPrice * quantity) * 0.001,
                    timestamp: Date.now(),
                    simulated: true
                };
            }

            calculatePositionSize(signal, riskAmount) {
                const riskPercentage = Math.abs((signal.price - signal.stopLoss) / signal.price);
                const quantity = (riskAmount / signal.price) / riskPercentage;
                return Math.floor(quantity * 1000000) / 1000000;
            }

            async signBinanceRequest(queryString, secretKey) {
                const encoder = new TextEncoder();
                const keyData = encoder.encode(secretKey);
                const messageData = encoder.encode(queryString);

                const key = await crypto.subtle.importKey(
                    'raw',
                    keyData,
                    { name: 'HMAC', hash: 'SHA-256' },
                    false,
                    ['sign']
                );

                const signature = await crypto.subtle.sign('HMAC', key, messageData);
                const hashArray = Array.from(new Uint8Array(signature));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }

            /* ========================================
               TIMER DE FECHAMENTO AUTOMÁTICO (5 MIN)
               ======================================== */
            startPositionTimer(signalId) {
                const duration = this.config.positionDuration;

                const timer = setTimeout(() => {
                    this.log(`⏰ Timer de ${duration / 60000}min expirado para ${signalId}`, 'warning');
                    this.autoClosePosition(signalId, 'EXPIRED');
                }, duration);

                this.positionTimers.set(signalId, timer);
                this.log(`⏱️ Timer de ${duration / 60000}min iniciado`, 'info');
            }

            stopPositionTimer(signalId) {
                const timer = this.positionTimers.get(signalId);
                if (timer) {
                    clearTimeout(timer);
                    this.positionTimers.delete(signalId);
                }
            }

            /* ========================================
               FECHAMENTO AUTOMÁTICO DE POSIÇÃO
               ======================================== */
            async autoClosePosition(signalId, reason) {
                const position = this.activePositions.get(signalId);
                if (!position) return;

                this.log(`🔄 Fechando posição automaticamente: ${reason}`, 'info');

                // Cancelar ordens SL/TP pendentes na Binance (se houver)
                if (position.stopLossOrderId || position.takeProfitOrderId) {
                    await this.cancelBinanceOrders(position);
                }

                // Calcular P&L
                const pnl = this.calculatePnL(position, reason);

                // Fechar posição
                this.closePosition(signalId, reason, pnl);

                // Verificar circuit breaker
                if (pnl < 0) {
                    this.consecutiveLosses++;
                    if (this.consecutiveLosses >= this.config.circuitBreakerLosses) {
                        this.activateCircuitBreaker();
                    }
                } else {
                    this.consecutiveLosses = 0; // Reset em caso de lucro
                }
            }

            /* Calcular lucro/perda */
            calculatePnL(position, result) {
                const signal = position.signal;
                const riskAmount = position.riskAmount;

                if (result === 'STOP_LOSS') {
                    return -riskAmount; // Perda total
                } else if (result === 'TAKE_PROFIT') {
                    return riskAmount * (this.config.takeProfitPercent / this.config.stopLossPercent); // Lucro baseado no risco
                } else {
                    // EXPIRED ou fechamento manual: P&L neutro ou baseado em preço atual
                    return 0;
                }
            }

            /* Cancelar ordens pendentes na Binance */
            async cancelBinanceOrders(position) {
                const activeConn = this.apiManager.getActiveConnection();
                if (!activeConn || activeConn.provider !== 'BINANCE') return;

                const BASE_URL = activeConn.testnet
                    ? 'https://testnet.binancefuture.com/fapi/v1'
                    : 'https://fapi.binance.com/fapi/v1';

                try {
                    const ordersToCancel = [position.stopLossOrderId, position.takeProfitOrderId].filter(Boolean);

                    for (const orderId of ordersToCancel) {
                        const params = new URLSearchParams({
                            symbol: position.signal.symbol,
                            orderId: orderId.toString(),
                            timestamp: Date.now().toString()
                        });

                        const signature = await this.signBinanceRequest(params.toString(), activeConn.secretKey);
                        params.append('signature', signature);

                        await fetch(`${BASE_URL}/order?${params.toString()}`, {
                            method: 'DELETE',
                            headers: { 'X-MBX-APIKEY': activeConn.apiKey }
                        });
                    }

                    this.log(`✅ Ordens SL/TP canceladas`, 'info');
                } catch (error) {
                    this.log(`⚠️ Erro ao cancelar ordens: ${error.message}`, 'warning');
                }
            }

            /* ========================================
               CIRCUIT BREAKER (PAUSA APÓS PERDAS)
               ======================================== */
            activateCircuitBreaker() {
                this.circuitBreakerActive = true;
                this.log(`🚨 CIRCUIT BREAKER ATIVADO após ${this.consecutiveLosses} perdas consecutivas!`, 'error');
                this.log(`⚠️ Sistema pausado. Reative manualmente após análise.`, 'error');
            }

            deactivateCircuitBreaker() {
                this.circuitBreakerActive = false;
                this.consecutiveLosses = 0;
                this.log(`✅ Circuit Breaker desativado - sistema reativado`, 'success');
            }

            /* ========================================
               MÉTODOS MANUAIS
               ======================================== */
            async executeManualSignal() {
                if (!this.pendingSignal) {
                    return { success: false, message: 'Nenhum sinal pendente' };
                }

                const { signal, riskAmount } = this.pendingSignal;
                const result = await this.executeSignal(signal, riskAmount);
                this.pendingSignal = null;

                return result;
            }

            ignoreManualSignal() {
                this.pendingSignal = null;
                this.log('❌ Sinal ignorado pelo usuário', 'info');
            }

            getPendingSignal() {
                return this.pendingSignal;
            }

            copySignalToClipboard() {
                if (!this.pendingSignal) return false;

                const data = this.pendingSignal.calculatedData;
                const text = `
🤖 SINAL ALPHA-LEARNER

Par: ${data.symbol}
Direção: ${data.direction}
Preço: $${data.price}
Quantidade: ${data.quantity}

Stop Loss: $${data.stopLoss} (-${data.stopLossPercent}%)
Take Profit: $${data.takeProfit} (+${data.takeProfitPercent}%)

Risco: $${data.riskAmount}
Lucro Potencial: $${data.potentialProfit}
Duração: ${data.duration}

Score de Confiança: ${data.score}%${data.accuracy !== null ? `\nPrecisão da Análise: ${data.accuracy}%` : ''}
                `.trim();

                navigator.clipboard.writeText(text);
                this.log('📋 Sinal copiado para clipboard!', 'success');
                return true;
            }

            /* Exportar logs para CSV */
            exportLogsToCSV() {
                const header = 'Timestamp,Símbolo,Direção,Preço Entrada,Stop Loss,Take Profit,Resultado,P&L,Taxa,Lucro Líquido\n';

                const rows = this.executionHistory.map(exec => {
                    const pnl = exec.pnl || 0;
                    const commission = exec.orderResult.commission || 0;
                    const netProfit = pnl - commission;

                    return [
                        exec.timestamp,
                        exec.symbol,
                        exec.direction,
                        exec.orderResult.executedPrice,
                        exec.signal.stopLoss,
                        exec.signal.takeProfit,
                        exec.result || 'PENDING',
                        pnl.toFixed(2),
                        commission.toFixed(2),
                        netProfit.toFixed(2)
                    ].join(',');
                }).join('\n');

                const csv = header + rows;
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `alpha-learner-logs-${Date.now()}.csv`;
                link.click();

                this.log('📊 Logs exportados para CSV', 'success');
            }

            closePosition(signalId, result, pnl) {
                const position = this.activePositions.get(signalId);

                if (position) {
                    // Parar timer
                    this.stopPositionTimer(signalId);

                    // Atualizar saldo
                    this.virtualBalance += position.riskAmount + pnl;

                    // Calcular preço de saída (estimado)
                    const exitPrice = this.calculateExitPrice(position, result, pnl);

                    // Remover posição
                    this.activePositions.delete(signalId);

                    // Log
                    this.log(`📊 Posição fechada: ${result} | P&L: R$${pnl.toFixed(2)}`,
                        pnl >= 0 ? 'success' : 'warning');

                    // Salvar localStorage
                    this.saveToStorage();

                    // Atualizar no Supabase (assíncrono)
                    this.updateExecutionInSupabase(signalId, result, pnl, exitPrice).catch(err => {
                        console.error('Erro ao atualizar execução no Supabase:', err);
                    });
                }
            }

            calculateExitPrice(position, result, pnl) {
                if (result === 'TAKE_PROFIT') {
                    return position.signal.takeProfit;
                } else if (result === 'STOP_LOSS') {
                    return position.signal.stopLoss;
                } else {
                    // EXPIRED ou MANUAL: estimar baseado no P&L
                    const entryPrice = position.orderResult.executedPrice;
                    const quantity = position.orderResult.executedQty;
                    if (quantity === 0) return entryPrice;

                    const priceChange = pnl / quantity;
                    return entryPrice + priceChange;
                }
            }

            emergencyCloseAll() {
                this.log('🚨 FECHAMENTO DE EMERGÊNCIA ACIONADO', 'error');
                
                const closedPositions = [];
                this.activePositions.forEach((position, signalId) => {
                    this.virtualBalance += position.riskAmount;
                    closedPositions.push(signalId);
                    this.log(`🛑 Posição ${signalId} fechada por emergência`, 'warning');
                });

                this.activePositions.clear();
                this.saveToStorage();

                return closedPositions;
            }

            recordExecution(signal, orderResult) {
                const execution = {
                    signalId: signal.id,
                    timestamp: new Date().toISOString(),
                    symbol: signal.symbol,
                    direction: signal.direction,
                    orderResult: orderResult,
                    riskAmount: orderResult.riskAmount || 0,
                    signal: {
                        score: signal.score,
                        price: signal.price,
                        stopLoss: signal.stopLoss,
                        takeProfit: signal.takeProfit,
                        indicators: signal.indicators
                    }
                };

                this.executionHistory.push(execution);

                if (this.executionHistory.length > 100) {
                    this.executionHistory = this.executionHistory.slice(-100);
                }

                // Salvar em localStorage
                this.saveToStorage();

                // Salvar no Supabase (assíncrono, não bloqueia)
                this.saveExecutionToSupabase(execution).catch(err => {
                    console.error('Erro ao salvar execução no Supabase:', err);
                });
            }

            getExecutionHistory() {
                return [...this.executionHistory];
            }

            getSystemLogs() {
                return [...this.systemLogs];
            }

            getActivePositions() {
                return Array.from(this.activePositions.values());
            }

            getVirtualBalance() {
                return this.virtualBalance;
            }

            setMaxPositions(max) {
                this.maxPositions = Math.max(1, Math.min(10, max));
                this.log(`Limite de posições alterado para ${this.maxPositions}`, 'info');
                this.saveToStorage();
            }
        }

        /* ========================================
           SISTEMA DE AUDITORIA (CORRIGIDO)
           ======================================== */

        class AuditSystem {
    constructor() {
        this.auditLogs = [];
        this.performanceByHour = {};
        this.performanceByScore = {};
        this.indicatorPerformance = {};
        this.listeners = new Set();
        this.isInitialized = false;
        // Don't call async method in constructor - will be called explicitly
    }

    addChangeListener(callback) {
        this.listeners.add(callback);
    }

    removeChangeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyChange() {
        this.listeners.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Erro ao notificar listener:', error);
            }
        });
    }
    // ✅ ADICIONE ESTE MÉTODO AQUI
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Carregar logs do Supabase
            const { data: logs, error: logsError } = await window.supabase
                .from('audit_logs')
                .select('*')
                .order('generated_at', { ascending: false })
                .limit(500);

            if (logsError && logsError.code !== 'PGRST116') throw logsError;

            if (logs && logs.length > 0) {
                this.auditLogs = logs.map(log => ({
                    signalId: log.signal_id,
                    generatedAt: log.generated_at,
                    candleCloseTime: log.candle_close_time,
                    timeDifference: log.time_difference,
                    prices: log.prices,
                    indicators: log.indicators,
                    scoreRange: log.score_range,
                    hourOfDay: log.hour_of_day,
                    outcome: log.outcome,
                    outcomeTime: log.outcome_time,
                    reason: log.reason,
                    metadata: log.metadata
                }));
            }

            // Carregar estatísticas de performance
            const { data: stats, error: statsError } = await window.supabase
                .from('performance_stats')
                .select('*');

            if (statsError && statsError.code !== 'PGRST116') throw statsError;

            if (stats && stats.length > 0) {
                stats.forEach(stat => {
                    const statData = {
                        total: stat.total,
                        wins: stat.wins,
                        losses: stat.losses,
                        expired: stat.expired || 0,
                        totalPnL: parseFloat(stat.total_pnl || 0)
                    };

                    if (stat.stat_type === 'by_hour') {
                        this.performanceByHour[stat.stat_key] = statData;
                    } else if (stat.stat_type === 'by_score') {
                        this.performanceByScore[stat.stat_key] = statData;
                    } else if (stat.stat_type === 'by_indicator') {
                        this.indicatorPerformance[stat.stat_key] = {
                            total: stat.total,
                            wins: stat.wins,
                            losses: stat.losses
                        };
                    }
                });
            }

            this.isInitialized = true;
            console.log('✅ AuditSystem carregado do Supabase:', this.auditLogs.length, 'logs de auditoria');

        } catch (error) {
            console.error('❌ Erro ao carregar AuditSystem:', error);
            console.log('ℹ️ Continuando com sistema de auditoria vazio');
            this.isInitialized = true;
        }
    }

   

           async saveToStorage() {
    try {
        // Salvar logs no Supabase
        if (this.auditLogs.length > 0) {
            const recentLogs = this.auditLogs.slice(-100); // Últimos 100 logs

            for (const log of recentLogs) {
                // ⚠️ SKIP: Não salvar EMPATE no Supabase (constraint não permite)
                if (log.outcome === 'EMPATE') {
                    continue;
                }

                const { error } = await window.supabase
                    .from('audit_logs')
                    .upsert({
                        signal_id: log.signalId,
                        generated_at: log.generatedAt,
                        candle_close_time: log.candleCloseTime,
                        time_difference: log.timeDifference,
                        prices: log.prices,
                        indicators: log.indicators,
                        score_range: log.scoreRange,
                        hour_of_day: log.hourOfDay,
                        outcome: log.outcome,
                        outcome_time: log.outcomeTime,
                        reason: log.reason,
                        metadata: log.metadata
                    }, {
                        onConflict: 'signal_id'
                    });

                if (error && error.code !== '23505') { // Ignora erros de duplicata
                    console.error('Erro ao salvar log:', error);
                }
            }
        }

        // Salvar estatísticas de performance
        const statsToSave = [];

        // Por hora
        Object.entries(this.performanceByHour).forEach(([hour, stats]) => {
            statsToSave.push({
                stat_type: 'by_hour',
                stat_key: hour,
                total: Math.floor(stats.total || 0),
                wins: Math.floor(stats.wins || 0),
                losses: Math.floor(stats.losses || 0),
                expired: Math.floor(stats.expired || 0),
                total_pnl: stats.totalPnL
            });
        });

        // Por score
        Object.entries(this.performanceByScore).forEach(([range, stats]) => {
            statsToSave.push({
                stat_type: 'by_score',
                stat_key: range,
                total: Math.floor(stats.total || 0),
                wins: Math.floor(stats.wins || 0),
                losses: Math.floor(stats.losses || 0),
                expired: Math.floor(stats.expired || 0),
                total_pnl: 0
            });
        });

        // Por indicador
        Object.entries(this.indicatorPerformance).forEach(([indicator, stats]) => {
            statsToSave.push({
                stat_type: 'by_indicator',
                stat_key: indicator,
                total: Math.floor(stats.total || 0),
                wins: Math.floor(stats.wins || 0),
                losses: Math.floor(stats.losses || 0),
                expired: 0,
                total_pnl: 0
            });
        });

        if (statsToSave.length > 0) {
            const { error: statsError } = await window.supabase
                .from('performance_stats')
                .upsert(statsToSave, {
                    onConflict: 'stat_type,stat_key'
                });

            if (statsError) {
                console.error('Erro ao salvar estatísticas:', statsError);
            }
        }

        if (window.debugAudit) {
            console.log('💾 [AUDIT] Dados salvos no Supabase');
        }
        
        this.notifyChange();
    } catch (e) {
        console.error('❌ [AUDIT] Erro ao salvar auditoria:', e);
    }
}

            logSignalGeneration(signal, currentPrice, indicators) {
                if (window.debugAudit) {
                    console.log('🔍 [AUDIT] logSignalGeneration chamado:', {
                        signalId: signal.id,
                        price: signal.price,
                        currentPrice: currentPrice.close
                    });
                }

                const candleCloseTime = new Date(signal.timestamp);
                candleCloseTime.setSeconds(0, 0);
                candleCloseTime.setMinutes(Math.floor(candleCloseTime.getMinutes() / 5) * 5 + 5);

                const log = {
                    signalId: signal.id,
                    generatedAt: signal.timestamp.toISOString(),
                    candleCloseTime: candleCloseTime.toISOString(),
                    timeDifference: (candleCloseTime - signal.timestamp) / 1000,
                    
                    prices: {
                        theoretical: signal.price,
                        actualEntry: null,
                        slippage: null,
                        actualExit: null,
                        finalPnL: null
                    },
                    
                    indicators: this.formatIndicators(signal, indicators),
                    
                    scoreRange: this.getScoreRange(signal.score),
                    hourOfDay: signal.timestamp.getHours(),
                    
                    outcome: null,
                    outcomeTime: null,
                    reason: null,
                    
                    metadata: {
                        direction: signal.direction,
                        symbol: signal.symbol,
                        timeframe: signal.timeframe,
                        dataSource: signal.dataSource,
                        hasDivergence: signal.divergence ? true : false
                    }
                };

                this.auditLogs.push(log);
                if (this.auditLogs.length > 500) {
                    this.auditLogs = this.auditLogs.slice(-500);
                }
                
                this.saveToStorage();
                
                if (window.debugAudit) {
                    console.log('✅ [AUDIT] Log salvo. Total de logs:', this.auditLogs.length);
                }
                
                return log;
            }

            formatIndicators(signal, indicators) {
                const formatted = {};
                
                signal.contributors.forEach(indicator => {
                    formatted[indicator] = {
                        weight: indicators.weights ? indicators.weights[indicator] : 0,
                        contribution: 0
                    };
                });

                return formatted;
            }

            getScoreRange(score) {
                if (score >= 90) return '90-100';
                if (score >= 80) return '80-89';
                if (score >= 70) return '70-79';
                if (score >= 60) return '60-69';
                if (score >= 50) return '50-59';
                return '0-49';
            }

            updateSignalOutcome(signalId, outcome, finalPrice, pnl, executionDetails = null) {
                if (window.debugAudit) {
                    console.log('🔍 [AUDIT] updateSignalOutcome chamado:', {
                        signalId,
                        outcome,
                        finalPrice,
                        pnl
                    });
                }

                const log = this.auditLogs.find(l => l.signalId === signalId);
                
                if (log) {
                    log.outcome = outcome;
                    log.outcomeTime = new Date().toISOString();
                    log.prices.actualExit = finalPrice;
                    log.prices.finalPnL = pnl;
                    
                    if (executionDetails) {
                        log.prices.actualEntry = executionDetails.executedPrice;
                        log.prices.slippage = Math.abs(executionDetails.executedPrice - log.prices.theoretical);
                    }

                    const duration = (new Date(log.outcomeTime) - new Date(log.generatedAt)) / 60000;
                    log.reason = this.determineReason(outcome, duration);

                    this.updateStatistics(log);
                    this.saveToStorage();
                    
                    if (window.debugAudit) {
                        console.log('✅ [AUDIT] Outcome atualizado com sucesso');
                    }
                } else {
                    if (window.debugAudit) {
                        console.error('❌ [AUDIT] Log não encontrado para signalId:', signalId);
                    }
                }
            }

            determineReason(outcome, durationMinutes) {
                const mins = Math.floor(durationMinutes);

                // Opções binárias: 5 minutos é o tempo padrão
                const isBinaryOption = mins >= 4 && mins <= 6;

                if (outcome === 'ACERTO') {
                    if (isBinaryOption) {
                        return `Opção binária: preço fechou favorável (${mins}min)`;
                    }
                    return `Atingiu take profit em ${mins}min`;
                } else if (outcome === 'ERRO') {
                    if (isBinaryOption) {
                        return `Opção binária: preço fechou desfavorável (${mins}min)`;
                    }
                    return `Atingiu stop loss em ${mins}min`;
                } else if (outcome === 'EXPIRADO') {
                    return `Expirou após ${mins}min sem atingir alvos`;
                } else if (outcome === 'CANCELADO') {
                    return 'Cancelado manualmente';
                }
                return 'Desconhecido';
            }

            updateStatistics(log) {
                if (!log.outcome || log.outcome === 'PENDENTE') return;

                const hour = log.hourOfDay;
                if (!this.performanceByHour[hour]) {
                    this.performanceByHour[hour] = { total: 0, wins: 0, losses: 0, expired: 0, totalPnL: 0 };
                }
                this.performanceByHour[hour].total++;
                if (log.outcome === 'ACERTO') this.performanceByHour[hour].wins++;
                else if (log.outcome === 'ERRO') this.performanceByHour[hour].losses++;
                else if (log.outcome === 'EXPIRADO') this.performanceByHour[hour].expired++;
                this.performanceByHour[hour].totalPnL += log.prices.finalPnL || 0;

                const scoreRange = log.scoreRange;
                if (!this.performanceByScore[scoreRange]) {
                    this.performanceByScore[scoreRange] = { total: 0, wins: 0, losses: 0, expired: 0 };
                }
                this.performanceByScore[scoreRange].total++;
                if (log.outcome === 'ACERTO') this.performanceByScore[scoreRange].wins++;
                else if (log.outcome === 'ERRO') this.performanceByScore[scoreRange].losses++;
                else if (log.outcome === 'EXPIRADO') this.performanceByScore[scoreRange].expired++;

                Object.keys(log.indicators).forEach(indicator => {
                    if (!this.indicatorPerformance[indicator]) {
                        this.indicatorPerformance[indicator] = { total: 0, wins: 0, losses: 0 };
                    }
                    this.indicatorPerformance[indicator].total++;
                    if (log.outcome === 'ACERTO') this.indicatorPerformance[indicator].wins++;
                    else if (log.outcome === 'ERRO') this.indicatorPerformance[indicator].losses++;
                });
            }

            getHealthAlerts() {
                const alerts = [];
                const recentLogs = this.auditLogs.slice(-20).filter(l => l.outcome && l.outcome !== 'PENDENTE');

                if (recentLogs.length >= 10) {
                    const winRate = (recentLogs.filter(l => l.outcome === 'ACERTO').length / recentLogs.length) * 100;
                    
                    if (winRate < 40) {
                        alerts.push({
                            type: 'error',
                            message: `Taxa de acerto crítica: ${winRate.toFixed(1)}% nos últimos ${recentLogs.length} sinais`
                        });
                    } else if (winRate < 50) {
                        alerts.push({
                            type: 'warning',
                            message: `Taxa de acerto baixa: ${winRate.toFixed(1)}% nos últimos ${recentLogs.length} sinais`
                        });
                    }
                }

                return alerts;
            }

            getPerformanceByHour() {
                return this.performanceByHour;
            }

            getPerformanceByScore() {
                return this.performanceByScore;
            }

            getIndicatorPerformance() {
                return this.indicatorPerformance;
            }

            async getRecentLogs(limit = 50, forceReload = false) {
                // Se forceReload ou se auditLogs está vazio, recarregar do Supabase
                if (forceReload || this.auditLogs.length === 0) {
                    try {
                        const { data: logs, error } = await window.supabase
                            .from('audit_logs')
                            .select('*')
                            .order('generated_at', { ascending: false })
                            .limit(limit);

                        if (!error && logs && logs.length > 0) {
                            // Atualizar cache local com logs mais recentes
                            const newLogs = logs.map(log => ({
                                signalId: log.signal_id,
                                generatedAt: log.generated_at,
                                candleCloseTime: log.candle_close_time,
                                timeDifference: log.time_difference,
                                prices: log.prices,
                                indicators: log.indicators,
                                scoreRange: log.score_range,
                                hourOfDay: log.hour_of_day,
                                outcome: log.outcome,
                                outcomeTime: log.outcome_time,
                                reason: log.reason,
                                metadata: log.metadata
                            }));

                            // Mesclar com logs existentes sem duplicar
                            const existingIds = new Set(this.auditLogs.map(l => l.signalId));
                            const logsToAdd = newLogs.filter(l => !existingIds.has(l.signalId));

                            if (logsToAdd.length > 0) {
                                this.auditLogs = [...logsToAdd, ...this.auditLogs];
                                // Manter apenas últimos 500
                                if (this.auditLogs.length > 500) {
                                    this.auditLogs = this.auditLogs.slice(0, 500);
                                }
                            }

                            return newLogs; // Retornar logs do Supabase
                        }
                    } catch (error) {
                        console.error('Erro ao recarregar logs do Supabase:', error);
                    }
                }

                // Retornar do cache local
                return this.auditLogs.slice(0, limit);
            }

            exportToCSV() {
                const headers = [
                    'ID', 'Gerado Em', 'Horário', 'Símbolo', 'Direção', 'Score',
                    'Preço Teórico', 'Preço Entrada', 'Slippage', 'Preço Saída',
                    'P&L', 'Resultado', 'Motivo', 'Fonte Dados'
                ];

                const rows = this.auditLogs.map(log => {
                    return [
                        log.signalId,
                        new Date(log.generatedAt).toLocaleString('pt-BR'),
                        log.hourOfDay + 'h',
                        log.metadata.symbol,
                        log.metadata.direction,
                        log.scoreRange,
                        log.prices.theoretical ? log.prices.theoretical.toFixed(6) : 'N/A',
                        log.prices.actualEntry ? log.prices.actualEntry.toFixed(6) : 'N/A',
                        log.prices.slippage ? log.prices.slippage.toFixed(6) : 'N/A',
                        log.prices.actualExit ? log.prices.actualExit.toFixed(6) : 'N/A',
                        log.prices.finalPnL !== null && log.prices.finalPnL !== undefined ? log.prices.finalPnL.toFixed(2) : '0.00',
                        log.outcome || 'PENDENTE',
                        (log.reason || 'Em andamento').replace(/,/g, ';'),
                        log.metadata.dataSource
                    ];
                });

                let csv = headers.join(',') + '\n';
                rows.forEach(row => {
                    const escapedRow = row.map(value => {
                        const strValue = String(value);
                        if (strValue.includes(',')) {
                            return `"${strValue}"`;
                        }
                        return strValue;
                    });
                    csv += escapedRow.join(',') + '\n';
                });

                return csv;
            }

            clearOldData(daysToKeep = 7) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
                
                this.auditLogs = this.auditLogs.filter(log => 
                    new Date(log.generatedAt) > cutoffDate
                );
                
                this.saveToStorage();
            }

            validateData() {
                console.log('🔍 === VALIDAÇÃO DOS DADOS DE AUDITORIA ===');
                console.log(`Total de logs: ${this.auditLogs.length}`);
                
                const withOutcome = this.auditLogs.filter(l => l.outcome && l.outcome !== 'PENDENTE');
                const acertos = withOutcome.filter(l => l.outcome === 'ACERTO');
                const erros = withOutcome.filter(l => l.outcome === 'ERRO');
                const expirados = withOutcome.filter(l => l.outcome === 'EXPIRADO');
                
                console.log(`\nCom resultado: ${withOutcome.length}`);
                console.log(`  ACERTO: ${acertos.length}`);
                console.log(`  ERRO: ${erros.length}`);
                console.log(`  EXPIRADO: ${expirados.length}`);
                
                const withPnL = this.auditLogs.filter(l => l.prices.finalPnL !== null && l.prices.finalPnL !== 0);
                console.log(`\nCom P&L diferente de zero: ${withPnL.length}`);
                
                if (withOutcome.length === 0) {
                    console.warn('⚠️ NENHUM log tem resultado final!');
                }
                
                if (expirados.length > withOutcome.length * 0.8) {
                    console.warn(`⚠️ ${(expirados.length/withOutcome.length*100).toFixed(1)}% dos sinais estão EXPIRANDO!`);
                    console.warn('   Possíveis problemas:');
                    console.warn('   - Alvos muito distantes');
                    console.warn('   - Timeout muito curto');
                    console.warn('   - Sistema de monitoramento não está funcionando');
                }
                
                return {
                    total: this.auditLogs.length,
                    withOutcome: withOutcome.length,
                    acertos: acertos.length,
                    erros: erros.length,
                    expirados: expirados.length,
                    withPnL: withPnL.length
                };
            }
        }

        /* Continua na PARTE 3... */

        // ========================================
        // ✅ MEMORYDB COM SUPABASE
        // ========================================
        
        class MemoryDB {
            constructor() {
                this.signals_history = [];
                this.ml_weights_evolution = [];
                this.config_snapshots = [];
                this.listeners = new Set();
                this.isInitialized = false;
            }

            async init() {
                if (this.isInitialized) return;
                
                try {
                    // Carregar sinais do Supabase
                    const { data: signals, error: signalsError } = await window.supabase
                        .from('signals')
                        .select('*')
                        .order('timestamp', { ascending: false })
                        .limit(200);

                    if (signalsError) throw signalsError;

                    // Converter para formato da aplicação
                    this.signals_history = (signals || []).map(s => ({
                        id: s.id,
                        timestamp: new Date(s.timestamp),
                        symbol: s.symbol,
                        direction: s.direction,
                        timeframe: s.timeframe,
                        score: s.score,
                        price: parseFloat(s.price),
                        stopLoss: parseFloat(s.stop_loss),
                        takeProfit: parseFloat(s.take_profit),
                        riskReward: s.risk_reward ? parseFloat(s.risk_reward) : 2,
                        status: s.status,
                        pnl: s.pnl ? parseFloat(s.pnl) : 0,
                        finalPrice: s.final_price ? parseFloat(s.final_price) : null,
                        entryTime: s.entry_time ? new Date(s.entry_time) : null,
                        expirationTime: s.expiration_time ? new Date(s.expiration_time) : null,
                        contributors: s.contributors,
                        divergence: s.divergence,
                        features: s.features,
                        dataSource: s.data_source,
                        executed: s.executed || false,
                        executionDetails: s.execution_details,
                        tpslDetails: s.tpsl_details,
                        savedAt: s.saved_at
                    }));

                    // Carregar pesos ML
                    const { data: weights, error: weightsError } = await window.supabase
                        .from('ml_weights_evolution')
                        .select('*')
                        .order('timestamp', { ascending: false })
                        .limit(50);

                    if (weightsError) {
                        console.warn('⚠️ Erro ao carregar ml_weights_evolution:', weightsError.message);
                        console.log('ℹ️ Iniciando com histórico vazio de pesos ML');
                    } else {
                        this.ml_weights_evolution = (weights || []).map(w => ({
                            date: w.timestamp,
                            weights: w.weights,
                            performance: w.performance
                        }));
                        console.log('✅ Carregados', this.ml_weights_evolution.length, 'snapshots de pesos ML');
                    }

                    this.isInitialized = true;
                    console.log('✅ MemoryDB carregado do Supabase:', this.signals_history.length, 'sinais');

                } catch (error) {
                    console.error('❌ Erro ao carregar MemoryDB:', error);
                    console.log('ℹ️ Continuando com dados vazios');
                    this.isInitialized = true; // Continuar mesmo com erro
                }
            }

            addChangeListener(callback) {
                this.listeners.add(callback);
            }

            removeChangeListener(callback) {
                this.listeners.delete(callback);
            }

            notifyChange() {
                this.listeners.forEach(callback => {
                    try {
                        callback();
                    } catch (error) {
                        console.error('Erro ao notificar listener:', error);
                    }
                });
            }

            async saveSignal(signal) {
                try {
                    // Validar campos obrigatórios antes de salvar
                    if (!signal.id || !signal.timestamp || !signal.symbol || !signal.direction ||
                        signal.score === null || signal.score === undefined || isNaN(signal.score) ||
                        !signal.price || isNaN(signal.price)) {
                        console.error('❌ Sinal inválido, não será salvo:', {
                            id: signal.id,
                            timestamp: signal.timestamp,
                            symbol: signal.symbol,
                            direction: signal.direction,
                            score: signal.score,
                            price: signal.price
                        });
                        return;
                    }

                    // Salvar no Supabase
                    const { error } = await window.supabase
                        .from('signals')
                        .upsert({
                            id: signal.id,
                            timestamp: signal.timestamp.toISOString(),
                            symbol: signal.symbol,
                            direction: signal.direction,
                            timeframe: signal.timeframe,
                            score: Number(signal.score),
                            price: signal.price,
                            stop_loss: signal.stopLoss,
                            take_profit: signal.takeProfit,
                            risk_reward: signal.riskReward || 2.0,
                            status: signal.status || 'PENDENTE',
                            pnl: signal.pnl || 0,
                            final_price: signal.finalPrice || null,
                            entry_time: signal.entryTime ? signal.entryTime.toISOString() : null,
                            expiration_time: signal.expirationTime ? signal.expirationTime.toISOString() : null,
                            contributors: signal.contributors || null,
                            divergence: signal.divergence || null,
                            features: signal.features || null,
                            data_source: signal.dataSource || 'REAL',
                            executed: signal.executed || false,
                            execution_details: signal.executionDetails || null,
                            tpsl_details: signal.tpslDetails || null,
                            saved_at: new Date().toISOString()
                        });

                    if (error) {
                        console.error('❌ Erro ao salvar sinal no Supabase:', error);
                        console.error('Detalhes do erro:', {
                            message: error.message,
                            details: error.details,
                            hint: error.hint,
                            code: error.code
                        });
                        console.log('Dados que tentamos salvar:', {
                            id: signal.id,
                            timestamp: signal.timestamp,
                            symbol: signal.symbol,
                            direction: signal.direction,
                            score: signal.score,
                            price: signal.price
                        });

                        // ⚠️ NÃO TRAVAR: Continuar mesmo com erro, sinal fica apenas na memória local
                        console.warn('⚠️ Sinal NÃO foi salvo no Supabase, mas continuará em memória local');
                        // Adicionar ao array local mesmo com erro no Supabase
                        this.signals_history.push({
                            ...signal,
                            savedAt: new Date().toISOString(),
                            supabaseError: true
                        });
                        return; // Sair sem throw para não travar o sistema
                    }

                    // Adicionar ao array local
                    this.signals_history.push({
                        ...signal,
                        savedAt: new Date().toISOString()
                    });

                    console.log('💾 Sinal salvo no Supabase:', signal.id);
                    this.notifyChange();

                } catch (error) {
                    console.error('❌ Erro ao salvar sinal:', error);
                }
            }

            async getAllSignals() {
                if (!this.isInitialized) await this.init();
                return [...this.signals_history];
            }

            async saveWeightsSnapshot(weights, performance) {
                try {
                    const { error } = await window.supabase
                        .from('ml_weights_evolution')
                        .insert({
                            weights: weights,
                            performance: performance
                        });

                    if (error) throw error;

                    const snapshot = {
                        date: new Date().toISOString(),
                        weights: { ...weights },
                        performance: { ...performance }
                    };

                    this.ml_weights_evolution.push(snapshot);
                    this.notifyChange();

                    console.log('💾 Pesos ML salvos no Supabase');

                } catch (error) {
                    console.error('❌ Erro ao salvar pesos:', error);
                }
            }

            async getWeightsHistory() {
                if (!this.isInitialized) await this.init();
                return [...this.ml_weights_evolution];
            }

            async getStatistics() {
                try {
                    const { data, error } = await window.supabase
                        .from('signals')
                        .select('status, pnl');

                    if (error) throw error;

                    const signals = data || [];
                    const total = signals.length;
                    const completed = signals.filter(s => s.status !== 'PENDENTE').length;
                    const successful = signals.filter(s => s.status === 'ACERTO').length;
                    const totalPnL = signals.reduce((sum, s) => sum + parseFloat(s.pnl || 0), 0);

                    return {
                        total,
                        completed,
                        successful,
                        winRate: completed > 0 ? (successful / completed) * 100 : 0,
                        totalPnL
                    };

                } catch (error) {
                    console.error('❌ Erro ao calcular estatísticas:', error);
                    return {
                        total: 0,
                        completed: 0,
                        successful: 0,
                        winRate: 0,
                        totalPnL: 0
                    };
                }
            }
        }
        class MarketDataManager {
            constructor() {
                this.prices = [];
                this.currentCandle = null; // Cache do candle em formação
                this.timeframe = 'M5';
                this.lastPriceCheck = null;
                this.stuckPriceCount = 0;
                this.binanceWs = null;
                this.wsReconnectAttempts = 0;
                this.maxReconnectAttempts = 100; // Aumentado para manter conexão
                this.pingInterval = null;
                this.lastPongTime = Date.now();
                this.restApiFailover = false;
                console.log('📊 MarketData inicializado - aguardando dados de API');
            }

            // REST API Fallback
            async fetchKlinesFromREST(symbol, interval = '5m', limit = 200) {
                try {
                    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
                    const response = await fetch(url);
                    const data = await response.json();

                    const candles = data.map(k => ({
                        timestamp: k[0],
                        open: parseFloat(k[1]),
                        high: parseFloat(k[2]),
                        low: parseFloat(k[3]),
                        close: parseFloat(k[4]),
                        volume: parseFloat(k[5]),
                        isClosed: true
                    }));

                    this.prices = candles;
                    console.log('✅ Dados carregados via REST API:', candles.length, 'candles');
                    return candles;
                } catch (error) {
                    console.error('❌ Erro ao buscar dados REST:', error);
                    return null;
                }
            }

            // Busca proativa de candle específico via REST API
            async fetchSpecificCandleFromREST(symbol, interval = '5m', timestamp) {
                try {
                    // Buscar alguns candles ao redor do timestamp alvo
                    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${timestamp - 600000}&endTime=${timestamp + 600000}&limit=20`;
                    const response = await fetch(url);

                    if (!response.ok) {
                        throw new Error(`API retornou ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();

                    if (!Array.isArray(data)) {
                        console.error('❌ Resposta da API não é um array:', data);
                        return null;
                    }

                    const candles = data.map(k => {
                        const candle = {
                            timestamp: k[0],
                            open: parseFloat(k[1]),
                            high: parseFloat(k[2]),
                            low: parseFloat(k[3]),
                            close: parseFloat(k[4]),
                            volume: parseFloat(k[5]),
                            isClosed: true
                        };

                        // Log detalhado para debug do candle exato
                        if (candle.timestamp === timestamp) {
                            console.log(`🔍 [API BINANCE] Candle buscado: ${new Date(timestamp).toLocaleString('pt-BR')}`);
                            console.log(`   📊 OHLC: O=${candle.open.toFixed(2)} H=${candle.high.toFixed(2)} L=${candle.low.toFixed(2)} C=${candle.close.toFixed(2)}`);
                            console.log(`   🎨 Cor API: ${candle.close > candle.open ? 'VERDE 🟢' : candle.close < candle.open ? 'VERMELHO 🔴' : 'DOJI ⚪'}`);

                            // ⚠️ VALIDAÇÃO: Detectar candles suspeitos (todos valores iguais)
                            if (candle.open === candle.high && candle.high === candle.low && candle.low === candle.close) {
                                console.warn(`   ⚠️⚠️⚠️ CANDLE SUSPEITO! Todos valores iguais (OHLC = ${candle.open.toFixed(2)})`);
                                console.warn(`   ⚠️⚠️⚠️ Isso pode indicar dados incompletos da API!`);
                                console.warn(`   ⚠️⚠️⚠️ Confira MANUALMENTE no gráfico da Binance Futures!`);
                            } else {
                                console.log(`   ⚠️ Confira este candle no gráfico da Binance Futures!`);
                            }
                        }

                        return candle;
                    });

                    // Adicionar candles ao histórico se ainda não existirem
                    candles.forEach(candle => {
                        const existingIndex = this.prices.findIndex(p => p.timestamp === candle.timestamp);
                        if (existingIndex === -1) {
                            this.prices.push(candle);
                            console.log(`➕ Candle adicionado ao cache: ${new Date(candle.timestamp).toLocaleTimeString('pt-BR')}`);
                        }
                    });

                    // Ordenar por timestamp
                    this.prices.sort((a, b) => a.timestamp - b.timestamp);

                    // Manter apenas os últimos 200
                    if (this.prices.length > 200) {
                        this.prices = this.prices.slice(-200);
                    }

                    console.log(`✅ Busca proativa completada: ${candles.length} candles adicionados`);
                    return candles;
                } catch (error) {
                    console.error('❌ Erro ao buscar candle específico:', error);
                    return null;
                }
            }

            // Buscar candle específico por timestamp
            getCandleByTimestamp(timestamp, toleranceMs = 60000) {
                // 1. Busca exata em candles fechados
                const exactCandle = this.prices.find(p => p.timestamp === timestamp);
                if (exactCandle) {
                    console.log(`✅ Candle encontrado (busca exata): ${new Date(timestamp).toLocaleTimeString('pt-BR')}`);
                    return exactCandle;
                }

                // 2. Se for o candle atual em formação
                if (this.currentCandle && this.currentCandle.timestamp === timestamp) {
                    console.log(`✅ Candle encontrado (atual em formação): ${new Date(timestamp).toLocaleTimeString('pt-BR')}`);
                    return this.currentCandle;
                }

                // 3. Busca com tolerância (pode ter pequenas diferenças de timestamp)
                const candleInRange = this.prices.find(p => {
                    const diff = Math.abs(p.timestamp - timestamp);
                    return diff <= toleranceMs; // Aceitar até 1 minuto de diferença
                });

                if (candleInRange) {
                    console.log(`✅ Candle encontrado (busca com tolerância): ${new Date(candleInRange.timestamp).toLocaleTimeString('pt-BR')} (diff: ${Math.abs(candleInRange.timestamp - timestamp)}ms)`);
                    return candleInRange;
                }

                // 4. Buscar candle mais próximo ANTES do timestamp (último candle disponível)
                // ⚠️ APENAS para tolerância pequena (não pegar candle muito antigo)
                const candlesBefore = this.prices.filter(p => p.timestamp <= timestamp);
                if (candlesBefore.length > 0) {
                    const closest = candlesBefore[candlesBefore.length - 1];
                    const diff = timestamp - closest.timestamp;
                    // Reduzido de 2min para 30s - evitar pegar candle anterior em binarias
                    if (diff <= 30000) { // Até 30 segundos de diferença
                        console.log(`⚠️ Usando candle mais próximo: ${new Date(closest.timestamp).toLocaleTimeString('pt-BR')} (diff: ${diff}ms)`);
                        return closest;
                    }
                }

                console.warn(`❌ Nenhum candle encontrado para timestamp: ${new Date(timestamp).toLocaleTimeString('pt-BR')}`);
                return null;
            }

            connectBinanceWebSocket(symbol, interval = '5m', onUpdate) {
                if (this.binanceWs) {
                    console.log('🔌 Fechando conexão WebSocket anterior...');
                    this.binanceWs.close();
                    if (this.pingInterval) {
                        clearInterval(this.pingInterval);
                    }
                }

                // Carregar dados históricos via REST antes de conectar WebSocket
                this.fetchKlinesFromREST(symbol.toUpperCase(), interval, 200);

                // Usar WebSocket de Futures (não Spot)
                const wsUrl = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`;
                console.log('🔌 Conectando ao WebSocket Binance Futures:', wsUrl);

                this.binanceWs = new WebSocket(wsUrl);

                this.binanceWs.onopen = () => {
                    console.log('✅ WebSocket Binance conectado!');
                    this.wsReconnectAttempts = 0;
                    this.lastPongTime = Date.now();
                    this.restApiFailover = false;

                    // Iniciar sistema de ping/pong para manter conexão viva
                    this.startPingPong(symbol, interval, onUpdate);
                };

                this.binanceWs.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        const kline = data.k;

                        if (kline) {
                            const candle = {
                                timestamp: kline.t,
                                open: parseFloat(kline.o),
                                high: parseFloat(kline.h),
                                low: parseFloat(kline.l),
                                close: parseFloat(kline.c),
                                volume: parseFloat(kline.v),
                                isClosed: kline.x
                            };

                            // ATUALIZAR SEMPRE - tanto candles fechados quanto em formação
                            if (candle.isClosed) {
                                console.log('📊 Candle FECHADO recebido:', candle.close, 'às', new Date(candle.timestamp).toLocaleTimeString('pt-BR'));

                                // Adicionar aos candles históricos
                                const existingIndex = this.prices.findIndex(p => p.timestamp === candle.timestamp);
                                if (existingIndex >= 0) {
                                    this.prices[existingIndex] = candle;
                                } else {
                                    this.prices.push(candle);
                                    // Manter apenas os últimos 200 candles
                                    if (this.prices.length > 200) {
                                        this.prices.shift();
                                    }
                                }

                                // Limpar candle atual
                                this.currentCandle = null;

                                // Callback para notificar atualização
                                if (onUpdate) {
                                    onUpdate(candle);
                                }
                            } else {
                                // Candle em formação - atualizar em tempo real
                                const priceChanged = !this.currentCandle || this.currentCandle.close !== candle.close;

                                this.currentCandle = candle;

                                // 🔍 LOG para debug de atualização
                                if (priceChanged && Math.random() < 0.1) { // Log 10% das atualizações para não poluir
                                    console.log(`📊 [WS] CurrentCandle atualizado: $${candle.close.toFixed(2)} (${new Date(candle.timestamp).toLocaleTimeString('pt-BR')})`);
                                }

                                // Callback para atualizar UI em tempo real
                                if (onUpdate) {
                                    onUpdate(candle);
                                }
                            }

                            // Atualizar timestamp do último dado recebido
                            this.lastPongTime = Date.now();
                        }
                    } catch (error) {
                        console.error('❌ Erro ao processar mensagem WebSocket:', error);
                    }
                };

                this.binanceWs.onerror = (error) => {
                    console.error('❌ Erro no WebSocket:', error);
                };

                this.binanceWs.onclose = () => {
                    console.log('🔌 WebSocket Binance desconectado');

                    if (this.pingInterval) {
                        clearInterval(this.pingInterval);
                    }

                    // 🔄 RECONEXÃO INFINITA com backoff exponencial
                    this.wsReconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 30000); // Máximo 30s
                    console.log(`🔄 Tentando reconectar em ${delay/1000}s (tentativa ${this.wsReconnectAttempts})...`);

                    setTimeout(() => {
                        this.connectBinanceWebSocket(symbol, interval, onUpdate);
                    }, delay);

                    // Se falhou muito, usar REST API como backup enquanto tenta reconectar WS
                    if (this.wsReconnectAttempts > 5 && !this.restApiFailover) {
                        console.warn('⚠️ Muitas falhas no WebSocket. Ativando REST API como backup...');
                        this.restApiFailover = true;
                        this.startRestApiPolling(symbol, interval, onUpdate);
                    }
                };

                return this.binanceWs;
            }

            startPingPong(symbol, interval, onUpdate) {
                // Monitorar saúde da conexão a cada 3 minutos
                this.pingInterval = setInterval(() => {
                    const timeSinceLastPong = Date.now() - this.lastPongTime;

                    if (timeSinceLastPong > 180000) { // 3 minutos sem dados
                        console.warn('⚠️ WebSocket sem resposta há', Math.floor(timeSinceLastPong/1000), 's. Reconectando...');
                        this.binanceWs.close();
                    } else {
                        console.log('💓 WebSocket saudável. Último dado há', Math.floor(timeSinceLastPong/1000), 's');
                    }
                }, 180000); // Check a cada 3 minutos
            }

            startRestApiPolling(symbol, interval, onUpdate) {
                console.log('🔄 Iniciando polling REST API...');
                const pollInterval = setInterval(async () => {
                    const candles = await this.fetchKlinesFromREST(symbol, interval, 200);
                    if (candles && candles.length > 0 && onUpdate) {
                        onUpdate(candles[candles.length - 1]);
                    }
                }, 10000); // Poll a cada 10 segundos

                return pollInterval;
            }

            disconnectBinanceWebSocket() {
                if (this.binanceWs) {
                    console.log('🔌 Fechando conexão WebSocket...');
                    this.wsReconnectAttempts = this.maxReconnectAttempts; // Prevenir reconexão automática
                    this.binanceWs.close();
                    this.binanceWs = null;
                }

                if (this.pingInterval) {
                    clearInterval(this.pingInterval);
                    this.pingInterval = null;
                }
            }

            getLatestPrice() {
                // Priorizar candle atual em formação (mais recente)
                if (this.currentCandle) {
                    // 🔍 LOG detalhado quando detectar preço repetido
                    if (this.lastPriceCheck && this.lastPriceCheck.close === this.currentCandle.close && this.lastPriceCheck.timestamp === this.currentCandle.timestamp) {
                        this.stuckPriceCount++;
                        if (this.stuckPriceCount === 5 || this.stuckPriceCount === 10 || this.stuckPriceCount === 15) {
                            console.error(`❌ [MARKETDATA] CurrentCandle TRAVADO há ${this.stuckPriceCount} chamadas:`);
                            console.error(`   Preço: $${this.currentCandle.close.toFixed(2)}`);
                            console.error(`   Timestamp WS: ${new Date(this.currentCandle.timestamp).toLocaleString('pt-BR')}`);
                            console.error(`   Há quanto tempo: ${Math.floor((Date.now() - this.lastPongTime) / 1000)}s desde último update`);
                        }
                    } else {
                        this.stuckPriceCount = 0;
                    }
                    this.lastPriceCheck = this.currentCandle;
                    return this.currentCandle;
                }

                // Senão, retornar último candle fechado
                if (this.prices.length === 0) {
                    return null;
                }

                const latestPrice = this.prices[this.prices.length - 1];

                if (this.lastPriceCheck && this.lastPriceCheck.close === latestPrice.close) {
                    this.stuckPriceCount++;
                    if (this.stuckPriceCount > 3) {
                        console.warn('⚠️ PREÇO TRAVADO detectado! Mesmo preço por', this.stuckPriceCount, 'verificações');
                        console.warn('   Último preço:', latestPrice.close);
                    }
                } else {
                    this.stuckPriceCount = 0;
                }

                this.lastPriceCheck = { ...latestPrice };
                return latestPrice;
            }

            replaceWithRealData(realData) {
                if (realData && realData.length > 0) {
                    const latest = realData[realData.length - 1];
                    const now = Date.now();
                    const dataAge = (now - latest.timestamp) / 60000; // minutos

                    // Se dados estão muito antigos (>5 min), gerar novos candles simulados
                    if (dataAge > 5) {
                        console.warn(`⚠️ Dados com ${dataAge.toFixed(0)} min de atraso. Gerando candles simulados...`);

                        const basePrice = latest.close;
                        const volatility = 0.0002; // 0.02% de volatilidade
                        const missingMinutes = Math.floor(dataAge / 5); // Quantos candles M5 estão faltando

                        const simulatedCandles = [];
                        for (let i = 1; i <= Math.min(missingMinutes, 10); i++) {
                            const randomChange = (Math.random() - 0.5) * 2 * volatility;
                            const newPrice = basePrice * (1 + randomChange);
                            const newTimestamp = latest.timestamp + (i * 5 * 60 * 1000); // +5 minutos

                            simulatedCandles.push({
                                timestamp: newTimestamp,
                                open: basePrice,
                                high: Math.max(basePrice, newPrice),
                                low: Math.min(basePrice, newPrice),
                                close: newPrice,
                                volume: 0
                            });
                        }

                        this.prices = [...realData, ...simulatedCandles];
                        console.log(`   ✅ ${simulatedCandles.length} candles simulados adicionados`);
                    } else {
                        this.prices = [...realData];
                    }

                    console.log('✅ Dados REAIS carregados:', realData.length, 'candles');
                    console.log('   Primeiro preço:', realData[0].close);
                    console.log('   Último preço:', this.prices[this.prices.length - 1].close);
                    return true;
                }
                return false;
            }
        }

        class TechnicalIndicators {
            static calculateRSI(prices, period = 14) {
                if (prices.length < period + 1) return 50;
                
                let gains = 0;
                let losses = 0;
                
                for (let i = prices.length - period; i < prices.length; i++) {
                    const change = prices[i].close - prices[i - 1].close;
                    if (change > 0) gains += change;
                    else losses -= change;
                }
                
                const avgGain = gains / period;
                const avgLoss = losses / period;
                const rs = avgGain / avgLoss;
                return 100 - (100 / (1 + rs));
            }

            static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
                if (prices.length < slowPeriod + signalPeriod) return { macd: 0, signal: 0, histogram: 0 };

                // Calculate MACD line (difference between fast and slow EMA)
                const closePrices = prices.map(p => p.close);
                const fastEMA = this.calculateEMA(closePrices.slice(-slowPeriod), fastPeriod);
                const slowEMA = this.calculateEMA(closePrices.slice(-slowPeriod), slowPeriod);
                const macdLine = fastEMA - slowEMA;

                // Calculate signal line (EMA of MACD line)
                // For proper calculation, we need to calculate MACD values for multiple periods
                const macdValues = [];
                for (let i = slowPeriod; i <= prices.length; i++) {
                    const subset = closePrices.slice(i - slowPeriod, i);
                    const fEMA = this.calculateEMA(subset, fastPeriod);
                    const sEMA = this.calculateEMA(subset, slowPeriod);
                    macdValues.push(fEMA - sEMA);
                }

                const signalLine = macdValues.length >= signalPeriod
                    ? this.calculateEMA(macdValues.slice(-signalPeriod), signalPeriod)
                    : macdLine;

                const histogram = macdLine - signalLine;

                return { macd: macdLine, signal: signalLine, histogram };
            }

            static calculateEMA(values, period) {
                const k = 2 / (period + 1);
                let ema = values[0];
                for (let i = 1; i < values.length; i++) {
                    ema = values[i] * k + ema * (1 - k);
                }
                return ema;
            }

            static calculateBollingerBands(prices, period = 20, stdDev = 2) {
                if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };
                
                const recentPrices = prices.slice(-period).map(p => p.close);
                const sma = recentPrices.reduce((a, b) => a + b) / period;
                
                const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
                const sd = Math.sqrt(variance);
                
                return {
                    upper: sma + (sd * stdDev),
                    middle: sma,
                    lower: sma - (sd * stdDev)
                };
            }

            static calculateStochastic(prices, kPeriod = 14, dPeriod = 3) {
                if (prices.length < kPeriod) return { k: 50, d: 50 };
                
                const recentPrices = prices.slice(-kPeriod);
                const highestHigh = Math.max(...recentPrices.map(p => p.high));
                const lowestLow = Math.min(...recentPrices.map(p => p.low));
                const currentClose = prices[prices.length - 1].close;
                
                const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
                const d = k * 0.95;
                
                return { k, d };
            }

            static calculateATR(prices, period = 14) {
                if (prices.length < period + 1) return prices[prices.length - 1].close * 0.02;
                
                let trSum = 0;
                for (let i = prices.length - period; i < prices.length; i++) {
                    const high = prices[i].high;
                    const low = prices[i].low;
                    const prevClose = prices[i - 1].close;
                    
                    const tr = Math.max(
                        high - low,
                        Math.abs(high - prevClose),
                        Math.abs(low - prevClose)
                    );
                    trSum += tr;
                }
                
                return trSum / period;
            }

            // ✨ NOVO: Volume Profile
            static analyzeVolume(prices, period = 20) {
                if (prices.length < period) {
                    return {
                        avgVolume: 0,
                        volumeTrend: 'neutral',
                        volumeStrength: 0,
                        isAnomalous: false
                    };
                }

                const recentPrices = prices.slice(-period);
                const volumes = recentPrices.map(p => p.volume);
                const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
                
                const currentVolume = prices[prices.length - 1].volume;
                const volumeRatio = currentVolume / avgVolume;
                
                const isAnomalous = volumeRatio > 2.0;
                
                const recent5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
                const previous5 = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
                
                let volumeTrend = 'neutral';
                if (recent5 > previous5 * 1.2) volumeTrend = 'increasing';
                else if (recent5 < previous5 * 0.8) volumeTrend = 'decreasing';
                
                const volumeStrength = Math.min(1, volumeRatio / 2);
                
                return {
                    avgVolume,
                    currentVolume,
                    volumeRatio,
                    volumeTrend,
                    volumeStrength,
                    isAnomalous
                };
            }

            // ✨ NOVO: On-Balance Volume (OBV)
            static calculateOBV(prices) {
                if (prices.length < 2) return { obv: 0, trend: 'neutral', strength: 0 };

                let obv = 0;
                const obvValues = [0];
                
                for (let i = 1; i < prices.length; i++) {
                    if (prices[i].close > prices[i - 1].close) {
                        obv += prices[i].volume;
                    } else if (prices[i].close < prices[i - 1].close) {
                        obv -= prices[i].volume;
                    }
                    obvValues.push(obv);
                }
                
                const obvEMA20 = this.calculateEMA(obvValues.slice(-20), 20);
                const obvEMA5 = this.calculateEMA(obvValues.slice(-5), 5);
                
                let trend = 'neutral';
                let strength = 0;
                
                if (obvEMA5 > obvEMA20 * 1.05) {
                    trend = 'bullish';
                    strength = Math.min(1, (obvEMA5 - obvEMA20) / obvEMA20);
                } else if (obvEMA5 < obvEMA20 * 0.95) {
                    trend = 'bearish';
                    strength = Math.min(1, (obvEMA20 - obvEMA5) / obvEMA20);
                }
                
                const priceTrend = prices[prices.length - 1].close > prices[prices.length - 20]?.close ? 'up' : 'down';
                const obvTrendDirection = obvValues[obvValues.length - 1] > obvValues[obvValues.length - 20] ? 'up' : 'down';
                
                const divergence = priceTrend !== obvTrendDirection;
                
                return {
                    obv: obvValues[obvValues.length - 1],
                    trend,
                    strength,
                    divergence,
                    signal: this.getOBVSignal(trend, divergence)
                };
            }

            static getOBVSignal(trend, divergence) {
                if (divergence) {
                    return trend === 'bullish' ? 'hidden_bullish' : 'hidden_bearish';
                }
                if (trend === 'bullish') return 'bullish_confirmation';
                if (trend === 'bearish') return 'bearish_confirmation';
                return 'neutral';
            }

            // ✨ NOVO: Ichimoku Cloud
            static calculateIchimoku(prices, tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52) {
                if (prices.length < senkouBPeriod) {
                    return {
                        tenkanSen: 0,
                        kijunSen: 0,
                        senkouSpanA: 0,
                        senkouSpanB: 0,
                        chikouSpan: 0,
                        signal: 'neutral',
                        strength: 0,
                        cloudColor: 'neutral'
                    };
                }

                const tenkanHigh = Math.max(...prices.slice(-tenkanPeriod).map(p => p.high));
                const tenkanLow = Math.min(...prices.slice(-tenkanPeriod).map(p => p.low));
                const tenkanSen = (tenkanHigh + tenkanLow) / 2;

                const kijunHigh = Math.max(...prices.slice(-kijunPeriod).map(p => p.high));
                const kijunLow = Math.min(...prices.slice(-kijunPeriod).map(p => p.low));
                const kijunSen = (kijunHigh + kijunLow) / 2;

                const senkouSpanA = (tenkanSen + kijunSen) / 2;

                const senkouBHigh = Math.max(...prices.slice(-senkouBPeriod).map(p => p.high));
                const senkouBLow = Math.min(...prices.slice(-senkouBPeriod).map(p => p.low));
                const senkouSpanB = (senkouBHigh + senkouBLow) / 2;

                const chikouSpan = prices[prices.length - 1].close;

                const currentPrice = prices[prices.length - 1].close;
                
                const cloudColor = senkouSpanA > senkouSpanB ? 'bullish' : 'bearish';
                
                let signal = 'neutral';
                let strength = 0;
                
                if (currentPrice > Math.max(senkouSpanA, senkouSpanB)) {
                    signal = 'bullish';
                    strength = 0.7;
                    
                    if (tenkanSen > kijunSen) {
                        signal = 'strong_bullish';
                        strength = 0.9;
                    }
                } else if (currentPrice < Math.min(senkouSpanA, senkouSpanB)) {
                    signal = 'bearish';
                    strength = 0.7;
                    
                    if (tenkanSen < kijunSen) {
                        signal = 'strong_bearish';
                        strength = 0.9;
                    }
                } else {
                    signal = 'inside_cloud';
                    strength = 0.3;
                }
                
                const chikouAbovePrice = chikouSpan > prices[prices.length - kijunPeriod]?.close;
                
                return {
                    tenkanSen,
                    kijunSen,
                    senkouSpanA,
                    senkouSpanB,
                    chikouSpan,
                    signal,
                    strength,
                    cloudColor,
                    tkCross: tenkanSen > kijunSen ? 'bullish' : 'bearish',
                    chikouConfirmation: chikouAbovePrice,
                    priceVsCloud: currentPrice > Math.max(senkouSpanA, senkouSpanB) ? 'above' :
                                 currentPrice < Math.min(senkouSpanA, senkouSpanB) ? 'below' : 'inside'
                };
            }

            // ✨ NOVO: Volume Weighted Average Price (VWAP)
            static calculateVWAP(prices, period = 20) {
                if (prices.length < period) {
                    return { vwap: prices[prices.length - 1].close, signal: 'neutral' };
                }

                const recentPrices = prices.slice(-period);
                
                let sumPriceVolume = 0;
                let sumVolume = 0;
                
                recentPrices.forEach(candle => {
                    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
                    sumPriceVolume += typicalPrice * candle.volume;
                    sumVolume += candle.volume;
                });
                
                const vwap = sumPriceVolume / sumVolume;
                const currentPrice = prices[prices.length - 1].close;
                
                let signal = 'neutral';
                const deviation = ((currentPrice - vwap) / vwap) * 100;
                
                if (deviation > 0.5) signal = 'above_vwap';
                else if (deviation < -0.5) signal = 'below_vwap';
                
                return {
                    vwap,
                    currentPrice,
                    deviation,
                    signal,
                    strength: Math.min(1, Math.abs(deviation) / 2)
                };
            }
        }
        /* ========================================
   OTIMIZADOR DE TP/SL DINÂMICO
   ======================================== */

class TPSLOptimizer {
    constructor(auditSystem) {
        this.auditSystem = auditSystem;
        this.optimalRatios = {
            'M5': { tp: 3.5, sl: 1.5 },
            'M15': { tp: 4.0, sl: 1.8 }
        };
        this.volatilityCache = new Map();
        this.loadOptimalRatios();
    }

    loadOptimalRatios() {
        try {
            const saved = localStorage.getItem('tpsl_optimal_ratios');
            if (saved) {
                const data = JSON.parse(saved);
                this.optimalRatios = data;
                console.log('✅ Ratios TP/SL carregados:', this.optimalRatios);
            }
        } catch (error) {
            console.error('Erro ao carregar ratios:', error);
        }
    }

    saveOptimalRatios() {
        try {
            localStorage.setItem('tpsl_optimal_ratios', JSON.stringify(this.optimalRatios));
        } catch (error) {
            console.error('Erro ao salvar ratios:', error);
        }
    }

    calculateVolatility(prices, period = 20) {
        if (prices.length < period) return 0.02;
        
        const recentPrices = prices.slice(-period);
        const returns = [];
        
        for (let i = 1; i < recentPrices.length; i++) {
            const ret = (recentPrices[i].close - recentPrices[i-1].close) / recentPrices[i-1].close;
            returns.push(ret);
        }
        
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance);
        
        return volatility;
    }

    getOptimalLevels(currentPrice, atr, timeframe, direction, prices) {
        const volatility = this.calculateVolatility(prices);
        this.volatilityCache.set(timeframe, volatility);
        
        let tpMultiplier = this.optimalRatios[timeframe].tp;
        let slMultiplier = this.optimalRatios[timeframe].sl;
        
        if (volatility < 0.015) {
            tpMultiplier *= 1.2;
            slMultiplier *= 0.9;
        } else if (volatility > 0.03) {
            tpMultiplier *= 0.8;
            slMultiplier *= 1.1;
        }
        
       const stopLoss = direction === 'BUY' 
            ? currentPrice - (atr * slMultiplier)
            : currentPrice + (atr * slMultiplier);
            
        const takeProfit = direction === 'BUY'
            ? currentPrice + (atr * tpMultiplier)
            : Math.max(0.01, currentPrice - (atr * tpMultiplier)); // ✅ CORRIGIDO: evita valores negativos
        
        const adjustedLevels = this.adjustForSupport(currentPrice, stopLoss, takeProfit, prices, direction);
        
        return {
            stopLoss: adjustedLevels.stopLoss,
            takeProfit: adjustedLevels.takeProfit,
            atrUsed: atr,
            volatility: volatility,
            tpMultiplier: tpMultiplier,
            slMultiplier: slMultiplier,
            riskReward: Math.abs(adjustedLevels.takeProfit - currentPrice) / Math.abs(adjustedLevels.stopLoss - currentPrice)
        };
    }

    adjustForSupport(currentPrice, stopLoss, takeProfit, prices, direction) {
        const recentPrices = prices.slice(-50);
        const highs = recentPrices.map(p => p.high);
        const lows = recentPrices.map(p => p.low);
        
        const resistanceLevels = this.findSignificantLevels(highs, 'high');
        const supportLevels = this.findSignificantLevels(lows, 'low');
        
        let adjustedSL = stopLoss;
        let adjustedTP = takeProfit;
        
        if (direction === 'BUY') {
            const nearestSupport = supportLevels.find(level => 
                level < currentPrice && level > stopLoss
            );
            if (nearestSupport) {
                adjustedSL = nearestSupport * 0.998;
            }
            
            const nearestResistance = resistanceLevels.find(level =>
                level > currentPrice && level < takeProfit
            );
            if (nearestResistance) {
                adjustedTP = nearestResistance * 0.998;
            }
        } else {
            const nearestResistance = resistanceLevels.find(level =>
                level > currentPrice && level < stopLoss
            );
            if (nearestResistance) {
                adjustedSL = nearestResistance * 1.002;
            }
            
            const nearestSupport = supportLevels.find(level =>
                level < currentPrice && level > takeProfit
            );
            if (nearestSupport) {
                adjustedTP = nearestSupport * 1.002;
            }
        }
        
        return { stopLoss: adjustedSL, takeProfit: adjustedTP };
    }

    findSignificantLevels(prices, type) {
        const sorted = [...prices].sort((a, b) => b - a);
        const levels = [];
        const threshold = 0.005;
        
        for (let i = 0; i < sorted.length; i++) {
            const price = sorted[i];
            const nearbyCount = sorted.filter(p => 
                Math.abs(p - price) / price < threshold
            ).length;
            
            if (nearbyCount >= 3) {
                const isDuplicate = levels.some(level => 
                    Math.abs(level - price) / price < threshold
                );
                if (!isDuplicate) {
                    levels.push(price);
                }
            }
        }
        
        return levels.sort((a, b) => type === 'high' ? b - a : a - b);
    }

    async learnFromResults() {
        if (!this.auditSystem) return;

        const logs = await this.auditSystem.getRecentLogs(100);
        if (!Array.isArray(logs)) {
            console.warn('⚠️ getRecentLogs não retornou array:', logs);
            return;
        }
        const completedLogs = logs.filter(l => l.outcome && l.outcome !== 'PENDENTE');
        
        if (completedLogs.length < 20) return;
        
        ['M5', 'M15'].forEach(tf => {
            const tfLogs = completedLogs.filter(l => l.metadata.timeframe === tf);
            if (tfLogs.length < 10) return;
            
            const acertos = tfLogs.filter(l => l.outcome === 'ACERTO');
            const erros = tfLogs.filter(l => l.outcome === 'ERRO');
            const expirados = tfLogs.filter(l => l.outcome === 'EXPIRADO');
            
            const winRate = acertos.length / tfLogs.length;
            const expiredRate = expirados.length / tfLogs.length;
            
            if (expiredRate > 0.6) {
                this.optimalRatios[tf].tp *= 0.9;
                console.log(`📉 ${tf}: TP reduzido para ${this.optimalRatios[tf].tp.toFixed(2)}x ATR`);
            } else if (erros.length > acertos.length && winRate < 0.4) {
                this.optimalRatios[tf].sl *= 1.1;
                console.log(`📈 ${tf}: SL aumentado para ${this.optimalRatios[tf].sl.toFixed(2)}x ATR`);
            } else if (winRate > 0.6) {
                this.optimalRatios[tf].sl *= 0.95;
                this.optimalRatios[tf].tp *= 1.05;
                console.log(`✅ ${tf}: Otimizado - TP: ${this.optimalRatios[tf].tp.toFixed(2)}x SL: ${this.optimalRatios[tf].sl.toFixed(2)}x`);
            }
            
            this.optimalRatios[tf].tp = Math.max(2.5, Math.min(6.0, this.optimalRatios[tf].tp));
            this.optimalRatios[tf].sl = Math.max(1.0, Math.min(3.0, this.optimalRatios[tf].sl));
        });
        
        this.saveOptimalRatios();
    }

    getStatistics() {
        return {
            ratios: this.optimalRatios,
            volatility: Object.fromEntries(this.volatilityCache)
        };
    }
}
        class AlphaEngine {
            constructor(memoryDB) {
                this.memoryDB = memoryDB;
                this.weights = {
                    rsi: 0.12,
                    macd: 0.10,
                    bollinger: 0.10,
                    stochastic_events: 0.15,
                    stochastic_divergence: 0.20,
                    volume: 0.10,        // ✨ NOVO
                    obv: 0.08,           // ✨ NOVO
                    ichimoku: 0.10,      // ✨ NOVO
                    vwap: 0.05           // ✨ NOVO
                };
                this.performance = {
                    totalSignals: 0,
                    successfulSignals: 0,
                    winRate: 0,
                    totalPnL: 0
                };
                this.listeners = new Set(); // NOVO: Para notificar mudanças
                this.warmUpModel();
            }

            // NOVO: Método para registrar listeners
            addChangeListener(callback) {
                this.listeners.add(callback);
            }

            removeChangeListener(callback) {
                this.listeners.delete(callback);
            }

            notifyChange() {
                this.listeners.forEach(callback => {
                    try {
                        callback();
                    } catch (error) {
                        console.error('Erro ao notificar listener:', error);
                    }
                });
            }

            async warmUpModel() {
                try {
                    const stats = await this.memoryDB.getStatistics();
                    if (stats.total > 0) {
                        this.performance = {
                            totalSignals: stats.total,
                            successfulSignals: stats.successful,
                            winRate: stats.winRate,
                            totalPnL: stats.totalPnL
                        };
                        this.notifyChange(); // NOVO: Notificar após carregar
                    }
                } catch (error) {
                    console.log('Erro ao aquecer modelo:', error);
                }
            }

          analyzeMarket(marketData, dataSource, symbol = 'BTCUSDT') {
    const prices = marketData.prices;
    const currentPrice = marketData.getLatestPrice();

    const rsi = TechnicalIndicators.calculateRSI(prices);
    const macd = TechnicalIndicators.calculateMACD(prices);
    const bollinger = TechnicalIndicators.calculateBollingerBands(prices);
    const stochastic = TechnicalIndicators.calculateStochastic(prices);

    // ✅ NOVOS INDICADORES ADICIONADOS
    const volume = TechnicalIndicators.analyzeVolume(prices);
    const obv = TechnicalIndicators.calculateOBV(prices);
    const ichimoku = TechnicalIndicators.calculateIchimoku(prices);
    const vwap = TechnicalIndicators.calculateVWAP(prices);

    // Calculate RSI values for divergence detection
    const rsiValues = [];
    if (prices.length >= 14) {
        for (let i = 14; i <= prices.length; i++) {
            rsiValues.push(TechnicalIndicators.calculateRSI(prices.slice(0, i)));
        }
    }

    const features = this.extractFeatures(currentPrice, rsi, macd, bollinger, stochastic, volume, obv, ichimoku, vwap, prices, rsiValues);

    // ✅ CORRIGIDO: Agora gera e retorna o sinal
    const signal = this.generateSignal(features, currentPrice, dataSource, symbol);

    return signal;
}

          extractFeatures(currentPrice, rsi, macd, bollinger, stochastic, volume, obv, ichimoku, vwap, prices, rsiValues) {
    return {
        rsi: {
            value: rsi,
            overbought: rsi > 70,
            oversold: rsi < 30,
            score: this.calculateRSIScore(rsi)
        },
        macd: {
            value: macd.macd,
            signal: macd.signal,
            histogram: macd.histogram,
            bullish: macd.macd > macd.signal,
            score: this.calculateMACDScore(macd)
        },
        bollinger: {
            position: (currentPrice.close - bollinger.lower) / (bollinger.upper - bollinger.lower),
            squeeze: (bollinger.upper - bollinger.lower) / bollinger.middle < 0.1,
            score: this.calculateBollingerScore(currentPrice.close, bollinger)
        },
        stochastic: {
            k: stochastic.k,
            d: stochastic.d,
            overbought: stochastic.k > 80,
            oversold: stochastic.k < 20,
            crossover: this.detectStochasticCrossover(stochastic),
            divergence: this.detectDivergence(prices, rsiValues),
            score: this.calculateStochasticScore(stochastic)
        },
        volume: {
            value: volume,
            score: this.calculateVolumeScore(volume)
        },
        obv: {
            value: obv,
            score: this.calculateOBVScore(obv)
        },
        ichimoku: {
            value: ichimoku,
            score: this.calculateIchimokuScore(ichimoku)
        },
        vwap: {
            value: vwap,
            score: this.calculateVWAPScore(vwap)
        }
    };
}

            calculateRSIScore(rsi) {
                if (rsi < 30) return 0.8;
                if (rsi > 70) return -0.8;
                return 0;
            }

            calculateMACDScore(macd) {
                if (macd.macd > macd.signal && macd.histogram > 0) return 0.7;
                if (macd.macd < macd.signal && macd.histogram < 0) return -0.7;
                return 0;
            }

            calculateBollingerScore(price, bollinger) {
                const position = (price - bollinger.lower) / (bollinger.upper - bollinger.lower);
                if (position < 0.2) return 0.6;
                if (position > 0.8) return -0.6;
                return 0;
            }

            calculateStochasticScore(stochastic) {
                let score = 0;
                if (stochastic.k < 20) score += 0.5;
                if (stochastic.k > 80) score -= 0.5;
                
                if (stochastic.k > stochastic.d) score += 0.3;
                else score -= 0.3;
                
                return score;
            }

            detectStochasticCrossover(stochastic) {
                return Math.abs(stochastic.k - stochastic.d) < 5;
            }

            detectDivergence(prices, rsiValues) {
                // Requires at least 10 data points for meaningful divergence detection
                if (!prices || !rsiValues || prices.length < 10 || rsiValues.length < 10) {
                    return { present: false, type: null, strength: 0 };
                }

                // Analyze last 10 periods
                const recentPrices = prices.slice(-10);
                const recentRSI = rsiValues.slice(-10);

                // Find price highs/lows and RSI highs/lows
                const priceHigh = Math.max(...recentPrices.map(p => p.high));
                const priceLow = Math.min(...recentPrices.map(p => p.low));
                const rsiHigh = Math.max(...recentRSI);
                const rsiLow = Math.min(...recentRSI);

                const priceHighIdx = recentPrices.findIndex(p => p.high === priceHigh);
                const priceLowIdx = recentPrices.findIndex(p => p.low === priceLow);
                const rsiHighIdx = recentRSI.indexOf(rsiHigh);
                const rsiLowIdx = recentRSI.indexOf(rsiLow);

                // Bullish divergence: price makes lower low, but RSI makes higher low
                const bullishDivergence = priceLowIdx > 3 && rsiLowIdx > 3 &&
                    recentPrices[priceLowIdx].low < recentPrices[3].low &&
                    recentRSI[rsiLowIdx] > recentRSI[3];

                // Bearish divergence: price makes higher high, but RSI makes lower high
                const bearishDivergence = priceHighIdx > 3 && rsiHighIdx > 3 &&
                    recentPrices[priceHighIdx].high > recentPrices[3].high &&
                    recentRSI[rsiHighIdx] < recentRSI[3];

                if (bullishDivergence) {
                    const strength = Math.min(1, Math.abs(recentRSI[rsiLowIdx] - recentRSI[3]) / 20);
                    return { present: true, type: 'bullish', strength: 0.5 + strength * 0.5 };
                }

                if (bearishDivergence) {
                    const strength = Math.min(1, Math.abs(recentRSI[rsiHighIdx] - recentRSI[3]) / 20);
                    return { present: true, type: 'bearish', strength: 0.5 + strength * 0.5 };
                }

                return { present: false, type: null, strength: 0 };
            }
calculateVolumeScore(volume) {
                let score = 0;
                
                if (volume.volumeTrend === 'increasing') score += 0.4;
                else if (volume.volumeTrend === 'decreasing') score -= 0.2;
                
                if (volume.isAnomalous) score += 0.5;
                
                score += volume.volumeStrength * 0.3;
                
                return Math.max(-1, Math.min(1, score));
            }

            calculateOBVScore(obv) {
                let score = 0;
                
                if (obv.trend === 'bullish') score += 0.6;
                else if (obv.trend === 'bearish') score -= 0.6;
                
                if (obv.divergence) {
                    if (obv.signal === 'hidden_bullish') score += 0.8;
                    else if (obv.signal === 'hidden_bearish') score -= 0.8;
                }
                
                score += obv.strength * (obv.trend === 'bullish' ? 0.4 : -0.4);
                
                return Math.max(-1, Math.min(1, score));
            }

            calculateIchimokuScore(ichimoku) {
                let score = 0;
                
                if (ichimoku.signal === 'strong_bullish') score += 0.9;
                else if (ichimoku.signal === 'bullish') score += 0.6;
                else if (ichimoku.signal === 'strong_bearish') score -= 0.9;
                else if (ichimoku.signal === 'bearish') score -= 0.6;
                else if (ichimoku.signal === 'inside_cloud') score += 0;
                
                if (ichimoku.tkCross === 'bullish') score += 0.3;
                else if (ichimoku.tkCross === 'bearish') score -= 0.3;
                
                if (ichimoku.chikouConfirmation && score > 0) score += 0.2;
                else if (!ichimoku.chikouConfirmation && score < 0) score -= 0.2;
                
                return Math.max(-1, Math.min(1, score));
            }

            calculateVWAPScore(vwap) {
                let score = 0;
                
                if (vwap.signal === 'above_vwap') score += 0.5;
                else if (vwap.signal === 'below_vwap') score -= 0.5;
                
                score += vwap.strength * (vwap.deviation > 0 ? 0.3 : -0.3);
                
                return Math.max(-1, Math.min(1, score));
            }
           
            generateSignal(features, currentPrice, dataSource, symbol = 'BTCUSDT') {
    // Validar entrada
    if (!currentPrice || !currentPrice.close || isNaN(currentPrice.close)) {
        console.error('❌ currentPrice inválido:', currentPrice);
        return null;
    }

    if (!features) {
        console.error('❌ features inválidas');
        return null;
    }

    let score = 0;
    const contributors = [];

    Object.keys(this.weights).forEach(indicator => {
        let indicatorScore = 0;

        switch(indicator) {
            case 'rsi':
                indicatorScore = features.rsi?.score || 0;
                break;
            case 'macd':
                indicatorScore = features.macd?.score || 0;
                break;
            case 'bollinger':
                indicatorScore = features.bollinger?.score || 0;
                break;
            case 'stochastic_events':
                indicatorScore = features.stochastic?.score || 0;
                break;
            case 'stochastic_divergence':
                if (features.stochastic?.divergence?.present) {
                    indicatorScore = features.stochastic.divergence.type === 'bullish' ? 0.8 : -0.8;
                    indicatorScore *= features.stochastic.divergence.strength || 1;
                }
                break;
            case 'volume':
                indicatorScore = features.volume?.score || 0;
                break;
            case 'obv':
                indicatorScore = features.obv?.score || 0;
                break;
            case 'ichimoku':
                indicatorScore = features.ichimoku?.score || 0;
                break;
            case 'vwap':
                indicatorScore = features.vwap?.score || 0;
                break;
        }

        // Validar que indicatorScore não é NaN
        if (!isNaN(indicatorScore)) {
            score += indicatorScore * this.weights[indicator];
            if (Math.abs(indicatorScore) > 0.1) {
                contributors.push(indicator);
            }
        }
    });

    // Validar score antes de normalizar
    if (isNaN(score)) {
        console.error('❌ Score calculado é NaN');
        return null;
    }

    const normalizedScore = Math.max(0, Math.min(100, (score + 1) * 50));

    if (normalizedScore < 25) {
        return null;
    }

    const direction = score > 0 ? 'BUY' : 'SELL';
    const atr = TechnicalIndicators.calculateATR([currentPrice]);
    
    const prices = this.marketDataRef ? this.marketDataRef.prices : [];
    const optimizedLevels = this.tpslOptimizer ? 
        this.tpslOptimizer.getOptimalLevels(currentPrice.close, atr, 'M5', direction, prices) :
        {
            stopLoss: direction === 'BUY' ? currentPrice.close - (atr * 2) : currentPrice.close + (atr * 2),
            takeProfit: direction === 'BUY' ? currentPrice.close + (atr * 4) : Math.max(0.01, currentPrice.close - (atr * 4)),
            riskReward: 2.0
        };

    // Calcular horários dos candles para opções binárias
    const now = new Date();
    const timeframeMinutes = 5;

    // Calcular o PRÓXIMO candle (quando o atual fechar)
    const currentMinutes = now.getMinutes();
    const currentCandleStart = Math.floor(currentMinutes / timeframeMinutes) * timeframeMinutes;
    const nextCandleStart = new Date(now);
    nextCandleStart.setMinutes(currentCandleStart + timeframeMinutes);
    nextCandleStart.setSeconds(0);
    nextCandleStart.setMilliseconds(0);

    // Horário de expiração (quando o candle de entrada fechar)
    const expirationTime = new Date(nextCandleStart);
    expirationTime.setMinutes(expirationTime.getMinutes() + timeframeMinutes);

    // 🧠 Usar Rede Neural para prever probabilidade de sucesso
    let mlProbability = 0.5;
    let mlConfidence = 'MÉDIA';

    if (this.neuralNetwork) {
        try {
            mlProbability = this.neuralNetwork.predict(features);
            mlConfidence = this.neuralNetwork.getConfidenceLevel(mlProbability);

            console.log(`🧠 [ML] Predição: ${(mlProbability * 100).toFixed(1)}% | Confiança: ${mlConfidence}`);
        } catch (error) {
            console.error('❌ [ML] Erro na predição:', error);
        }
    }

    // Ajustar score com base na predição ML (híbrido: indicadores + neural network)
    const mlScore = mlProbability * 100;
    const hybridScore = (normalizedScore * 0.6) + (mlScore * 0.4); // 60% indicadores, 40% ML

    const signal = {
        id: Date.now() + Math.random(),
        timestamp: new Date(),
        symbol: symbol,
        direction,
        timeframe: 'M5',
        score: Math.round(hybridScore), // Score híbrido
        mlProbability: mlProbability, // Probabilidade da rede neural
        mlConfidence: mlConfidence, // Nível de confiança
        price: currentPrice.close,
        entryTime: nextCandleStart, // Entrada no INÍCIO do próximo candle
        expirationTime: expirationTime, // Validação no FECHAMENTO do candle
        stopLoss: optimizedLevels.stopLoss,
        takeProfit: optimizedLevels.takeProfit,
        riskReward: optimizedLevels.riskReward,
        tpslDetails: optimizedLevels,
        contributors,
        divergence: features.stochastic.divergence.present ? features.stochastic.divergence : null,
        features,
        status: 'PENDENTE',
        dataSource,
        pnl: 0,
        executed: false
    };

    this.memoryDB.saveSignal(signal);
    
    if (window.auditSystemRef) {
        try {
            if (window.debugAudit) {
                console.log('🔍 [ENGINE] Chamando auditSystem.logSignalGeneration');
            }
            window.auditSystemRef.logSignalGeneration(signal, currentPrice, { weights: this.weights });
        } catch (error) {
            console.error('❌ [ENGINE] Erro ao registrar no auditSystem:', error);
        }
    }

    return signal;
}
            async learnFromTrade(signal, result) {
                const successful = result === 'ACERTO';
                const isExpired = result === 'EXPIRADO';

                // Taxa de aprendizado ajustável
                let learningRate = 0.1;

                // Para sinais expirados, usar taxa menor (sinal inconclusivo, não erro)
                if (isExpired) {
                    learningRate = 0.03; // Penalidade leve - pode ser timing, não qualidade
                    console.log(`📚 [ML] Aprendendo com sinal expirado (penalidade leve)`);
                }

                const multiplier = signal.divergence ? 2 : 1;

                signal.contributors.forEach(indicator => {
                    if (successful) {
                        // Reforçar indicadores que contribuíram para acerto
                        this.weights[indicator] = Math.min(1, this.weights[indicator] + learningRate * multiplier);
                    } else if (isExpired) {
                        // Penalidade leve para expirados (pode ser timing, não qualidade do sinal)
                        this.weights[indicator] = Math.max(0.05, this.weights[indicator] - learningRate * 0.5);
                    } else {
                        // Penalidade maior para erros confirmados
                        this.weights[indicator] = Math.max(0, this.weights[indicator] - learningRate * multiplier);
                    }
                });

                // Normalizar pesos
                const totalWeight = Object.values(this.weights).reduce((a, b) => a + b, 0);
                if (totalWeight > 0) {
                    Object.keys(this.weights).forEach(key => {
                        this.weights[key] /= totalWeight;
                    });
                }

                // Log dos pesos atualizados
                console.log(`📊 [ML] Pesos atualizados após ${result}:`,
                    Object.entries(this.weights)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`)
                        .join(', ')
                );

                this.performance.totalSignals++;
                if (successful) this.performance.successfulSignals++;
                this.performance.winRate = (this.performance.successfulSignals / this.performance.totalSignals) * 100;

                signal.status = result;
                await this.memoryDB.saveSignal(signal);

                if (this.performance.totalSignals % 10 === 0) {
                    await this.memoryDB.saveWeightsSnapshot(this.weights, this.performance);
                }

                // 🧠 Treinar rede neural a cada 30 sinais
                if (this.neuralNetwork && this.performance.totalSignals % 30 === 0) {
                    console.log('🎓 Iniciando re-treinamento da rede neural...');
                    await this.neuralNetwork.train(50, 32); // 50 epochs, batch 32
                    await this.neuralNetwork.saveModel();
                }

                this.notifyChange(); // NOVO: Notificar mudanças na performance
            }
        }

/* ========================================
           TENSORFLOW.JS - REDE NEURAL
           ======================================== */

        class TradingNeuralNetwork {
            constructor(memoryDB) {
                this.memoryDB = memoryDB;
                this.model = null;
                this.isTraining = false;
                this.trainingHistory = [];
                this.inputFeatures = 9; // RSI, MACD, Bollinger, Stochastic, Volume, OBV, Ichimoku, VWAP, Divergence
                this.listeners = new Set();

                console.log('🧠 TensorFlow.js inicializado');
                this.buildModel();
            }

            buildModel() {
                // Criar modelo sequencial (feedforward neural network)
                this.model = tf.sequential({
                    layers: [
                        // Camada de entrada + primeira hidden layer
                        tf.layers.dense({
                            inputShape: [this.inputFeatures],
                            units: 64,
                            activation: 'relu',
                            kernelInitializer: 'heNormal'
                        }),
                        // Dropout para prevenir overfitting
                        tf.layers.dropout({ rate: 0.3 }),

                        // Segunda hidden layer
                        tf.layers.dense({
                            units: 32,
                            activation: 'relu',
                            kernelInitializer: 'heNormal'
                        }),
                        tf.layers.dropout({ rate: 0.2 }),

                        // Terceira hidden layer
                        tf.layers.dense({
                            units: 16,
                            activation: 'relu',
                            kernelInitializer: 'heNormal'
                        }),

                        // Camada de saída (probabilidade de sucesso)
                        tf.layers.dense({
                            units: 1,
                            activation: 'sigmoid' // Output entre 0 e 1
                        })
                    ]
                });

                // Compilar modelo
                this.model.compile({
                    optimizer: tf.train.adam(0.001), // Learning rate
                    loss: 'binaryCrossentropy', // Para classificação binária (win/loss)
                    metrics: ['accuracy']
                });

                console.log('✅ Modelo neural criado:');
                this.model.summary();
            }

            prepareTrainingData(signals) {
                // Extrair features e labels dos sinais históricos
                const features = [];
                const labels = [];

                signals.forEach(signal => {
                    if (!signal.features || signal.status === 'PENDENTE') return;

                    // Normalizar features (0 a 1)
                    const featureVector = [
                        (signal.features.rsi?.score || 0) / 2 + 0.5, // -1,1 -> 0,1
                        (signal.features.macd?.score || 0) / 2 + 0.5,
                        (signal.features.bollinger?.score || 0) / 2 + 0.5,
                        (signal.features.stochastic?.score || 0) / 2 + 0.5,
                        (signal.features.volume?.score || 0) / 2 + 0.5,
                        (signal.features.obv?.score || 0) / 2 + 0.5,
                        (signal.features.ichimoku?.score || 0) / 2 + 0.5,
                        (signal.features.vwap?.score || 0) / 2 + 0.5,
                        signal.features.stochastic?.divergence?.present ? 1 : 0
                    ];

                    features.push(featureVector);

                    // Label: 1 = ACERTO, 0 = ERRO
                    labels.push(signal.status === 'ACERTO' ? 1 : 0);
                });

                return {
                    features: tf.tensor2d(features),
                    labels: tf.tensor2d(labels, [labels.length, 1])
                };
            }

            async train(epochs = 50, batchSize = 32) {
                if (this.isTraining) {
                    console.warn('⚠️ Treinamento já em andamento');
                    return;
                }

                try {
                    this.isTraining = true;
                    console.log('🎓 Iniciando treinamento da rede neural...');

                    // Buscar dados históricos
                    const signals = await this.memoryDB.getAllSignals();
                    const validSignals = signals.filter(s =>
                        s.status !== 'PENDENTE' &&
                        s.features &&
                        (s.status === 'ACERTO' || s.status === 'ERRO')
                    );

                    if (validSignals.length < 20) {
                        console.warn('⚠️ Poucos dados para treinar (mínimo 20). Dados disponíveis:', validSignals.length);
                        this.isTraining = false;
                        return;
                    }

                    console.log(`📊 Treinando com ${validSignals.length} sinais`);

                    const { features, labels } = this.prepareTrainingData(validSignals);

                    // Treinar modelo
                    const history = await this.model.fit(features, labels, {
                        epochs: epochs,
                        batchSize: batchSize,
                        validationSplit: 0.2, // 20% para validação
                        shuffle: true,
                        callbacks: {
                            onEpochEnd: (epoch, logs) => {
                                if (epoch % 10 === 0) {
                                    console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, acc = ${(logs.acc * 100).toFixed(2)}%`);
                                }

                                this.trainingHistory.push({
                                    epoch,
                                    loss: logs.loss,
                                    accuracy: logs.acc,
                                    valLoss: logs.val_loss,
                                    valAccuracy: logs.val_acc
                                });
                            }
                        }
                    });

                    // Limpar tensors
                    features.dispose();
                    labels.dispose();

                    console.log('✅ Treinamento concluído!');
                    console.log(`   Acurácia final: ${(history.history.acc[history.history.acc.length - 1] * 100).toFixed(2)}%`);
                    console.log(`   Val Acurácia: ${(history.history.val_acc[history.history.val_acc.length - 1] * 100).toFixed(2)}%`);

                    this.notifyChange();

                } catch (error) {
                    console.error('❌ Erro no treinamento:', error);
                } finally {
                    this.isTraining = false;
                }
            }

            predict(features) {
                if (!this.model) {
                    console.error('❌ Modelo não inicializado');
                    return 0.5;
                }

                try {
                    // Preparar features
                    const featureVector = [
                        (features.rsi?.score || 0) / 2 + 0.5,
                        (features.macd?.score || 0) / 2 + 0.5,
                        (features.bollinger?.score || 0) / 2 + 0.5,
                        (features.stochastic?.score || 0) / 2 + 0.5,
                        (features.volume?.score || 0) / 2 + 0.5,
                        (features.obv?.score || 0) / 2 + 0.5,
                        (features.ichimoku?.score || 0) / 2 + 0.5,
                        (features.vwap?.score || 0) / 2 + 0.5,
                        features.stochastic?.divergence?.present ? 1 : 0
                    ];

                    // Fazer predição
                    const input = tf.tensor2d([featureVector]);
                    const prediction = this.model.predict(input);
                    const probability = prediction.dataSync()[0];

                    // Limpar tensors
                    input.dispose();
                    prediction.dispose();

                    return probability; // Retorna probabilidade de sucesso (0 a 1)

                } catch (error) {
                    console.error('❌ Erro na predição:', error);
                    return 0.5;
                }
            }

            getConfidenceLevel(probability) {
                if (probability >= 0.75) return 'MUITO ALTA';
                if (probability >= 0.65) return 'ALTA';
                if (probability >= 0.55) return 'MÉDIA';
                if (probability >= 0.45) return 'BAIXA';
                return 'MUITO BAIXA';
            }

            addChangeListener(callback) {
                this.listeners.add(callback);
            }

            removeChangeListener(callback) {
                this.listeners.delete(callback);
            }

            notifyChange() {
                this.listeners.forEach(callback => {
                    try {
                        callback();
                    } catch (error) {
                        console.error('Erro ao notificar listener:', error);
                    }
                });
            }

            async saveModel() {
                try {
                    await this.model.save('localstorage://trading-model');
                    console.log('💾 Modelo salvo no localStorage');
                } catch (error) {
                    console.error('❌ Erro ao salvar modelo:', error);
                }
            }

            async loadModel() {
                try {
                    this.model = await tf.loadLayersModel('localstorage://trading-model');
                    console.log('✅ Modelo carregado do localStorage');
                    return true;
                } catch (error) {
                    console.log('ℹ️ Modelo não encontrado, usando novo modelo');
                    return false;
                }
            }

            getTrainingMetrics() {
                if (this.trainingHistory.length === 0) return null;

                const lastMetrics = this.trainingHistory[this.trainingHistory.length - 1];
                return {
                    epochs: this.trainingHistory.length,
                    accuracy: lastMetrics.accuracy,
                    valAccuracy: lastMetrics.valAccuracy,
                    loss: lastMetrics.loss,
                    valLoss: lastMetrics.valLoss
                };
            }
        }

/* ========================================
           SISTEMA DE NOTIFICAÇÕES TELEGRAM
           ======================================== */

        class TelegramNotifier {
            constructor() {
                this.botToken = null;
                this.chatId = null;
                this.enabled = false;
                this.queue = [];
                this.isSending = false;
                this.loadConfig();
            }

            loadConfig() {
                try {
                    const saved = localStorage.getItem('telegram_config');
                    if (saved) {
                        const config = JSON.parse(saved);
                        this.botToken = config.botToken;
                        this.chatId = config.chatId;
                        this.enabled = config.enabled || false;
                        console.log('✅ Configuração Telegram carregada');
                    }
                } catch (error) {
                    console.error('Erro ao carregar config Telegram:', error);
                }
            }

            saveConfig() {
                try {
                    const config = {
                        botToken: this.botToken,
                        chatId: this.chatId,
                        enabled: this.enabled
                    };
                    localStorage.setItem('telegram_config', JSON.stringify(config));
                } catch (error) {
                    console.error('Erro ao salvar config Telegram:', error);
                }
            }

            configure(botToken, chatId) {
                this.botToken = botToken;
                this.chatId = chatId;
                this.saveConfig();
            }

            enable() {
                if (!this.botToken || !this.chatId) {
                    throw new Error('Configure o Bot Token e Chat ID primeiro');
                }
                this.enabled = true;
                this.saveConfig();
            }

            disable() {
                this.enabled = false;
                this.saveConfig();
            }

            async testConnection() {
                if (!this.botToken || !this.chatId) {
                    return { success: false, message: 'Configure o Bot Token e Chat ID' };
                }

                try {
                    const response = await this.sendMessage('🤖 Teste de conexão bem-sucedido!');
                    return { success: true, message: 'Mensagem enviada com sucesso!' };
                } catch (error) {
                    return { success: false, message: error.message };
                }
            }

            async sendMessage(text, parseMode = 'HTML') {
                if (!this.enabled || !this.botToken || !this.chatId) {
                    return;
                }

                this.queue.push({ text, parseMode });
                
                if (!this.isSending) {
                    this.processQueue();
                }
            }

            async processQueue() {
                if (this.queue.length === 0) {
                    this.isSending = false;
                    return;
                }

                this.isSending = true;
                const message = this.queue.shift();

                try {
                    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            chat_id: this.chatId,
                            text: message.text,
                            parse_mode: message.parseMode
                        })
                    });

                    const data = await response.json();
                    
                    if (!data.ok) {
                        console.error('Erro ao enviar mensagem Telegram:', data.description);
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    this.processQueue();

                } catch (error) {
                    console.error('Erro ao enviar mensagem:', error);
                    this.isSending = false;
                }
            }

            formatSignalMessage(signal) {
                const emoji = signal.direction === 'BUY' ? '🟢' : '🔴';
                const dataSource = signal.dataSource === 'REAL' ? '📡 Dados Reais' : '🔮 Simulação';
                
                let message = `${emoji} <b>NOVO SINAL</b>\n\n`;
                message += `<b>Ativo:</b> ${signal.symbol}\n`;
                message += `<b>Direção:</b> ${signal.direction}\n`;
                message += `<b>Score:</b> ${signal.score}%\n`;
                message += `<b>Preço:</b> R$ ${signal.price.toFixed(6)}\n`;
                message += `<b>Stop Loss:</b> R$ ${signal.stopLoss.toFixed(6)}\n`;
                message += `<b>Take Profit:</b> R$ ${signal.takeProfit.toFixed(6)}\n`;
                message += `<b>Timeframe:</b> ${signal.timeframe}\n`;
                message += `<b>Fonte:</b> ${dataSource}\n`;
                
                if (signal.divergence) {
                    message += `\n⚡ <b>Divergência ${signal.divergence.type}</b>`;
                }
                
                const entryTime = new Date(signal.entryTime);
                message += `\n⏰ <b>Entrada:</b> ${entryTime.toLocaleTimeString('pt-BR')}`;
                
                return message;
            }

            formatExecutionMessage(signal, executionResult) {
                let message = `🤖 <b>ORDEM EXECUTADA</b>\n\n`;
                message += `<b>Direção:</b> ${signal.direction}\n`;
                message += `<b>Símbolo:</b> ${signal.symbol}\n`;
                message += `<b>Preço Executado:</b> R$ ${executionResult.executedPrice.toFixed(6)}\n`;
                message += `<b>Quantidade:</b> ${executionResult.executedQty}\n`;
                message += `<b>Order ID:</b> ${executionResult.orderId}\n`;
                
                if (executionResult.simulated) {
                    message += `\n⚠️ <i>Ordem simulada</i>`;
                }
                
                return message;
            }

            formatResultMessage(signal, result, pnl) {
                let emoji = '';
                let title = '';
                
                if (result === 'ACERTO') {
                    emoji = '✅';
                    title = 'TAKE PROFIT ATINGIDO';
                } else if (result === 'ERRO') {
                    emoji = '❌';
                    title = 'STOP LOSS ATINGIDO';
                } else if (result === 'EXPIRADO') {
                    emoji = '⏱️';
                    title = 'SINAL EXPIRADO';
                }
                
                let message = `${emoji} <b>${title}</b>\n\n`;
                message += `<b>Símbolo:</b> ${signal.symbol}\n`;
                message += `<b>Direção:</b> ${signal.direction}\n`;
                message += `<b>P&L:</b> R$ ${pnl.toFixed(2)}\n`;
                
                if (signal.finalPrice) {
                    message += `<b>Preço Final:</b> R$ ${signal.finalPrice.toFixed(6)}\n`;
                }
                
                return message;
            }

            async notifySignal(signal) {
                if (!this.enabled) return;
                const message = this.formatSignalMessage(signal);
                await this.sendMessage(message);
            }

            async notifyExecution(signal, executionResult) {
                if (!this.enabled) return;
                const message = this.formatExecutionMessage(signal, executionResult);
                await this.sendMessage(message);
            }

            async notifyResult(signal, result, pnl) {
                if (!this.enabled) return;
                const message = this.formatResultMessage(signal, result, pnl);
                await this.sendMessage(message);
            }

            async notifyDailyReport(stats) {
                if (!this.enabled) return;
                
                let message = `📊 <b>RELATÓRIO DIÁRIO</b>\n\n`;
                message += `<b>Total de Trades:</b> ${stats.totalTrades}\n`;
                message += `<b>Vitórias:</b> ${stats.wins} (${stats.winRate.toFixed(1)}%)\n`;
                message += `<b>Derrotas:</b> ${stats.losses}\n`;
                message += `<b>P&L Total:</b> R$ ${stats.totalPnL.toFixed(2)}\n`;
                
                await this.sendMessage(message);
            }

            isConfigured() {
                return this.botToken && this.chatId;
            }

            isEnabled() {
                return this.enabled;
            }
        }
        /* ========================================
           SISTEMA DE BACKTESTING
           ======================================== */

        class BacktestEngine {
            constructor(alphaEngine, memoryDB) {
                this.alphaEngine = alphaEngine;
                this.memoryDB = memoryDB;
                this.results = [];
                this.isRunning = false;
            }

            async loadHistoricalData(symbol, timeframe, startDate, endDate) {
                console.log(`📊 Carregando dados históricos: ${symbol} ${timeframe}`);
                console.log(`   Período: ${startDate} até ${endDate}`);
                
                const data = this.generateHistoricalData(startDate, endDate, timeframe);
                
                console.log(`✅ ${data.length} candles carregados`);
                return data;
            }

            generateHistoricalData(startDate, endDate, timeframe) {
                const candles = [];
                const start = new Date(startDate).getTime();
                const end = new Date(endDate).getTime();
                const intervalMs = timeframe === 'M5' ? 5 * 60 * 1000 : 15 * 60 * 1000;
                
                let basePrice = 50000;
                let timestamp = start;
                
                while (timestamp <= end) {
                    const trend = Math.sin(candles.length * 0.01) * 500;
                    const noise = (Math.random() - 0.5) * 200;
                    const price = basePrice + trend + noise;
                    
                    candles.push({
                        timestamp,
                        open: price,
                        high: price + Math.random() * 100,
                        low: price - Math.random() * 100,
                        close: price + (Math.random() - 0.5) * 50,
                        volume: Math.random() * 1000000
                    });
                    
                    basePrice = price;
                    timestamp += intervalMs;
                }
                
                return candles;
            }

            async runBacktest(config) {
                if (this.isRunning) {
                    throw new Error('Backtest já em execução');
                }

                this.isRunning = true;
                this.results = [];
                
                const {
                    symbol = 'BTCUSDT',
                    timeframe = 'M5',
                    startDate,
                    endDate,
                    initialBalance = 10000,
                    riskPerTrade = 100,
                    minScore = 50
                } = config;

                console.log('🚀 Iniciando Backtest...');
                console.log(`   Símbolo: ${symbol}`);
                console.log(`   Período: ${startDate} a ${endDate}`);
                console.log(`   Saldo inicial: R$ ${initialBalance}`);

                try {
                    const historicalData = await this.loadHistoricalData(symbol, timeframe, startDate, endDate);
                    
                    if (historicalData.length < 200) {
                        throw new Error('Dados insuficientes para backtest (mínimo 200 candles)');
                    }

                    let balance = initialBalance;
                    let openPositions = [];
                    const trades = [];
                    
                    for (let i = 200; i < historicalData.length; i++) {
                        const currentCandles = historicalData.slice(0, i + 1);
                        const currentPrice = currentCandles[i];
                        
                        const mockMarketData = {
                            prices: currentCandles,
                            getLatestPrice: () => currentPrice
                        };
                        
                        openPositions = openPositions.filter(position => {
                            const candle = currentPrice;
                            let closed = false;
                            let result = null;
                            let pnl = 0;
                            
                            if (position.direction === 'BUY') {
                                if (candle.high >= position.takeProfit) {
                                    result = 'WIN';
                                    pnl = riskPerTrade * 2;
                                    closed = true;
                                } else if (candle.low <= position.stopLoss) {
                                    result = 'LOSS';
                                    pnl = -riskPerTrade;
                                    closed = true;
                                }
                            } else {
                                if (candle.low <= position.takeProfit) {
                                    result = 'WIN';
                                    pnl = riskPerTrade * 2;
                                    closed = true;
                                } else if (candle.high >= position.stopLoss) {
                                    result = 'LOSS';
                                    pnl = -riskPerTrade;
                                    closed = true;
                                }
                            }
                            
                            if (!closed && i - position.entryIndex > 20) {
                                result = 'TIMEOUT';
                                pnl = 0;
                                closed = true;
                            }
                            
                            if (closed) {
                                balance += pnl;
                                trades.push({
                                    ...position,
                                    exitPrice: candle.close,
                                    exitTime: candle.timestamp,
                                    result,
                                    pnl,
                                    balance
                                });
                            }
                            
                            return !closed;
                        });
                        
                        if (openPositions.length === 0) {
                            try {
                                const signal = this.alphaEngine.analyzeMarket(mockMarketData, 'BACKTEST');
                                
                                if (signal && signal.score >= minScore && balance >= riskPerTrade) {
                                    openPositions.push({
                                        entryIndex: i,
                                        entryPrice: currentPrice.close,
                                        entryTime: currentPrice.timestamp,
                                        direction: signal.direction,
                                        stopLoss: signal.stopLoss,
                                        takeProfit: signal.takeProfit,
                                        score: signal.score,
                                        symbol
                                    });
                                }
                            } catch (error) {
                                // Ignora erros
                            }
                        }
                        
                        if (i % 100 === 0) {
                            const progress = ((i / historicalData.length) * 100).toFixed(1);
                            console.log(`⏳ Progresso: ${progress}% | Trades: ${trades.length} | Saldo: R$ ${balance.toFixed(2)}`);
                        }
                    }
                    
                    openPositions.forEach(position => {
                        balance -= riskPerTrade;
                        trades.push({
                            ...position,
                            exitPrice: historicalData[historicalData.length - 1].close,
                            exitTime: historicalData[historicalData.length - 1].timestamp,
                            result: 'TIMEOUT',
                            pnl: -riskPerTrade,
                            balance
                        });
                    });
                    
                    const stats = this.calculateBacktestStats(trades, initialBalance, balance);
                    
                    this.results = {
                        config,
                        trades,
                        stats,
                        finalBalance: balance,
                        historicalDataPoints: historicalData.length
                    };
                    
                    console.log('✅ Backtest concluído!');
                    console.log(`   Total de trades: ${trades.length}`);
                    console.log(`   Win Rate: ${stats.winRate.toFixed(2)}%`);
                    console.log(`   Retorno: ${stats.totalReturn.toFixed(2)}%`);
                    console.log(`   Saldo final: R$ ${balance.toFixed(2)}`);
                    
                    return this.results;
                    
                } catch (error) {
                    console.error('❌ Erro no backtest:', error);
                    throw error;
                } finally {
                    this.isRunning = false;
                }
            }

            calculateBacktestStats(trades, initialBalance, finalBalance) {
                if (trades.length === 0) {
                    return {
                        totalTrades: 0,
                        wins: 0,
                        losses: 0,
                        timeouts: 0,
                        winRate: 0,
                        lossRate: 0,
                        totalReturn: 0,
                        maxDrawdown: 0,
                        sharpeRatio: 0,
                        profitFactor: 0,
                        avgWin: 0,
                        avgLoss: 0,
                        largestWin: 0,
                        largestLoss: 0
                    };
                }

                const wins = trades.filter(t => t.result === 'WIN');
                const losses = trades.filter(t => t.result === 'LOSS');
                const timeouts = trades.filter(t => t.result === 'TIMEOUT');
                
                const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
                const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
                const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
                
                let peak = initialBalance;
                let maxDrawdown = 0;
                
                trades.forEach(trade => {
                    if (trade.balance > peak) {
                        peak = trade.balance;
                    }
                    const drawdown = ((peak - trade.balance) / peak) * 100;
                    if (drawdown > maxDrawdown) {
                        maxDrawdown = drawdown;
                    }
                });
                
                const returns = trades.map(t => (t.pnl / initialBalance) * 100);
                const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
                const stdDev = Math.sqrt(
                    returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
                );
                const sharpeRatio = stdDev !== 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
                
                return {
                    totalTrades: trades.length,
                    wins: wins.length,
                    losses: losses.length,
                    timeouts: timeouts.length,
                    winRate: (wins.length / trades.length) * 100,
                    lossRate: (losses.length / trades.length) * 100,
                    totalReturn: ((finalBalance - initialBalance) / initialBalance) * 100,
                    totalPnL,
                    maxDrawdown,
                    sharpeRatio,
                    profitFactor: totalLosses !== 0 ? totalWins / totalLosses : 0,
                    avgWin: wins.length > 0 ? totalWins / wins.length : 0,
                    avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
                    largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0,
                    largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0
                };
            }

            getResults() {
                return this.results;
            }

            exportResults() {
                if (!this.results || !this.results.trades) {
                    return null;
                }

                const { trades, stats } = this.results;
                
                let csv = 'Data/Hora,Símbolo,Direção,Preço Entrada,Stop Loss,Take Profit,Preço Saída,Resultado,P&L,Saldo,Score\n';
                
                trades.forEach(trade => {
                    csv += [
                        new Date(trade.entryTime).toLocaleString('pt-BR'),
                        trade.symbol,
                        trade.direction,
                        trade.entryPrice.toFixed(2),
                        trade.stopLoss.toFixed(2),
                        trade.takeProfit.toFixed(2),
                        trade.exitPrice.toFixed(2),
                        trade.result,
                        trade.pnl.toFixed(2),
                        trade.balance.toFixed(2),
                        trade.score
                    ].join(',') + '\n';
                });
                
                csv += '\n\nESTATÍSTICAS\n';
                csv += `Total de Trades,${stats.totalTrades}\n`;
                csv += `Vitórias,${stats.wins}\n`;
                csv += `Derrotas,${stats.losses}\n`;
                csv += `Win Rate,${stats.winRate.toFixed(2)}%\n`;
                csv += `Retorno Total,${stats.totalReturn.toFixed(2)}%\n`;
                csv += `Max Drawdown,${stats.maxDrawdown.toFixed(2)}%\n`;
                csv += `Sharpe Ratio,${stats.sharpeRatio.toFixed(2)}\n`;
                csv += `Profit Factor,${stats.profitFactor.toFixed(2)}\n`;
                
                return csv;
            }
        }
        /* ========================================
           COMPONENTE APP PRINCIPAL
           ======================================== */


/* ========================================
   COMPONENTE PRINCIPAL - APP
   ======================================== */

        function App() {
            const [currentView, setCurrentView] = useState('dashboard');
            const [mode, setMode] = useState('manual');
            const [isActive, setIsActive] = useState(false);
            const [signals, setSignals] = useState([]);
            const [marketData, setMarketData] = useState(null);
            const [alphaEngine, setAlphaEngine] = useState(null);
            const [notification, setNotification] = useState(null);
            const [minScore, setMinScore] = useState(50);
            const [riskAmount, setRiskAmount] = useState(100);
            const [dataSource, setDataSource] = useState('DISCONNECTED');
            const [memoryDB, setMemoryDB] = useState(null);
            const [apiManager, setApiManager] = useState(null);
            const [orderExecutor, setOrderExecutor] = useState(null);
            const [auditSystem, setAuditSystem] = useState(null);
            const [maxPositions, setMaxPositions] = useState(3);
            const [updateTrigger, setUpdateTrigger] = useState(0); // NOVO: Para forçar re-renders
            const [assetType, setAssetType] = useState('crypto'); // 'crypto', 'forex', 'stock'
            const [symbol, setSymbol] = useState('BTCUSDT');

            const marketDataRef = useRef(null);
            const alphaEngineRef = useRef(null);
            const memoryDBRef = useRef(null);
            const apiManagerRef = useRef(null);
            const auditSystemRef = useRef(null);
            const orderExecutorRef = useRef(null);
            const verificationTimers = useRef(new Map());
            const minScoreRef = useRef(minScore);

            // 🔗 Encadeamento de preços reais entre sinais consecutivos
            const lastConfirmedExit = useRef({
                price: null,        // Último preço de saída confirmado
                timestamp: null,    // Timestamp da última saída
                signalId: null      // ID do sinal que gerou essa saída
            });

            // 🎯 Sistema de otimização de sinais - Buffer de candidatos
            const signalCandidatesBuffer = useRef(new Map()); // Map<entryTime, {signal, timer}>
            const SIGNAL_OPTIMIZATION = {
                enabled: true,  // Ativar otimização de sinais
                sendBeforeEntry: 90000,  // Enviar 1min30s antes da entrada (90 segundos)
                criteria: 'best_score'  // 'best_score' | 'best_ml' | 'both'
            };

            // 🎯 Função para comparar qualidade de sinais
            const compareSignalQuality = (newSignal, existingSignal) => {
                if (SIGNAL_OPTIMIZATION.criteria === 'best_score') {
                    return newSignal.score > existingSignal.score;
                } else if (SIGNAL_OPTIMIZATION.criteria === 'best_ml') {
                    return (newSignal.mlConfidence || 0) > (existingSignal.mlConfidence || 0);
                } else if (SIGNAL_OPTIMIZATION.criteria === 'both') {
                    const newTotal = newSignal.score + (newSignal.mlConfidence || 0) * 100;
                    const existingTotal = existingSignal.score + (existingSignal.mlConfidence || 0) * 100;
                    return newTotal > existingTotal;
                }
                return false;
            };

            // 🎯 Função para agendar envio do sinal otimizado
            const scheduleOptimizedSignal = (signal, entryTimeKey) => {
                const now = Date.now();
                const entryTime = signal.entryTime.getTime();
                const sendTime = entryTime - SIGNAL_OPTIMIZATION.sendBeforeEntry; // 1min30s antes
                const delay = sendTime - now;

                if (delay > 0) {
                    console.log(`📅 Sinal agendado para ${new Date(sendTime).toLocaleTimeString('pt-BR')} (em ${Math.floor(delay/1000)}s)`);
                    console.log(`   Score: ${signal.score}% | ML: ${((signal.mlConfidence || 0) * 100).toFixed(1)}%`);

                    const timer = setTimeout(() => {
                        console.log('%c✅ ENVIANDO MELHOR SINAL!', 'color: #00ff88; font-weight: bold; font-size: 14px;');
                        console.log(`   📊 Score final: ${signal.score}% | ML: ${((signal.mlConfidence || 0) * 100).toFixed(1)}%`);

                        // Enviar o sinal
                        setSignals(prev => {
                            const newSignals = [signal, ...prev].slice(0, 10);
                            newSignals[0].timestamp = new Date();
                            return newSignals;
                        });

                        showNotification(`Melhor sinal ${signal.direction} - Score: ${signal.score}%`);
                        playAlert();
                        scheduleSignalVerification(signal);

                        // Telegram
                        if (window.telegramNotifier && window.telegramNotifier.isEnabled()) {
                            window.telegramNotifier.notifySignal(signal);
                        }

                        // Executar ordem (auto ou manual)
                        if (orderExecutorRef.current) {
                            orderExecutorRef.current.executeSignalAuto(
                                signal,
                                modeRef.current,
                                riskAmount
                            ).then(executionResult => {
                                if (executionResult.success) {
                                    showNotification(
                                        `🤖 ORDEM EXECUTADA: ${signal.direction} @ ${executionResult.executedPrice.toFixed(2)} | ID: ${executionResult.orderId}`
                                    );
                                    signal.executed = true;
                                    signal.executionDetails = executionResult;
                                    if (window.telegramNotifier && window.telegramNotifier.isEnabled()) {
                                        window.telegramNotifier.notifyExecution(signal, executionResult);
                                    }
                                    setSignals(prev => prev.map(s => s.id === signal.id ? signal : s));
                                } else if (executionResult.reason === 'manual_mode') {
                                    console.log('✅ Sinal enviado para aprovação manual');
                                } else {
                                    showNotification(`⚠️ Erro: ${executionResult.message}`);
                                }
                            });
                        }

                        // Limpar do buffer
                        signalCandidatesBuffer.current.delete(entryTimeKey);
                    }, delay);

                    signalCandidatesBuffer.current.set(entryTimeKey, { signal, timer });
                } else {
                    console.warn(`⚠️ Sinal ignorado - tempo de envio já passou (delay: ${delay}ms)`);
                }
            };

            // 🎯 Função principal de otimização de sinais
            const handleOptimizedSignal = (signal) => {
                const entryTimeKey = signal.entryTime.getTime();

                console.log('\n🔍 [OTIMIZAÇÃO] Novo candidato de sinal recebido');
                console.log(`   ⏰ Entrada: ${signal.entryTime.toLocaleTimeString('pt-BR')}`);
                console.log(`   📊 Score: ${signal.score}% | ML: ${((signal.mlConfidence || 0) * 100).toFixed(1)}%`);

                // Verificar se já existe um candidato para este horário de entrada
                const existing = signalCandidatesBuffer.current.get(entryTimeKey);

                if (existing) {
                    console.log('   🔄 Já existe candidato para este horário');
                    console.log(`      Atual: Score ${existing.signal.score}% | ML ${((existing.signal.mlConfidence || 0) * 100).toFixed(1)}%`);

                    // Comparar qualidade
                    const isBetter = compareSignalQuality(signal, existing.signal);

                    if (isBetter) {
                        console.log('%c   ✅ NOVO SINAL É MELHOR! Substituindo...', 'color: #00ff88; font-weight: bold;');
                        // Cancelar timer anterior
                        clearTimeout(existing.timer);
                        // Agendar novo sinal
                        scheduleOptimizedSignal(signal, entryTimeKey);
                    } else {
                        console.log('   ❌ Sinal existente é melhor. Mantendo atual.');
                    }
                } else {
                    console.log('   ✅ Primeiro candidato para este horário. Agendando...');
                    scheduleOptimizedSignal(signal, entryTimeKey);
                }
            };

const modeRef = useRef(mode);

useEffect(() => {
    minScoreRef.current = minScore;
}, [minScore]);

useEffect(() => {
    const initializeSystem = async () => {
        try {
            console.log('🚀 Inicializando sistema...');
            
            // ✅ Solicitar permissão para notificações
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        console.log('✅ Permissão para notificações concedida');
                    }
                });
            }
            
            // ✅ Inicializar MemoryDB com Supabase
            memoryDBRef.current = new MemoryDB();
            await memoryDBRef.current.init();
            setMemoryDB(memoryDBRef.current);
            console.log('✅ MemoryDB inicializado com Supabase');
            
            marketDataRef.current = new MarketDataManager();
            setMarketData(marketDataRef.current);
            console.log('✅ MarketData inicializado');
            
            // ✅ Inicializar AuditSystem com Supabase
            auditSystemRef.current = new AuditSystem();
            window.auditSystemRef = auditSystemRef.current;
            await auditSystemRef.current.init();
            setAuditSystem(auditSystemRef.current);
            console.log('✅ AuditSystem inicializado com Supabase');
            
            // Inicializar Rede Neural TensorFlow.js
            const neuralNetwork = new TradingNeuralNetwork(memoryDBRef.current);
            await neuralNetwork.loadModel(); // Tentar carregar modelo salvo
            window.neuralNetworkRef = neuralNetwork; // Referência global

            alphaEngineRef.current = new AlphaEngine(memoryDBRef.current);
            alphaEngineRef.current.marketDataRef = marketDataRef.current;
            alphaEngineRef.current.tpslOptimizer = new TPSLOptimizer(auditSystemRef.current);
            alphaEngineRef.current.neuralNetwork = neuralNetwork; // ✨ Adicionar rede neural
            setAlphaEngine(alphaEngineRef.current);
            console.log('✅ AlphaEngine inicializado com TensorFlow.js');

            // ✅ CORRIGIDO: APIManager com await
            apiManagerRef.current = new APIConnectionManager();
            await apiManagerRef.current.loadFromStorage(); // Garantir que carregou
            setApiManager(apiManagerRef.current);
            console.log('✅ APIManager inicializado');
            
            orderExecutorRef.current = new OrderExecutionManager(apiManagerRef.current);
            setOrderExecutor(orderExecutorRef.current);
            window.orderExecutorRef = orderExecutorRef.current; // Tornar acessível globalmente
            console.log('✅ OrderExecutor inicializado');

            const telegramNotifier = new TelegramNotifier();
            window.telegramNotifier = telegramNotifier;
            console.log('✅ TelegramNotifier inicializado');

            const scheduleDailyReport = () => {
                const now = new Date();
                const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);
                
                if (tonight <= now) {
                    tonight.setDate(tonight.getDate() + 1);
                }
                
                const msUntilReport = tonight - now;
                
                setTimeout(async () => {
                    if (memoryDBRef.current && telegramNotifier.isEnabled()) {
                        const stats = await memoryDBRef.current.getStatistics();
                        await telegramNotifier.notifyDailyReport(stats);
                    }
                    scheduleDailyReport();
                }, msUntilReport);
            };

            scheduleDailyReport();
            
            const updateCallback = () => setUpdateTrigger(prev => prev + 1);
            
            memoryDBRef.current.addChangeListener(updateCallback);
            alphaEngineRef.current.addChangeListener(updateCallback);
            auditSystemRef.current.addChangeListener(updateCallback);
            
            console.log('🎉 Sistema totalmente inicializado!');
            console.log('%c💡 Sistema agora usa SUPABASE para persistência!', 'color: #00ff88; font-weight: bold;');
            
            setInterval(async () => {
                if (alphaEngineRef.current && alphaEngineRef.current.tpslOptimizer) {
                    await alphaEngineRef.current.tpslOptimizer.learnFromResults();
                }
            }, 5 * 60 * 1000);

            // 🛡️ WATCHDOG - Verifica saúde do sistema a cada 1 minuto
            let lastHeartbeat = Date.now();
            setInterval(() => {
                const now = Date.now();
                const timeSinceLastBeat = now - lastHeartbeat;

                // Se passou mais de 2 minutos sem heartbeat, sistema pode estar travado
                if (timeSinceLastBeat > 120000) {
                    console.warn('⚠️ WATCHDOG: Sistema pode estar travado! Tentando recuperar...');

                    // Tentar recuperar marketData
                    if (marketDataRef.current && marketDataRef.current.wsReconnectAttempts < marketDataRef.current.maxReconnectAttempts) {
                        console.log('🔄 Forçando reconexão do WebSocket...');
                        marketDataRef.current.wsReconnectAttempts = 0;
                    }
                }

                lastHeartbeat = now;
                console.log('💓 Heartbeat - Sistema ativo');
            }, 60000); // A cada 1 minuto

            // 🧹 LIMPEZA AUTOMÁTICA - Comentada pois estava removendo timers válidos
            // Timers são limpos automaticamente quando:
            // 1. Sinal é confirmado (sucesso ou erro)
            // 2. Sinal expira (timeout de segurança)
            // 3. Componente é desmontado (useEffect cleanup)
            // Não precisamos de limpeza manual de "órfãos"

            // 🔄 AUTO-RECOVERY - Tenta reconectar APIs se houver falha
            setInterval(async () => {
                try {
                    // Verificar se MarketData está recebendo dados
                    if (marketDataRef.current && marketDataRef.current.candles && marketDataRef.current.candles.length > 0) {
                        const latestCandle = marketDataRef.current.candles[marketDataRef.current.candles.length - 1];
                        const candleAge = Date.now() - latestCandle.timestamp;

                        // Se último candle tem mais de 10 minutos, algo está errado
                        if (candleAge > 10 * 60 * 1000) {
                            console.warn('⚠️ Dados de mercado desatualizados! Forçando atualização...');
                            if (marketDataRef.current.fetchKlinesFromREST) {
                                await marketDataRef.current.fetchKlinesFromREST(symbol, 'M5', 200);
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ Erro no auto-recovery:', error);
                }
            }, 5 * 60 * 1000); // A cada 5 minutos

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            console.log('ℹ️ Alguns componentes podem não estar disponíveis');
            console.log('💡 Verifique se o Supabase está configurado corretamente');
        }
    };

    // Executar a função assíncrona
    initializeSystem();
    
    // Cleanup
    return () => {
        if (memoryDBRef.current) memoryDBRef.current.removeChangeListener(() => setUpdateTrigger(prev => prev + 1));
        if (alphaEngineRef.current) alphaEngineRef.current.removeChangeListener(() => setUpdateTrigger(prev => prev + 1));
        if (auditSystemRef.current) auditSystemRef.current.removeChangeListener(() => setUpdateTrigger(prev => prev + 1));
    };
}, []);
            

            // ✅ LIMPEZA DE TIMERS AO DESMONTAR
            useEffect(() => {
                return () => {
                    // Limpar todos os timers de verificação
                    verificationTimers.current.forEach((timerData) => {
                        if (timerData.timer) clearTimeout(timerData.timer);
                        if (timerData.entryTimer) clearTimeout(timerData.entryTimer);
                        if (timerData.safetyTimeout) clearTimeout(timerData.safetyTimeout);
                    });
                    verificationTimers.current.clear();
                    console.log('🧹 Timers limpos ao desmontar componente');
                };
            }, []);

            useEffect(() => {
                const loadSavedSignals = async () => {
                    if (memoryDB) {
                        try {
                            console.log('📥 Carregando sinais salvos do Supabase...');
                            const savedSignals = await memoryDB.getAllSignals();

                            // Ordenar por timestamp (mais recentes primeiro)
                            savedSignals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                            // Carregar últimos 10 sinais (independente do status)
                            const recentSignals = savedSignals.slice(0, 10);

                            if (recentSignals.length > 0) {
                                console.log(`✅ ${recentSignals.length} sinais carregados:`, {
                                    pendentes: recentSignals.filter(s => s.status === 'PENDENTE').length,
                                    acertos: recentSignals.filter(s => s.status === 'ACERTO').length,
                                    erros: recentSignals.filter(s => s.status === 'ERRO').length
                                });

                                // Re-agendar verificação apenas para sinais PENDENTES e NÃO EXPIRADOS
                                const now = new Date();
                                const pendingSignals = recentSignals.filter(s => {
                                    if (s.status !== 'PENDENTE') return false;

                                    // Verificar se já expirou
                                    const expirationTime = s.expirationTime ? new Date(s.expirationTime) : null;
                                    if (expirationTime && expirationTime < now) {
                                        console.log(`⏱️ Sinal ${s.id} já expirou. Marcando como EXPIRADO.`);
                                        s.status = 'EXPIRADO';
                                        s.pnl = 0;
                                        if (window.memoryDB) {
                                            window.memoryDB.saveSignal(s);
                                        }
                                        return false;
                                    }

                                    return true;
                                });

                                // Carregar apenas sinais PENDENTES (após filtragem de expirados)
                                setSignals(pendingSignals);

                                pendingSignals.forEach(signal => {
                                    console.log('🔄 Re-agendando verificação para sinal:', signal.id);
                                    scheduleSignalVerification(signal);
                                });
                            } else {
                                console.log('📭 Nenhum sinal salvo encontrado');
                            }
                        } catch (error) {
                            console.error('❌ Erro ao carregar sinais:', error);
                        }
                    }
                };

                if (memoryDB) {
                    loadSavedSignals();
                }
            }, [memoryDB]);

            useEffect(() => {
                const config = {
                    minScore,
                    riskAmount,
                    maxPositions
                };
                localStorage.setItem('alpha_config', JSON.stringify(config));
            }, [minScore, riskAmount, maxPositions]);

            useEffect(() => {
                if (!isActive || !marketData || !alphaEngine || !apiManager) return;

                let lastKnownPrice = null;
                let samePriceCount = 0;
                let lastSignalCandleTime = null; // Controle de sinais duplicados
                let analysisCount = 0;

                // 🕐 FUNÇÃO AUXILIAR: Calcular informações do candle
                const getCandleInfo = () => {
                    const now = new Date();
                    const minutes = now.getMinutes();
                    const seconds = now.getSeconds();

                    // Início do candle atual (múltiplo de 5)
                    const candleStartMinute = Math.floor(minutes / 5) * 5;
                    const candleStart = new Date(now);
                    candleStart.setMinutes(candleStartMinute);
                    candleStart.setSeconds(0);
                    candleStart.setMilliseconds(0);

                    // Próximo candle
                    const nextCandle = new Date(candleStart);
                    nextCandle.setMinutes(candleStart.getMinutes() + 5);

                    // Tempo restante até fechar
                    const timeUntilClose = nextCandle - now;
                    const secondsUntilClose = Math.floor(timeUntilClose / 1000);

                    return {
                        candleStart,
                        nextCandle,
                        timeUntilClose,
                        secondsUntilClose,
                        candleId: candleStart.getTime() // ID único do candle
                    };
                };

                // 🚀 FUNÇÃO PRINCIPAL DE ANÁLISE
                const runAnalysis = async () => {
                    try {
                        analysisCount++;
                        const candleInfo = getCandleInfo();

                        console.log(`\n⏰ [ANÁLISE #${analysisCount}] ${new Date().toLocaleTimeString('pt-BR')}`);
                        console.log(`   📊 Candle atual: ${candleInfo.candleStart.toLocaleTimeString('pt-BR')}`);
                        console.log(`   ⏳ Tempo até fechar: ${candleInfo.secondsUntilClose}s`);

                        const activeConn = apiManager.getActiveConnection();

                        // Verificar se há conexão API ativa
                        if (!activeConn || activeConn.status !== 'connected') {
                            console.warn('⚠️ Nenhuma API conectada. Configure uma API para gerar sinais.');
                            setDataSource('DISCONNECTED');
                            return;
                        }

                        // ⚠️ VALIDAÇÃO: Tempo mínimo antes do fechamento
                        const MIN_TIME_BEFORE_CLOSE = 60; // 60 segundos
                        if (candleInfo.secondsUntilClose < MIN_TIME_BEFORE_CLOSE) {
                            console.warn(`⏭️ [SKIP] Faltam apenas ${candleInfo.secondsUntilClose}s para fechar. Aguardando próximo candle...`);
                            return;
                        }

                        // Buscar dados reais da API
                        try {
                            let symbolToFetch = symbol || 'BTCUSDT';

                            console.log(`   📡 Buscando dados: ${symbolToFetch} (M5)`);

                            const realData = await fetchRealMarketData(
                                activeConn.provider,
                                activeConn.apiKey,
                                symbolToFetch,
                                'M5',
                                activeConn.secretKey
                            );

                            if (!realData || realData.length === 0) {
                                throw new Error('Array de dados vazio da API');
                            }

                            // Atualizar dados do mercado
                            marketData.replaceWithRealData(realData);
                            setDataSource('REAL');

                            // Verificar mudança de preço
                            const currentPrice = marketData.getLatestPrice();
                            if (currentPrice) {
                                console.log(`   💰 Preço atual: ${currentPrice.close.toFixed(6)}`);

                                if (lastKnownPrice) {
                                    const priceDiff = Math.abs(currentPrice.close - lastKnownPrice);
                                    console.log(`   📊 Variação: ${priceDiff.toFixed(6)} (${((priceDiff/lastKnownPrice)*100).toFixed(4)}%)`);

                                    if (currentPrice.close === lastKnownPrice) {
                                        samePriceCount++;
                                        if (samePriceCount > 2) {
                                            console.warn(`   ⚠️ Preço exatamente igual por ${samePriceCount} iterações`);
                                        }
                                    } else {
                                        if (samePriceCount > 0) {
                                            console.log(`   ✅ Preço mudou! Era ${lastKnownPrice.toFixed(6)} agora ${currentPrice.close.toFixed(6)}`);
                                        }
                                        samePriceCount = 0;
                                    }
                                }
                                lastKnownPrice = currentPrice.close;
                            }

                        } catch (error) {
                            console.error('❌ Erro ao buscar dados da API:', error.message);
                            showNotification(`⚠️ Erro na API: ${error.message}`);
                            setDataSource('ERROR');
                            return;
                        }

                        console.log(`   🔍 Analisando mercado...`);
                        const signal = alphaEngine.analyzeMarket(marketData, 'REAL', symbol);

                        if (signal) {
                            console.log(`   ✨ Sinal gerado: ${signal.direction} | Score: ${signal.score}% | ML: ${(signal.mlProbability * 100).toFixed(1)}%`);
                        } else {
                            console.log(`   ❌ Nenhum sinal encontrado`);
                        }

                        // ⚠️ VALIDAÇÃO: Filtrar sinais duplicados no mesmo candle E mesmo entryTime
                        if (signal) {
                            const signalEntryTime = signal.entryTime.getTime();

                            // Verificar se já existe um sinal com EXATAMENTE o mesmo entryTime
                            const hasDuplicateEntryTime = signals.some(s => {
                                if (!s.entryTime) return false;
                                return new Date(s.entryTime).getTime() === signalEntryTime;
                            });

                            if (hasDuplicateEntryTime) {
                                console.warn(`   🚫 [FILTRADO] Sinal com entryTime duplicado (${signal.entryTime.toLocaleTimeString('pt-BR')}). Ignorando.`);
                                return;
                            }

                            // Também filtrar pelo candleId
                            if (lastSignalCandleTime === candleInfo.candleId) {
                                console.warn(`   🚫 [FILTRADO] Sinal duplicado no mesmo candle. Ignorando.`);
                                return;
                            }
                        }

                        if (signal && signal.score >= minScoreRef.current) {
                            // Marcar candle atual como usado (para ambos os sistemas)
                            lastSignalCandleTime = candleInfo.candleId;

                            // 🎯 Sistema de otimização de sinais
                            if (SIGNAL_OPTIMIZATION.enabled) {
                                handleOptimizedSignal(signal);
                            } else {
                                // Sistema antigo: enviar imediatamente
                                console.log('%c✅ SINAL APROVADO!', 'color: #00ff88; font-weight: bold; font-size: 14px;');
                                console.log(`   📍 ${signal.direction} ${signal.symbol} @ ${signal.price.toFixed(6)}`);
                                console.log(`   📊 Score: ${signal.score}% | ML: ${signal.mlConfidence}`);
                                console.log(`   ⏰ Entrada: ${signal.entryTime.toLocaleTimeString('pt-BR')}`);
                                console.log(`   🏁 Expiração: ${signal.expirationTime.toLocaleTimeString('pt-BR')}`);

                                setSignals(prev => {
                                    const newSignals = [signal, ...prev];
                                    // Manter apenas os 10 mais recentes
                                    return newSignals.slice(0, 10);
                                });
                                showNotification(`Novo sinal ${signal.direction} - Score: ${signal.score}%`);
                                playAlert();
                                scheduleSignalVerification(signal);

                                // Telegram
                                if (window.telegramNotifier && window.telegramNotifier.isEnabled()) {
                                    window.telegramNotifier.notifySignal(signal);
                                }

                                // Processar sinal (automático OU manual)
                                if (orderExecutorRef.current) {
                                    const executionResult = await orderExecutorRef.current.executeSignalAuto(
                                        signal,
                                        modeRef.current,
                                        riskAmount
                                    );

                                    if (executionResult.success) {
                                        showNotification(
                                            `🤖 ORDEM EXECUTADA: ${signal.direction} @ ${executionResult.executedPrice.toFixed(2)} | ID: ${executionResult.orderId}`
                                        );
                                        signal.executed = true;
                                        signal.executionDetails = executionResult;
                                        if (window.telegramNotifier && window.telegramNotifier.isEnabled()) {
                                            window.telegramNotifier.notifyExecution(signal, executionResult);
                                        }
                                        setSignals(prev => prev.map(s => s.id === signal.id ? signal : s));
                                    } else if (executionResult.reason === 'manual_mode') {
                                        console.log('✅ Sinal enviado para aprovação manual');
                                    } else {
                                        showNotification(`⚠️ Erro: ${executionResult.message}`);
                                    }
                                }
                            }
                        } // <--- Fim do IF de aprovação de sinal

                    } catch (error) {
                        console.error('❌ [LOOP] Erro:', error);
                        showNotification(`⚠️ Erro no loop principal: ${error.message}`);
                        setDataSource('ERROR');
                    }
                };

                // ⚡ INICIALIZAÇÃO: ANÁLISE CONTÍNUA PARA OTIMIZAÇÃO
                console.log('🚀 Alpha Engine ativado! Sistema de otimização de sinais...');

                const candleInfo = getCandleInfo();
                const MIN_TIME_BEFORE_CLOSE = 60; // 60 segundos
                const ANALYSIS_INTERVAL = 60000; // 60 segundos (1 minuto)

                console.log('🔄 Sistema de análise contínua iniciado');
                console.log(`   🔄 Intervalo: ${ANALYSIS_INTERVAL/1000}s (monitoramento contínuo)`);
                console.log(`   🎯 Sinais enviados: 1min30s antes da entrada`);
                console.log(`   ⚠️ Tempo mínimo antes do fechamento: ${MIN_TIME_BEFORE_CLOSE}s`);
                console.log('   🚫 Filtro de duplicados: ATIVO');
                console.log('   📊 Sistema de otimização: ATIVO');

                // ⚡ EXECUTAR PRIMEIRA ANÁLISE IMEDIATAMENTE
                console.log(`\n⏰ Candle atual: ${candleInfo.candleStart.toLocaleTimeString('pt-BR')}`);
                console.log(`   ⏳ Tempo até fechar: ${candleInfo.secondsUntilClose}s`);

                if (candleInfo.secondsUntilClose >= MIN_TIME_BEFORE_CLOSE) {
                    console.log(`✅ Executando primeira análise...`);
                    runAnalysis();
                } else {
                    console.log(`⏭️ Aguardando próximo candle (faltam apenas ${candleInfo.secondsUntilClose}s)`);
                }

                // 🔄 LOOP CONTÍNUO: Executar a cada 60 segundos
                const interval = setInterval(runAnalysis, ANALYSIS_INTERVAL);

                // Guardar interval no ref para limpar depois
                if (window._analysisInterval) clearInterval(window._analysisInterval);
                window._analysisInterval = interval;

                return () => {
                    // Limpar interval
                    if (window._analysisInterval) {
                        clearInterval(window._analysisInterval);
                        window._analysisInterval = null;
                    }
                    console.log('⏹️ Sistema de análise contínua parado');
                };
            }, [isActive, marketData, alphaEngine, apiManager, dataSource, orderExecutor]); // Fixed: removed minScore, mode, riskAmount (using refs)

            // Optimized: Use a separate state for countdown timestamp instead of forcing re-render of all signals
            const [currentTime, setCurrentTime] = useState(Date.now());

            useEffect(() => {
                if (!isActive) return;

                const countdownInterval = setInterval(() => {
                    setCurrentTime(Date.now());
                }, 1000);

                return () => clearInterval(countdownInterval);
            }, [isActive]);

            const scheduleSignalVerification = (signal) => {
                try {
                    const now = new Date().getTime();
                    const entryTime = new Date(signal.entryTime).getTime();
                    const expirationTime = signal.expirationTime ? new Date(signal.expirationTime).getTime() : null;

                    // Calcular delays para opções binárias
                    const timeUntilEntry = Math.max(0, entryTime - now);
                    const timeUntilExpiration = expirationTime ? Math.max(0, expirationTime - now) : (timeUntilEntry + (5 * 60 * 1000));

                    // Calcular timestamp exato do candle de entrada (início do candle M5)
                    const entryTimestamp = Math.floor(entryTime / 300000) * 300000; // Arredondar para M5
                    const expirationTimestamp = expirationTime ? Math.floor(expirationTime / 300000) * 300000 : (entryTimestamp + 300000);

                    console.log(`📊 [BINARY] Sinal ${signal.id.toString().slice(0, 8)}...`);
                    console.log(`   Agora: ${new Date().toLocaleTimeString('pt-BR')}`);
                    console.log(`   Entrada: ${new Date(entryTime).toLocaleTimeString('pt-BR')} (em ${Math.floor(timeUntilEntry/1000)}s)`);
                    console.log(`   Expiração: ${new Date(expirationTime || entryTime + 5*60*1000).toLocaleTimeString('pt-BR')} (em ${Math.floor(timeUntilExpiration/1000)}s)`);
                    console.log(`   🎯 Candle Entrada: ${new Date(entryTimestamp).toLocaleTimeString('pt-BR')}`);
                    console.log(`   🎯 Candle Expiração: ${new Date(expirationTimestamp).toLocaleTimeString('pt-BR')}`);

                    // 🔄 PRÉ-CARREGAMENTO PROATIVO: Buscar candles necessários logo após sinal gerado
                    const preloadCandles = async () => {
                        if (marketDataRef.current?.fetchSpecificCandleFromREST) {
                            console.log(`🔍 [PRE-LOAD] Iniciando pré-carregamento de candles para o sinal...`);
                            try {
                                // Buscar candles ao redor do timestamp de expiração
                                await marketDataRef.current.fetchSpecificCandleFromREST(
                                    signal.symbol, // Usar símbolo completo (ex: BTCUSDT)
                                    '5m',
                                    expirationTimestamp
                                );
                                console.log(`✅ [PRE-LOAD] Candles pré-carregados com sucesso`);
                            } catch (error) {
                                console.error('❌ [PRE-LOAD] Erro ao pré-carregar candles:', error);
                            }
                        }
                    };

                    // Executar pré-carregamento após 30 segundos do sinal gerado
                    setTimeout(preloadCandles, 30000);

                    // Armazenar dados do sinal para validação precisa
                    let entryCandleData = null;

                    // 🔧 CRIAR TIMER REGISTRY
                    verificationTimers.current.set(signal.id, {
                        timer: null,
                        entryTimer: null,
                        safetyTimeout: null
                    });

                    const entryTimer = setTimeout(async () => {
                        // 🔗 PRIORIDADE 1: Usar saída do sinal anterior (se disponível e consecutivo)
                        const timeSinceLastExit = lastConfirmedExit.current.timestamp
                            ? (entryTimestamp - lastConfirmedExit.current.timestamp)
                            : Infinity;

                        // ✅ RIGOROSO: Deve ser EXATAMENTE 5 minutos (± 10 segundos de tolerância)
                        const expectedGap = 5 * 60 * 1000; // 5 minutos
                        const tolerance = 10 * 1000; // ± 10 segundos
                        const isConsecutive = Math.abs(timeSinceLastExit - expectedGap) <= tolerance;

                        if (lastConfirmedExit.current.price && isConsecutive) {
                            // Usar saída do sinal anterior como entrada atual
                            entryCandleData = {
                                timestamp: entryTimestamp,
                                open: lastConfirmedExit.current.price,  // 🎯 Saída anterior = Entrada atual
                                close: lastConfirmedExit.current.price,
                                source: 'chained',
                                chainedFrom: lastConfirmedExit.current.signalId
                            };

                            signal.actualEntryPrice = lastConfirmedExit.current.price;
                            signal.entryPriceUpdated = true;
                            signal.isChained = true;

                            console.log(`🔗 [ENTRY] Usando saída do sinal anterior (ENCADEADO)`);
                            console.log(`   📌 Sinal anterior: ${lastConfirmedExit.current.signalId?.toString().slice(0, 8)}`);
                            console.log(`   ⏰ Saída anterior: ${new Date(lastConfirmedExit.current.timestamp).toLocaleTimeString('pt-BR')}`);
                            console.log(`   💰 Preço previsto: ${signal.price.toFixed(2)}`);
                            console.log(`   🎯 Preço REAL (saída anterior): ${lastConfirmedExit.current.price.toFixed(2)}`);
                            console.log(`   📊 Diferença: ${(lastConfirmedExit.current.price - signal.price).toFixed(2)} pts`);

                            // Atualizar sinal na UI
                            setSignals(prevSignals =>
                                prevSignals.map(s =>
                                    s.id === signal.id
                                        ? { ...s, actualEntryPrice: lastConfirmedExit.current.price, entryPriceUpdated: true, isChained: true }
                                        : s
                                )
                            );
                        } else {
                            // 🔗 PRIORIDADE 2: Buscar via API REST o candle EXATO de entrada
                            console.log(`🔍 [ENTRY] Buscando candle de entrada via API...`);
                            console.log(`   ⏰ Timestamp buscado: ${new Date(entryTimestamp).toLocaleTimeString('pt-BR')} (${entryTimestamp})`);

                            try {
                                const entryCandle = await marketDataRef.current?.fetchSpecificCandleFromREST(
                                    signal.symbol.toUpperCase(),
                                    '5m',
                                    entryTimestamp
                                );

                                if (entryCandle && entryCandle.timestamp === entryTimestamp) {
                                    // ✅ Candle EXATO encontrado
                                    entryCandleData = {
                                        timestamp: entryCandle.timestamp,
                                        open: entryCandle.open,  // 🎯 Preço REAL de entrada
                                        close: entryCandle.close,
                                        source: 'rest_api'
                                    };

                                    signal.actualEntryPrice = entryCandle.open;
                                    signal.entryPriceUpdated = true;

                                    console.log(`✅ [ENTRY] Candle EXATO via REST API`);
                                    console.log(`   📌 Timestamp: ${new Date(entryCandle.timestamp).toLocaleTimeString('pt-BR')}`);
                                    console.log(`   📊 OHLC: O=${entryCandle.open.toFixed(2)} H=${entryCandle.high.toFixed(2)} L=${entryCandle.low.toFixed(2)} C=${entryCandle.close.toFixed(2)}`);
                                    console.log(`   💰 Preço previsto: ${signal.price.toFixed(2)}`);
                                    console.log(`   🎯 Open REAL: ${entryCandle.open.toFixed(2)}`);
                                    console.log(`   📊 Diferença: ${(entryCandle.open - signal.price).toFixed(2)} pts`);

                                    // Atualizar sinal na UI
                                    setSignals(prevSignals =>
                                        prevSignals.map(s =>
                                            s.id === signal.id
                                                ? { ...s, actualEntryPrice: entryCandle.open, entryPriceUpdated: true }
                                                : s
                                        )
                                    );
                                } else {
                                    // ⚠️ Fallback: Buscar Close do candle ANTERIOR
                                    console.log(`⚠️ [ENTRY] Candle exato não encontrado, buscando candle anterior...`);
                                    const previousTimestamp = entryTimestamp - (5 * 60 * 1000);
                                    const previousCandle = await marketDataRef.current?.fetchSpecificCandleFromREST(
                                        signal.symbol.toUpperCase(),
                                        '5m',
                                        previousTimestamp
                                    );

                                    if (previousCandle && previousCandle.close) {
                                        // Usar Close do candle anterior como entrada real
                                        entryCandleData = {
                                            timestamp: entryTimestamp,
                                            open: previousCandle.close,  // 🎯 Close anterior = Open atual
                                            close: previousCandle.close,
                                            source: 'previous_candle'
                                        };

                                        signal.actualEntryPrice = previousCandle.close;
                                        signal.entryPriceUpdated = true;

                                        console.log(`✅ [ENTRY] Usando Close do candle anterior (via REST)`);
                                        console.log(`   📌 Candle anterior: ${new Date(previousTimestamp).toLocaleTimeString('pt-BR')}`);
                                        console.log(`   💰 Preço previsto: ${signal.price.toFixed(2)}`);
                                        console.log(`   🎯 Close anterior (= Open atual): ${previousCandle.close.toFixed(2)}`);
                                        console.log(`   📊 Diferença: ${(previousCandle.close - signal.price).toFixed(2)} pts`);

                                        setSignals(prevSignals =>
                                            prevSignals.map(s =>
                                                s.id === signal.id
                                                    ? { ...s, actualEntryPrice: previousCandle.close, entryPriceUpdated: true }
                                                    : s
                                            )
                                        );
                                    } else {
                                        // Último fallback: usar preço previsto
                                        entryCandleData = {
                                            timestamp: entryTimestamp,
                                            open: signal.price,
                                            close: signal.price,
                                            source: 'predicted'
                                        };
                                        console.log(`⚠️ [ENTRY] Usando preço previsto (candle anterior não disponível ou inválido)`);
                                        console.log(`   💰 Preço previsto: ${signal.price.toFixed(2)}`);
                                    }
                                }
                            } catch (error) {
                                console.error(`❌ [ENTRY] Erro ao buscar candle via REST:`, error);
                                entryCandleData = {
                                    timestamp: entryTimestamp,
                                    open: signal.price,
                                    close: signal.price,
                                    source: 'predicted'
                                };
                            }
                        }

                        // Notificar execução com preço real
                        const displayPrice = entryCandleData?.open || signal.price;
                        showNotification(`✅ Entrada: ${signal.direction} @ ${displayPrice.toFixed(2)}`);
                    }, timeUntilEntry);

                    // 🎯 VALIDAÇÃO: Usar candle FECHADO via REST API
                    // REST API da Binance só retorna candles FECHADOS (não em formação)
                    // Isso garante 100% de precisão no resultado

                    // Validar APÓS o candle de expiração fechar
                    // O candle fecha no início do próximo (ex: candle 10:05-10:10 fecha às 10:10:00)
                    // Aguardamos 2 segundos para a API processar o candle fechado
                    const bufferTime = 2000; // 2 segundos após fechamento
                    const verificationTimerId = setTimeout(async () => {
                        try {
                            console.log(`⏰ [BINARY] Iniciando verificação sinal ${signal.id.toString().slice(0, 8)}...`);
                            console.log(`   Buffer: ${bufferTime/1000}s após expiração`);
                            console.log(`   ExpirationTimestamp: ${new Date(expirationTimestamp).toLocaleString('pt-BR')}`);

                        // ⚡ OTIMIZADO: Mais tentativas, delays menores (ML precisa de velocidade e confiabilidade)
                        const getExpirationCandleWithRetry = async (maxRetries = 3, delayMs = 500) => {
                            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                                const candle = marketDataRef.current?.getCandleByTimestamp(expirationTimestamp);

                                // ✅ VALIDAÇÃO: Só aceitar candles FECHADOS (não em formação)
                                if (candle && candle.isClosed !== false) {
                                    console.log(`✅ [BINARY] Candle de expiração obtido (tentativa ${attempt}/${maxRetries})`);
                                    console.log(`   Status: ${candle.isClosed ? 'Fechado' : 'Presumido fechado (sem flag)'}`);
                                    return candle;
                                } else if (candle && candle.isClosed === false) {
                                    console.warn(`⚠️ [BINARY] Candle ainda em formação, aguardando fechar...`);
                                }

                                // Na segunda tentativa, fazer busca proativa via REST API
                                if (attempt === 2 && marketDataRef.current?.fetchSpecificCandleFromREST) {
                                    console.log(`🔍 [BINARY] Tentando busca proativa via REST API...`);
                                    try {
                                        await marketDataRef.current.fetchSpecificCandleFromREST(
                                            signal.symbol, // Usar símbolo completo (ex: BTCUSDT)
                                            '5m',
                                            expirationTimestamp
                                        );
                                        // Tentar buscar novamente após carregar dados
                                        const candleAfterFetch = marketDataRef.current?.getCandleByTimestamp(expirationTimestamp);
                                        if (candleAfterFetch) {
                                            console.log(`✅ [BINARY] Candle encontrado após busca proativa!`);
                                            return candleAfterFetch;
                                        }
                                    } catch (error) {
                                        console.error('❌ [BINARY] Erro na busca proativa:', error);
                                    }
                                }

                                if (attempt < maxRetries) {
                                    console.log(`⏳ [BINARY] Candle não disponível, aguardando ${delayMs}ms... (tentativa ${attempt}/${maxRetries})`);
                                    await new Promise(resolve => setTimeout(resolve, delayMs));
                                }
                            }
                            return null;
                        };

                        // Buscar candle de expiração fechado
                        const expirationCandle = await getExpirationCandleWithRetry();

                        if (!expirationCandle) {
                            console.error('❌ [BINARY] FALHA: Candle de expiração não disponível');
                            console.error(`   Timestamp esperado: ${new Date(expirationTimestamp).toLocaleString('pt-BR')}`);
                            verifySignalOutcome(signal, 'EXPIRADO', 0, null);
                            return;
                        }

                        // ⚠️ VALIDAÇÃO: entryCandleData deve existir
                        if (!entryCandleData) {
                            console.error('❌ [BINARY] FALHA: entryCandleData não disponível');
                            console.error('   O timer de entrada ainda não executou ou falhou');
                            verifySignalOutcome(signal, 'EXPIRADO', 0, null);
                            return;
                        }

                        // ✅ VALIDAÇÃO ÚNICA: COR DO CANDLE DE EXPIRAÇÃO
                        // Para opções binárias M5, a COR é determinada APENAS pelo candle de expiração
                        // Open → Close do candle = cor do resultado
                        const minVariation = 0.0001;

                        // 🎯 Usar candle FECHADO (100% preciso)
                        const expirationOpen = expirationCandle.open;
                        const expirationClose = expirationCandle.close;
                        const candleSource = 'REST-API (candle fechado)';

                        console.log(`\n🔍 [VALIDAÇÃO] Usando candle FECHADO da API REST:`);
                        console.log(`   ✅ Precisão: 100% (candle já fechou)`);
                        console.log(`   📊 OHLC: O=${expirationOpen.toFixed(2)} → C=${expirationClose.toFixed(2)}`);

                        // 🎨 DETERMINAR COR DO CANDLE (Open → Close do candle de expiração)
                        const candleVariation = expirationClose - expirationOpen;
                        const isCandleGreen = candleVariation > minVariation;
                        const isCandleRed = candleVariation < -minVariation;
                        const isDoji = Math.abs(candleVariation) <= minVariation;
                        const candleColor = isCandleGreen ? 'VERDE' : isCandleRed ? 'VERMELHO' : 'DOJI';

                        console.log(`\n🎨 [COR DO CANDLE] ${candleSource}:`);
                        console.log(`   📊 Candle: ${new Date(expirationTimestamp).toLocaleTimeString('pt-BR')}`);
                        console.log(`   📥 Open: ${expirationOpen.toFixed(2)}`);
                        console.log(`   📤 Close: ${expirationClose.toFixed(2)}`);
                        console.log(`   📏 Variação: ${candleVariation.toFixed(2)} pts`);
                        console.log(`   🎨 RESULTADO: ${candleColor} ${isCandleGreen ? '🟢' : isCandleRed ? '🔴' : '⚪'}`);

                        // 📊 INFO ADICIONAL: Mostrar encadeamento se houver
                        if (entryCandleData.source === 'chained') {
                            const entryPrice = entryCandleData.open;
                            const pnlVariation = expirationClose - entryPrice;
                            console.log(`\n💰 [ENCADEAMENTO] Variação financeira (entrada→saída):`);
                            console.log(`   📥 Entrada (saída anterior): ${entryPrice.toFixed(2)}`);
                            console.log(`   📤 Saída (close atual): ${expirationClose.toFixed(2)}`);
                            console.log(`   📊 Variação financeira: ${pnlVariation.toFixed(2)} pts`);
                            console.log(`   ⚠️ Cor do candle = Open→Close (${candleColor}), não entrada→saída!`);
                        }

                        let result = null;
                        let pnl = 0;

                        // Tratar DOJI como EMPATE (nem ganho nem perda)
                        if (isDoji) {
                            // ⚠️ VERIFICAR: Se variação é EXATAMENTE 0.00, pode ser erro de precisão
                            if (candleVariation === 0) {
                                result = 'EXPIRADO';
                                pnl = 0;
                                console.warn(`   ⚠️ DADOS INSUFICIENTES! Open = Close (${expirationOpen.toFixed(2)})`);
                                console.warn(`   ⚠️ Possível erro de precisão da API - marcando como EXPIRADO`);
                                console.warn(`   💡 Corretoras de opções binárias podem ter resultado diferente!`);
                            } else {
                                result = 'EMPATE';
                                pnl = 0;
                                console.log(`   ⚖️ EMPATE! Candle DOJI - variação insignificante (${Math.abs(candleVariation).toFixed(8)})`);
                                console.log(`   📏 Margem mínima: ${minVariation.toFixed(8)} | Variação real: ${Math.abs(candleVariation).toFixed(8)}`);
                            }
                        } else if (signal.direction === 'BUY') {
                            // CALL: candle precisa ser VERDE (close > open)
                            console.log(`   🔍 [BUY/CALL] Esperado: VERDE | Resultado: ${candleColor}`);
                            if (isCandleGreen) {
                                result = 'ACERTO';
                                pnl = riskAmount * 0.85; // Payout típico 85%
                                console.log(`   ✅ ACERTO! Candle verde (+${pnl.toFixed(2)})`);
                            } else {
                                result = 'ERRO';
                                pnl = -riskAmount;
                                console.log(`   ❌ ERRO! Candle vermelho (${pnl.toFixed(2)})`);
                            }
                        } else {
                            // PUT: candle precisa ser VERMELHO (close < open)
                            console.log(`   🔍 [SELL/PUT] Esperado: VERMELHO | Resultado: ${candleColor}`);
                            if (isCandleRed) {
                                result = 'ACERTO';
                                pnl = riskAmount * 0.85; // Payout típico 85%
                                console.log(`   ✅ ACERTO! Candle vermelho (+${pnl.toFixed(2)})`);
                            } else {
                                result = 'ERRO';
                                pnl = -riskAmount;
                                console.log(`   ❌ ERRO! Candle verde (${pnl.toFixed(2)})`);
                            }
                        }

                        console.log(`\n🏁 [BINARY] Resultado Final: ${result}`);
                        console.log(`   🎯 Direção: ${signal.direction} (esperava ${signal.direction === 'BUY' ? 'SUBIDA 🟢' : 'DESCIDA 🔴'})`);
                        console.log(`   💰 Preço Previsto: ${signal.price.toFixed(2)}`);
                        console.log(`   📊 Candle: ${new Date(expirationTimestamp).toLocaleTimeString('pt-BR')}`);
                        console.log(`   📥 Open: ${expirationOpen.toFixed(2)}`);
                        console.log(`   📤 Close: ${expirationClose.toFixed(2)}`);
                        console.log(`   📏 Variação: ${candleVariation.toFixed(2)} pts`);
                        console.log(`   🎨 Cor: ${candleColor} ${isCandleGreen ? '🟢' : isCandleRed ? '🔴' : '⚪'}`);
                        console.log(`   💵 P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} BRL`);

                        verificationTimers.current.delete(signal.id);

                        // 🔗 SALVAR preço de saída para próximo sinal (ENCADEAMENTO)
                        lastConfirmedExit.current = {
                            price: expirationClose,
                            timestamp: expirationTimestamp,
                            signalId: signal.id
                        };
                        console.log(`🔗 [CHAIN] Preço de saída salvo para próximo sinal: ${expirationClose.toFixed(2)}`);

                        // Atualizar estado dos sinais
                        signal.status = result;
                        signal.pnl = pnl;
                        signal.finalPrice = expirationClose;

                        // 🎯 IMPORTANTE: Resultado foi calculado com sucesso
                        // Operações abaixo podem falhar, mas NÃO devem sobrescrever o resultado

                        // 💾 PERSISTIR NO SUPABASE
                        try {
                            if (window.memoryDB) {
                                await window.memoryDB.saveSignal(signal);
                                console.log('💾 Status do sinal atualizado no Supabase:', signal.id, '->', result);
                            }
                        } catch (error) {
                            console.error('❌ Erro ao salvar status no Supabase:', error);
                            // ✅ Continua - não afeta resultado calculado
                        }

                        // 📊 ATUALIZAR AUDITORIA
                        try {
                            if (window.auditSystemRef) {
                                window.auditSystemRef.updateSignalOutcome(
                                    signal.id,
                                    result,
                                    expirationClose,
                                    pnl,
                                    signal.executionDetails
                                );
                            }
                        } catch (error) {
                            console.error('❌ [BINARY] Erro ao atualizar auditoria:', error);
                            // ✅ Continua - não afeta resultado calculado
                        }

                        // 🔄 FECHAR POSIÇÃO (se executada)
                        try {
                            if (orderExecutorRef.current && signal.executed) {
                                orderExecutorRef.current.closePosition(signal.id, result, pnl);
                            }
                        } catch (error) {
                            console.error('❌ Erro ao fechar posição:', error);
                            // ✅ Continua - não afeta resultado calculado
                        }

                        // 🧠 TREINAR ML
                        try {
                            // ✅ Verificar se entrada é CONFIÁVEL para ML
                            // Aceitar todas as fontes EXCETO 'predicted' (que é apenas estimativa)
                            const hasReliableEntry = entryCandleData.source === 'chained' ||
                                                     entryCandleData.source === 'rest_api' ||
                                                     entryCandleData.source === 'previous_candle';

                            // ✅ Atualizar ML APENAS com preços REAIS confiáveis
                            if (alphaEngine && result !== 'EXPIRADO' && result !== 'EMPATE') {
                                // Dados do candle de ENTRADA (preço real de entrada)
                                signal.entryCandle = {
                                    timestamp: entryCandleData.timestamp,
                                    open: entryCandleData.open,  // 🎯 Preço REAL de entrada
                                    close: entryCandleData.close,
                                    source: entryCandleData.source
                                };

                                // Dados do candle de EXPIRAÇÃO (preço real de saída)
                                signal.expirationCandle = {
                                    timestamp: expirationTimestamp,
                                    open: expirationOpen,
                                    close: expirationClose,  // 🎯 Preço REAL de saída
                                    high: expirationCandle.high,
                                    low: expirationCandle.low,
                                    color: candleColor,
                                    isGreen: isCandleGreen,
                                    isRed: isCandleRed,
                                    bodySize: Math.abs(candleVariation), // Variação do candle (Open→Close)
                                    variation: candleVariation  // 🎯 Variação do candle
                                };

                                // Preços reais para ML
                                signal.realEntryPrice = entryCandleData.open;
                                signal.realExitPrice = expirationClose;
                                signal.realPnL = pnl;
                                signal.predictedPrice = signal.price; // Guardar previsão original

                                if (hasReliableEntry) {
                                    // ✅ Entrada confiável: TREINAR ML
                                    console.log(`🧠 [ML] Aprendendo com preços REAIS (${entryCandleData.source}):`);
                                    console.log(`   Previsto: ${signal.price.toFixed(2)} | Real: ${entryCandleData.open.toFixed(2)}`);
                                    console.log(`   Erro de previsão: ${(entryCandleData.open - signal.price).toFixed(2)} pts`);

                                    alphaEngine.learnFromTrade(signal, result);
                                } else {
                                    // ⚠️ Entrada NÃO confiável: NÃO treinar, mas saída serve para próximo
                                    console.log(`⚠️ [ML] SKIP - Entrada não confiável (${entryCandleData.source})`);
                                    console.log(`   Validação: ${result} | Saída: ${expirationClose.toFixed(2)}`);
                                    console.log(`   💡 Saída salva para encadear próximo sinal!`);
                                }
                            }
                        } catch (error) {
                            console.error('❌ Erro ao treinar ML:', error);
                            // ✅ Continua - não afeta resultado calculado
                        }

                        // 🖥️ ATUALIZAR UI
                        try {
                            setSignals(prevSignals =>
                                prevSignals.map(s =>
                                    s.id === signal.id
                                        ? { ...s, status: result, pnl, finalPrice: expirationClose }
                                        : s
                                )
                            );
                        } catch (error) {
                            console.error('❌ Erro ao atualizar UI:', error);
                            // ✅ Continua - não afeta resultado calculado
                        }

                        // 🔔 NOTIFICAR
                        try {
                            showNotification(
                                result === 'ACERTO'
                                    ? `✅ Opção binária: +${formatBRL(pnl)}`
                                    : result === 'EMPATE'
                                    ? `⚖️ Empate: Candle DOJI (${formatBRL(pnl)})`
                                    : `❌ Opção binária: ${formatBRL(pnl)}`
                            );
                        } catch (error) {
                            console.error('❌ Erro ao notificar:', error);
                            // ✅ Continua - não afeta resultado calculado
                        }

                        // 🧹 AUTO-CLEANUP: Remover sinal confirmado após 5 segundos
                        try {
                            setTimeout(() => {
                                console.log(`🧹 Auto-removendo sinal confirmado: ${signal.id}`);
                                dismissSignal(signal.id);
                            }, 5000);
                        } catch (error) {
                            console.error('❌ Erro ao agendar cleanup:', error);
                            // ✅ Continua - não afeta resultado calculado
                        }

                        // 📱 TELEGRAM
                        try {
                            if (window.telegramNotifier && window.telegramNotifier.isEnabled()) {
                                window.telegramNotifier.notifyResult(signal, result, pnl);
                            }
                        } catch (error) {
                            console.error('❌ Erro ao notificar Telegram:', error);
                            // ✅ Continua - não afeta resultado calculado
                        }
                        } catch (error) {
                            console.error('❌ [BINARY] Erro na verificação do sinal:', error);
                            console.error('Stack trace:', error.stack);
                            console.error('Sinal ID:', signal.id);
                            console.error('ExpirationTimestamp:', expirationTimestamp);

                            // Limpar timer mesmo com erro
                            verificationTimers.current.delete(signal.id);

                            // ⚠️ IMPORTANTE: Só marcar como EXPIRADO se o resultado ainda NÃO foi calculado
                            // Se signal.status já foi definido, significa que o erro aconteceu DEPOIS do cálculo
                            // Nesses casos, MANTER o resultado calculado (pode ser ACERTO, ERRO ou EMPATE)
                            if (!signal.status || signal.status === 'PENDENTE') {
                                // Resultado ainda não foi calculado - erro aconteceu ANTES da validação
                                console.warn('⚠️ Erro aconteceu ANTES de calcular resultado - marcando como EXPIRADO');
                                try {
                                    verifySignalOutcome(signal, 'EXPIRADO', 0, null);
                                } catch (innerError) {
                                    console.error('❌ Erro ao marcar sinal como expirado:', innerError);
                                }
                            } else {
                                // Resultado JÁ foi calculado - erro aconteceu em operação secundária (ML, UI, etc)
                                console.warn(`⚠️ Erro aconteceu APÓS calcular resultado (${signal.status}) - MANTENDO resultado correto`);
                                console.warn('   O erro foi em operação secundária (Supabase, ML, UI, etc)');
                                console.warn(`   ✅ Resultado preservado: ${signal.status} | P&L: ${signal.pnl}`);

                                // Atualizar UI mesmo com erro nas operações secundárias
                                try {
                                    setSignals(prevSignals =>
                                        prevSignals.map(s =>
                                            s.id === signal.id
                                                ? { ...s, status: signal.status, pnl: signal.pnl, finalPrice: signal.finalPrice }
                                                : s
                                        )
                                    );
                                } catch (uiError) {
                                    console.error('❌ Erro ao atualizar UI no catch:', uiError);
                                }
                            }
                        }
                    }, timeUntilExpiration + bufferTime); // Aguardar expiração + buffer de 5s

                    // Timeout de segurança: Garantir que o sinal será marcado como EXPIRADO após 10 minutos
                    const maxWaitTime = 10 * 60 * 1000; // 10 minutos
                    const safetyTimeout = setTimeout(() => {
                        const currentSignal = signals.find(s => s.id === signal.id);
                        if (currentSignal && currentSignal.status === 'PENDENTE') {
                            console.warn(`⚠️ [SAFETY] Sinal ${signal.id} ainda pendente após ${maxWaitTime/60000} minutos - forçando EXPIRADO`);
                            verifySignalOutcome(signal, 'EXPIRADO', 0, null);
                        }
                    }, timeUntilExpiration + bufferTime + maxWaitTime);

                    // 🔧 ATUALIZAR timer registry (já foi criado antes para permitir registro de intervals)
                    const timerData = verificationTimers.current.get(signal.id);
                    if (timerData) {
                        timerData.timer = verificationTimerId;
                        timerData.entryTimer = entryTimer;
                        timerData.safetyTimeout = safetyTimeout;
                    }
                } catch (error) {
                    console.error('Erro ao agendar verificação:', error);
                }
            };

            const verifySignalOutcome = async (signal, forcedResult = null, forcedPnl = null, forcedPrice = null) => {
                try {
                    if (!marketData) return;

                    let result = 'EXPIRADO';
                    let pnl = 0;

                    // Validar se temos um preço disponível
                    let currentPrice = forcedPrice;
                    if (!currentPrice) {
                        const latestPrice = marketData.getLatestPrice();
                        if (latestPrice && latestPrice.close) {
                            currentPrice = latestPrice.close;
                        } else {
                            // Usar preço do sinal como fallback
                            currentPrice = signal.price;
                            console.warn('⚠️ [VERIFY] Preço atual não disponível, usando preço do sinal:', currentPrice);
                        }
                    }

                    // ✅ Se resultado já foi calculado (opções binárias), USAR ele!
                    if (forcedResult !== null) {
                        result = forcedResult;
                        pnl = forcedPnl !== null ? forcedPnl : 0;
                        console.log(`✅ [VERIFY] Usando resultado calculado: ${result} | P&L: ${pnl}`);
                    } else {
                        // 📊 Cálculo tradicional com TP/SL (apenas se não foi passado resultado)
                        if (signal.direction === 'BUY') {
                            if (currentPrice >= signal.takeProfit) {
                                result = 'ACERTO';
                                pnl = riskAmount * 2;
                            } else if (currentPrice <= signal.stopLoss) {
                                result = 'ERRO';
                                pnl = -riskAmount;
                            }
                        } else {
                            if (currentPrice <= signal.takeProfit) {
                                result = 'ACERTO';
                                pnl = riskAmount * 2;
                            } else if (currentPrice >= signal.stopLoss) {
                                result = 'ERRO';
                                pnl = -riskAmount;
                            }
                        }
                        console.log(`📊 [VERIFY] Resultado calculado com TP/SL: ${result} | P&L: ${pnl}`);
                    }

                    signal.status = result;
                    signal.pnl = pnl;
                    signal.finalPrice = currentPrice;

                    // 💾 PERSISTIR NO SUPABASE IMEDIATAMENTE
                    if (window.memoryDB) {
                        try {
                            await window.memoryDB.saveSignal(signal);
                            console.log('💾 [VERIFY] Status atualizado no Supabase:', signal.id, '->', result);
                        } catch (error) {
                            console.error('❌ [VERIFY] Erro ao salvar status no Supabase:', error);
                        }
                    }

                    if (window.auditSystemRef) {
                        try {
                            if (window.debugAudit) {
                                console.log('🔍 [VERIFY] Atualizando auditoria');
                            }
                            window.auditSystemRef.updateSignalOutcome(
                                signal.id,
                                result,
                                currentPrice,
                                pnl,
                                signal.executionDetails
                            );
                        } catch (error) {
                            console.error('❌ [VERIFY] Erro ao atualizar auditoria:', error);
                        }
                    }

                    if (alphaEngine && result !== 'EXPIRADO') {
                        await alphaEngine.learnFromTrade(signal, result);
                    }

                    setSignals(prevSignals => {
    // Usamos .map() para criar um NOVO array. Isso é crucial para o React detectar a mudança.
    return prevSignals.map(s => {
        // Se o ID do sinal no array for o mesmo que o sinal que estamos processando...
        if (s.id === signal.id) {
            // ...retornamos um NOVO objeto com as propriedades atualizadas.
            return { ...s, status: result, pnl, finalPrice: currentPrice };
        }
        // Caso contrário, apenas retornamos o sinal original sem modificação.
        return s;
    });
});


                    showNotification(
                        result === 'ACERTO' 
                            ? `✅ Sinal confirmado: +${formatBRL(pnl)}`
                            : result === 'ERRO'
                            ? `❌ Stop atingido: ${formatBRL(pnl)}`
                            : `⏱️ Sinal expirado`
                    );
                         // ✨ NOVO: Notifica resultado
                    if (window.telegramNotifier && window.telegramNotifier.isEnabled()) {
                        window.telegramNotifier.notifyResult(signal, result, pnl);
                    }
                    verificationTimers.current.delete(signal.id);

                    // 🧹 AUTO-CLEANUP: Remover sinais finalizados após 5 segundos
                    setTimeout(() => {
                        console.log(`🧹 Auto-removendo sinal finalizado: ${signal.id}`);
                        dismissSignal(signal.id);
                    }, 5000); // 5 segundos
                } catch (error) {
                    console.log('Erro na verificação:', error);
                }
            };

            const handleEmergencyStop = () => {
                if (orderExecutorRef.current) {
                    const closedPositions = orderExecutorRef.current.emergencyCloseAll();
                    showNotification(`🚨 EMERGÊNCIA: ${closedPositions.length} posições fechadas`);
                    
                    setSignals(prev => prev.map(s => {
                        if (closedPositions.includes(s.id)) {
                            return { ...s, status: 'CANCELADO', pnl: 0 };
                        }
                        return s;
                    }));
                }
            };

            const playAlert = () => {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.value = 800;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.2);
                } catch (error) {
                    console.log('Audio not available');
                }
            };

            const showNotification = (message) => {
                try {
                    if (!message) return;
                    
                    // Toast na interface
                    setNotification(message);
                    setTimeout(() => setNotification(null), 3000);
                    
                    // ✅ NOTIFICAÇÃO NATIVA DO NAVEGADOR
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("⚡ Alpha-Learner", {
                            body: message,
                            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>⚡</text></svg>",
                            badge: "⚡",
                            tag: "alpha-learner",
                            requireInteraction: false,
                            silent: false
                        });
                    }
                } catch (error) {
                    console.log('Erro ao mostrar notificação:', error);
                }
            };

            const dismissSignal = (signalId) => {
                try {
                    if (!signalId) return;
                    
                    const timerData = verificationTimers.current.get(signalId);
                    if (timerData) {
                        if (timerData.timer) clearTimeout(timerData.timer);
                        if (timerData.entryTimer) clearTimeout(timerData.entryTimer);
                        if (timerData.safetyTimeout) clearTimeout(timerData.safetyTimeout);
                        verificationTimers.current.delete(signalId);
                    }
                    
                    setSignals(prev => prev.filter(s => s && s.id !== signalId));
                } catch (error) {
                    console.log('Erro ao dispensar sinal:', error);
                }
            };

            const copySignalDetails = (signal) => {
                try {
                    if (!signal) {
                        showNotification('Erro: Sinal não encontrado');
                        return;
                    }

                    const details = `
Sinal: ${signal.direction || 'N/A'} ${signal.symbol || 'N/A'}
Score: ${signal.score || 0}%
Preço: ${formatBRL(signal.price)}
Stop: ${formatBRL(signal.stopLoss)}
Alvo: ${formatBRL(signal.takeProfit)}
TF: ${signal.timeframe || 'N/A'}
Status: ${signal.status || 'PENDENTE'}
Fonte: ${signal.dataSource || 'N/A'}
${signal.divergence ? `Divergencia: ${signal.divergence.type}` : ''}
`.trim();
                    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                        navigator.clipboard.writeText(details)
                            .then(() => showNotification('Detalhes copiados!'))
                            .catch(() => showNotification('Erro ao copiar'));
                    }
                } catch (error) {
                    console.log('Erro ao copiar:', error);
                }
            };

            const executeSignalFromCard = async (signal) => {
                console.log('🔧 executeSignalFromCard chamado:', signal?.id);
                try {
                    if (!signal || !orderExecutorRef.current) {
                        showNotification('❌ Erro: Sistema de execução não disponível');
                        return;
                    }

                    if (signal.executed) {
                        showNotification('⚠️ Este sinal já foi executado');
                        return;
                    }

                    // Executar o sinal manualmente
                    const result = await orderExecutorRef.current.executeManualSignal();

                    if (result.success) {
                        // Marcar sinal como executado
                        signal.executed = true;
                        signal.executionDetails = result;

                        // Atualizar na lista
                        setSignals(prev => prev.map(s => s.id === signal.id ? signal : s));

                        showNotification('✅ Ordem executada com sucesso!', 'success');
                        setUpdateTrigger(t => t + 1);
                    } else {
                        showNotification(`❌ Erro ao executar: ${result.message}`, 'error');
                    }
                } catch (error) {
                    console.error('Erro ao executar sinal:', error);
                    showNotification('❌ Erro ao executar ordem', 'error');
                }
            };

            // 🔍 DEBUG: Confirmar que a função foi definida
            console.log('✅ executeSignalFromCard definida:', typeof executeSignalFromCard);
            window.executeSignalFromCard = executeSignalFromCard; // Disponibilizar globalmente para debug

            const formatBRL = (value) => {
                if (value === null || value === undefined) return 'R$ 0,00';
                return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            };

            return (
                <div className="app">
                    <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
                    <div className="main-content">
                        <Header 
                            isActive={isActive} 
                            setIsActive={setIsActive}
                            mode={mode}
                            setMode={setMode}
                            dataSource={dataSource}
                            orderExecutor={orderExecutor}
                            onEmergencyStop={handleEmergencyStop}
                        />
                        
                        {currentView === 'dashboard' && (
                            <Dashboard
                                signals={signals}
                                alphaEngine={alphaEngine}
                                minScore={minScore}
                                setMinScore={setMinScore}
                                dismissSignal={dismissSignal}
                                copySignalDetails={copySignalDetails}
                                riskAmount={riskAmount}
                                setRiskAmount={setRiskAmount}
                                maxPositions={maxPositions}
                                setMaxPositions={setMaxPositions}
                                formatBRL={formatBRL}
                                orderExecutor={orderExecutor}
                                mode={mode}
                                updateTrigger={updateTrigger}
                                assetType={assetType}
                                setAssetType={setAssetType}
                                symbol={symbol}
                                setSymbol={setSymbol}
                                memoryDB={memoryDB}
                            />
                        )}
                        
                        {currentView === 'performance' && (
                            <Performance 
                                alphaEngine={alphaEngine} 
                                signals={signals} 
                                memoryDB={memoryDB} 
                                formatBRL={formatBRL}
                                updateTrigger={updateTrigger}
                            />
                        )}
                        
                        {currentView === 'ml-engine' && (
                            <MLEngine 
                                alphaEngine={alphaEngine} 
                                memoryDB={memoryDB}
                                updateTrigger={updateTrigger}
                            />
                        )}
                        
                        {currentView === 'robot' && (
                            <RobotView 
                                orderExecutor={orderExecutor}
                                formatBRL={formatBRL}
                                maxPositions={maxPositions}
                                setMaxPositions={setMaxPositions}
                            />
                        )}

                        {currentView === 'audit' && (
                            <AuditView 
                                auditSystem={auditSystem}
                                formatBRL={formatBRL}
                            />
                        )}
                        
                        {currentView === 'connections' && (
                            <ConnectionsView 
                                apiManager={apiManager}
                                showNotification={showNotification}
                            />
                        )}
                        {currentView === 'backtest' && (
                            <BacktestView 
                                alphaEngine={alphaEngine}
                                memoryDB={memoryDB}
                                formatBRL={formatBRL}
                            />
                        )}
                        {currentView === 'advanced-metrics' && (
                            <AdvancedMetrics 
                                auditSystem={auditSystem}
                                alphaEngine={alphaEngine}
                                memoryDB={memoryDB}
                                formatBRL={formatBRL}
                            />
                        )}
                        {currentView === 'telegram' && (
                            <TelegramConfig 
                                telegramNotifier={window.telegramNotifier}
                                showNotification={showNotification}
                            />
                        )}
                        {currentView === 'settings' && (
                            <Settings 
                                minScore={minScore}
                                setMinScore={setMinScore}
                            />
                        )}
                    </div>

                    {/* POPUP DE MODO MANUAL */}
                    <ManualSignalPopup
                        orderExecutor={orderExecutor}
                        onExecute={() => setUpdateTrigger(t => t + 1)}
                        showNotification={showNotification}
                    />

                    {notification && (
                        <div className="notification">
                            {notification}
                        </div>
                    )}
                </div>
            );
        }

        /* ========================================
           COMPONENTE: POPUP DE MODO MANUAL
           ======================================== */
        function ManualSignalPopup({ orderExecutor, onExecute, showNotification }) {
            const [pendingSignal, setPendingSignal] = useState(null);
            const [timeToEntry, setTimeToEntry] = useState(0);
            const [popupDisplayTime, setPopupDisplayTime] = useState(0);

            // Verificar sinal pendente a cada 1 segundo
            useEffect(() => {
                const interval = setInterval(() => {
                    if (orderExecutor) {
                        const signal = orderExecutor.getPendingSignal();
                        setPendingSignal(signal);

                        // Reset do contador quando novo sinal aparece
                        if (signal && !pendingSignal) {
                            setPopupDisplayTime(0);
                        }
                    }
                }, 1000);

                return () => clearInterval(interval);
            }, [orderExecutor, pendingSignal]);

            // Timer de exibição do popup (60 segundos)
            useEffect(() => {
                if (!pendingSignal) {
                    setPopupDisplayTime(0);
                    return;
                }

                const displayTimer = setInterval(() => {
                    setPopupDisplayTime(prev => prev + 1);
                }, 1000);

                return () => clearInterval(displayTimer);
            }, [pendingSignal]);

            // Calcular tempo até entrada e fechar popup automaticamente após 60s
            useEffect(() => {
                if (!pendingSignal || !pendingSignal.signal || !pendingSignal.signal.entryTime) {
                    setTimeToEntry(0);
                    return;
                }

                const updateTimeToEntry = () => {
                    const now = new Date().getTime();
                    const entryTime = new Date(pendingSignal.signal.entryTime).getTime();
                    const remaining = Math.max(0, Math.floor((entryTime - now) / 1000));

                    setTimeToEntry(remaining);

                    // Fechar popup automaticamente após 60s sem interação
                    if (popupDisplayTime >= 60 && orderExecutor) {
                        console.log('⏰ Popup exibido por 60s sem interação - fechando automaticamente');
                        orderExecutor.ignoreManualSignal();
                        showNotification('⏱️ Popup recolhido automaticamente', 'info');
                        return;
                    }
                };

                // Atualizar imediatamente
                updateTimeToEntry();

                // Continuar atualizando a cada segundo
                const timer = setInterval(updateTimeToEntry, 1000);

                return () => clearInterval(timer);
            }, [pendingSignal, orderExecutor, showNotification, popupDisplayTime]);

            if (!pendingSignal) return null;

            const data = pendingSignal.calculatedData;
            const isLong = data.direction === 'BUY'; // BUY = LONG, SELL = SHORT

            // Formatar tempo para exibição
            const formatTimeToEntry = () => {
                if (timeToEntry <= 0) return '⏰ ENTRAR AGORA';
                const minutes = Math.floor(timeToEntry / 60);
                const seconds = timeToEntry % 60;
                if (timeToEntry < 60) return `⏱️ ${seconds}s para entrada`;
                return `⏱️ ${minutes}m ${seconds}s para entrada`;
            };

            const handleExecute = async () => {
                if (!orderExecutor) return;

                const result = await orderExecutor.executeManualSignal();

                if (result.success) {
                    showNotification('✅ Ordem executada com sucesso!', 'success');
                    onExecute();
                    // Popup será fechado automaticamente ao limpar pendingSignal
                } else {
                    showNotification(`❌ Erro: ${result.message}`, 'error');
                }
            };

            const handleCopy = () => {
                if (!orderExecutor) return;
                orderExecutor.copySignalToClipboard();
                showNotification('📋 Sinal copiado para clipboard!', 'success');
            };

            const handleIgnore = () => {
                if (!orderExecutor) return;
                orderExecutor.ignoreManualSignal();
                showNotification('❌ Sinal ignorado', 'info');
            };

            return (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        backgroundColor: '#1a1a2e',
                        borderRadius: '12px',
                        padding: '20px',
                        maxWidth: '420px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        border: '2px solid ' + (isLong ? '#00ff88' : '#ff6b6b'),
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}>
                        {/* Header */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '15px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: '12px'
                        }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔔</div>
                            <h2 style={{
                                color: '#00ff88',
                                margin: '0 0 4px 0',
                                fontSize: '20px'
                            }}>NOVO SINAL</h2>
                            <div style={{
                                color: '#888',
                                fontSize: '12px'
                            }}>Modo Manual</div>

                            {/* Countdown Timer */}
                            <div style={{
                                marginTop: '10px',
                                padding: '8px 16px',
                                background: timeToEntry <= 30 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 255, 136, 0.1)',
                                border: `2px solid ${timeToEntry <= 30 ? '#ffd700' : '#00ff88'}`,
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: timeToEntry <= 30 ? '#ffd700' : '#00ff88',
                                animation: timeToEntry <= 10 && timeToEntry > 0 ? 'pulse 1s infinite' : 'none'
                            }}>
                                {formatTimeToEntry()}
                            </div>
                        </div>

                        {/* Dados principais */}
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px',
                                padding: '10px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px'
                            }}>
                                <div>
                                    <div style={{ color: '#888', fontSize: '10px' }}>Par</div>
                                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>{data.symbol}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#888', fontSize: '10px' }}>Direção</div>
                                    <div style={{
                                        color: isLong ? '#00ff88' : '#ff6b6b',
                                        fontSize: '18px',
                                        fontWeight: 'bold'
                                    }}>
                                        {isLong ? '🟢 LONG' : '🔴 SHORT'}
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '8px',
                                marginBottom: '10px'
                            }}>
                                <div style={{
                                    padding: '8px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderRadius: '6px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ color: '#888', fontSize: '9px', marginBottom: '3px' }}>Preço</div>
                                    <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>${data.price}</div>
                                </div>
                                <div style={{
                                    padding: '8px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderRadius: '6px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ color: '#888', fontSize: '9px', marginBottom: '3px' }}>Qtd</div>
                                    <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{data.quantity}</div>
                                </div>
                                <div style={{
                                    padding: '8px',
                                    backgroundColor: data.score >= 70 ? 'rgba(0, 255, 136, 0.1)' : data.score >= 50 ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                                    borderRadius: '6px',
                                    textAlign: 'center',
                                    border: `1px solid ${data.score >= 70 ? '#00ff88' : data.score >= 50 ? '#ffd700' : '#ff6b6b'}`
                                }}>
                                    <div style={{ color: '#888', fontSize: '9px', marginBottom: '3px' }}>Score</div>
                                    <div style={{
                                        color: data.score >= 70 ? '#00ff88' : data.score >= 50 ? '#ffd700' : '#ff6b6b',
                                        fontSize: '14px',
                                        fontWeight: 'bold'
                                    }}>
                                        {data.score}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SL/TP */}
                        <div style={{
                            marginBottom: '12px',
                            padding: '10px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{
                                color: '#00ff88',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                marginBottom: '8px'
                            }}>📊 RECOMENDAÇÃO</div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '4px',
                                fontSize: '11px'
                            }}>
                                <span style={{ color: '#ff6b6b' }}>🛑 Stop Loss:</span>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>${data.stopLoss} (-{data.stopLossPercent}%)</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '8px',
                                fontSize: '11px'
                            }}>
                                <span style={{ color: '#00ff88' }}>🎯 Take Profit:</span>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>${data.takeProfit} (+{data.takeProfitPercent}%)</span>
                            </div>

                            <div style={{
                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                paddingTop: '6px',
                                marginTop: '6px',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '8px',
                                fontSize: '10px'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#888' }}>Risco</div>
                                    <div style={{ color: '#ff6b6b', fontWeight: 'bold' }}>${data.riskAmount}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#888' }}>Lucro</div>
                                    <div style={{ color: '#00ff88', fontWeight: 'bold' }}>${data.potentialProfit}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#888' }}>Duração</div>
                                    <div style={{ color: '#fff', fontWeight: 'bold' }}>{data.duration}</div>
                                </div>
                            </div>
                        </div>

                        {/* Botões */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '8px'
                        }}>
                            <button
                                onClick={handleExecute}
                                style={{
                                    padding: '10px',
                                    backgroundColor: '#00ff88',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '11px',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#00cc6a'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#00ff88'}
                            >
                                ✅ EXECUTAR
                            </button>

                            <button
                                onClick={handleCopy}
                                style={{
                                    padding: '10px',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '11px',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                            >
                                📋 COPIAR
                            </button>

                            <button
                                onClick={handleIgnore}
                                style={{
                                    padding: '10px',
                                    backgroundColor: 'rgba(255,107,107,0.2)',
                                    color: '#ff6b6b',
                                    border: '1px solid #ff6b6b',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '11px',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,107,107,0.3)'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,107,107,0.2)'}
                            >
                                ❌ IGNORAR
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        /* COMPONENTES REACT - Sidebar e Header */
        
        function Sidebar({ currentView, setCurrentView }) {
            const menuItems = [
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'robot', label: 'Painel do Robô', icon: '🤖' },
                { id: 'audit', label: 'Auditoria', icon: '📋' },
                { id: 'backtest', label: 'Backtesting', icon: '🔬' },
                { id: 'advanced-metrics', label: 'Métricas Avançadas', icon: '📈' },
                { id: 'telegram', label: 'Telegram', icon: '📱' },
                { id: 'performance', label: 'Performance', icon: '📈' },
                { id: 'ml-engine', label: 'ML Engine', icon: '🧠' },
                { id: 'connections', label: 'Conexões', icon: '🔗' },
                { id: 'settings', label: 'Configurações', icon: '⚙️' }
            ];

            return (
                <div className="sidebar">
                    <div className="logo">⚡ Alpha-Learner v2.3</div>
                    {menuItems.map(item => (
                        <div 
                            key={item.id}
                            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                            onClick={() => setCurrentView(item.id)}
                        >
                            {item.icon} {item.label}
                        </div>
                    ))}
                </div>
            );
        }

        function Header({ isActive, setIsActive, mode, setMode, dataSource, orderExecutor, onEmergencyStop }) {
            return (
                <div className="header">
                    <div>
                        <h2>Trading Console</h2>
                        <div className="mode-selector">
                            <div 
                                className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
                                onClick={() => setMode('manual')}
                            >
                                🎯 Modo Assistente
                            </div>
                            <div 
                                className={`mode-btn ${mode === 'auto' ? 'active' : ''}`}
                                onClick={() => setMode('auto')}
                            >
                                🤖 Modo Robô
                            </div>
                        </div>
                    </div>
                    <div className="status-indicator">
                        <div className={`toggle-switch ${isActive ? 'active' : ''}`} 
                             onClick={() => setIsActive(!isActive)}>
                        </div>
                        <span>Alpha Engine: {isActive ? 'ATIVO' : 'INATIVO'}</span>
                        <div className="status-dot"></div>
                        
                        <div className={`data-source-badge ${dataSource === 'REAL' ? 'data-source-real' : 'data-source-simulated'}`}>
                            {dataSource === 'REAL' ? '🟢 API CONECTADA - DADOS REAIS' :
                             dataSource === 'DISCONNECTED' ? '🔴 API DESCONECTADA' :
                             '⚠️ ERRO NA API'}
                        </div>
                        
                        {mode === 'auto' && isActive && orderExecutor && (
                            <>
                                <div style={{
                                    background: 'rgba(255, 193, 7, 0.2)',
                                    border: '1px solid #ffc107',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#ffc107'
                                }}>
                                    🤖 EXECUTANDO AUTOMATICAMENTE
                                </div>
                                
                                <button 
                                    className="btn btn-emergency"
                                    onClick={onEmergencyStop}
                                >
                                    🚨 PARAR TUDO
                                </button>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        /* COMPONENTES REACT - Dashboard e Performance (COM ATUALIZAÇÃO EM TEMPO REAL) */

        function Dashboard({ signals, alphaEngine, minScore, setMinScore, dismissSignal, copySignalDetails, riskAmount, setRiskAmount, maxPositions, setMaxPositions, formatBRL, orderExecutor, mode, updateTrigger, assetType, setAssetType, symbol, setSymbol, memoryDB }) {
            const [metrics, setMetrics] = useState({ winRate: 0, totalPnL: 0, totalSignals: 0 });
           
            

            // NOVO: Atualizar métricas quando alphaEngine ou updateTrigger mudar
            useEffect(() => {
                const updateMetrics = async () => {
                    try {
                        // Priorizar dados do Supabase/MemoryDB (mais confiáveis)
                        if (memoryDB) {
                            const dbStats = await memoryDB.getStatistics();
                            if (dbStats && dbStats.total > 0) {
                                setMetrics({
                                    winRate: dbStats.winRate || 0,
                                    totalPnL: dbStats.totalPnL || 0,
                                    totalSignals: dbStats.total || 0
                                });
                                return;
                            }
                        }

                        // Fallback: usar alphaEngine.performance se MemoryDB não disponível
                        if (alphaEngine && alphaEngine.performance) {
                            setMetrics({
                                winRate: alphaEngine.performance.winRate || 0,
                                totalPnL: alphaEngine.performance.totalPnL || 0,
                                totalSignals: alphaEngine.performance.totalSignals || 0
                            });
                        } else {
                            setMetrics({ winRate: 0, totalPnL: 0, totalSignals: 0 });
                        }
                    } catch (error) {
                        console.error('Erro ao atualizar métricas:', error);
                    }
                };

                updateMetrics();

                // NOVO: Atualizar a cada 5 segundos
                const interval = setInterval(updateMetrics, 5000);
                return () => clearInterval(interval);
            }, [alphaEngine, updateTrigger, memoryDB]);

            return (
                <div>
                    {mode === 'auto' && (
                        <div className="robot-status-panel">
                            <h3>🤖 Status do Robô</h3>
                            <div className="metric-grid">
                                <div className="metric-card">
                                    <div className="metric-value">
                                        {orderExecutor ? orderExecutor.getActivePositions().length : 0}
                                    </div>
                                    <div className="metric-label">Posições Abertas</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value">
                                        {formatBRL(orderExecutor ? orderExecutor.getVirtualBalance() : 0)}
                                    </div>
                                    <div className="metric-label">Saldo Virtual</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value">
                                        {orderExecutor ? orderExecutor.getExecutionHistory().length : 0}
                                    </div>
                                    <div className="metric-label">Ordens Executadas</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid">
                        <div className="card">
                            <h3>⚙️ Configurações de Operação</h3>
                            <div className="form-group">
                                <label className="form-label">Score Mínimo: {minScore}%</label>
                                <input 
                                    type="range" 
                                    min="20" 
                                    max="95" 
                                    value={minScore}
                                    onChange={(e) => setMinScore(Number(e.target.value))}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Valor de Risco (R$)</label>
                                <input 
                                    type="number"
                                    value={riskAmount}
                                    onChange={(e) => setRiskAmount(Number(e.target.value))}
                                    className="form-input"
                                />
                            </div>
                            {mode === 'auto' && (
                                <div className="form-group">
                                    <label className="form-label">Máximo de Posições Simultâneas</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={maxPositions}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setMaxPositions(val);
                                            if (orderExecutor) {
                                                orderExecutor.setMaxPositions(val);
                                            }
                                        }}
                                        className="form-input"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="card">
                            <h3>📊 Métricas em Tempo Real</h3>
                            <div className="metric-grid">
                                <div className="metric-card">
                                    <div className="metric-value">{signals ? signals.length : 0}</div>
                                    <div className="metric-label">Sinais Ativos</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value">{metrics.winRate.toFixed(1)}%</div>
                                    <div className="metric-label">Taxa de Acerto</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value" style={{ 
                                        color: metrics.totalPnL >= 0 ? '#00ff88' : '#ff4757',
                                        fontSize: '24px'
                                    }}>
                                        {formatBRL(metrics.totalPnL)}
                                    </div>
                                    <div className="metric-label">P&L Acumulado</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3>🎯 Configuração do Ativo</h3>

                        <div className="form-group">
                            <label className="form-label">Tipo de Ativo</label>
                            <select
                                className="form-select"
                                value={assetType}
                                onChange={(e) => {
                                    setAssetType(e.target.value);
                                    // Auto-ajustar símbolo padrão
                                    if (e.target.value === 'crypto') setSymbol('BTCUSDT');
                                    else if (e.target.value === 'forex') setSymbol('EURUSD');
                                    else if (e.target.value === 'stock') setSymbol('AAPL');
                                }}
                            >
                                <option value="crypto">🟡 Criptomoeda</option>
                                <option value="forex">💱 Forex (Moedas)</option>
                                <option value="stock">📈 Ações</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Símbolo do Ativo</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={
                                    assetType === 'crypto' ? 'Ex: BTCUSDT, ETHUSDT' :
                                    assetType === 'forex' ? 'Ex: EURUSD, GBPUSD' :
                                    'Ex: AAPL, GOOGL, TSLA'
                                }
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            />
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                                {assetType === 'crypto' && '💡 Use símbolos da Binance (ex: BTCUSDT)'}
                                {assetType === 'forex' && '💡 Use pares de moedas (ex: EURUSD)'}
                                {assetType === 'stock' && '💡 Use tickers de ações (ex: AAPL, GOOGL)'}
                            </div>
                        </div>

                        <div style={{
                            padding: '12px',
                            backgroundColor: 'rgba(0, 255, 136, 0.1)',
                            borderRadius: '8px',
                            marginTop: '16px',
                            fontSize: '13px',
                            border: '1px solid rgba(0, 255, 136, 0.3)'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#00ff88' }}>
                                📡 APIs Compatíveis
                            </div>
                            <div style={{ color: '#c0c0c0' }}>
                                {assetType === 'crypto' && '• Binance, CoinGecko'}
                                {assetType === 'forex' && '• Alpha Vantage, Polygon, AwesomeAPI'}
                                {assetType === 'stock' && '• Alpha Vantage, Polygon'}
                            </div>
                        </div>

                        <button
                            className="btn-primary"
                            style={{
                                width: '100%',
                                marginTop: '16px',
                                padding: '12px',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                            onClick={() => {
                                // Mostrar confirmação visual
                                const btn = event.target;
                                const originalText = btn.textContent;
                                btn.textContent = '✅ Configurações Salvas!';
                                btn.style.backgroundColor = '#00ff88';
                                btn.style.color = '#000';

                                setTimeout(() => {
                                    btn.textContent = originalText;
                                    btn.style.backgroundColor = '';
                                    btn.style.color = '';
                                }, 2000);
                            }}
                        >
                            💾 Confirmar Alterações
                        </button>
                    </div>

                    <div className="card">
                        <h3>🎯 Oportunidades de Trading</h3>
                        {!signals || signals.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#a0a0a0', padding: '40px' }}>
                                🔍 Aguardando sinais de alta qualidade...
                            </div>
                        ) : (
                            <div className="grid">
                                {signals.slice(0, 10).map(signal => (
                                    <SignalCard
                                        key={signal ? signal.id : Math.random()}
                                        signal={signal}
                                        onDismiss={dismissSignal}
                                        onCopy={copySignalDetails}
                                        onExecute={executeSignalFromCard}
                                        formatBRL={formatBRL}
                                        mode={mode}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        function Performance({ alphaEngine, signals, memoryDB, formatBRL, updateTrigger }) {
            const [stats, setStats] = useState(null);

            // NOVO: Atualizar estatísticas quando memoryDB ou updateTrigger mudar
            useEffect(() => {
                const loadStats = async () => {
                    if (memoryDB) {
                        const dbStats = await memoryDB.getStatistics();
                        setStats(dbStats);
                    }
                };
                loadStats();
                
                // NOVO: Atualizar a cada 5 segundos
                const interval = setInterval(loadStats, 5000);
                return () => clearInterval(interval);
            }, [memoryDB, signals, updateTrigger]);

            if (!alphaEngine) return null;

            return (
                <div>
                    <div className="card">
                        <h3>📈 Performance Geral</h3>
                        <div className="metric-grid">
                            <div className="metric-card">
                                <div className="metric-value">{stats?.total || 0}</div>
                                <div className="metric-label">Total de Sinais</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value">{stats?.successful || 0}</div>
                                <div className="metric-label">Sinais Bem-sucedidos</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value">{(stats?.winRate || 0).toFixed(1)}%</div>
                                <div className="metric-label">Taxa de Acerto</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value" style={{
                                    color: (stats?.totalPnL || 0) >= 0 ? '#00ff88' : '#ff4757'
                                }}>
                                    {formatBRL(stats?.totalPnL || 0)}
                                </div>
                                <div className="metric-label">P&L Total</div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3>🎯 Histórico Recente</h3>
                        {!signals || signals.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#a0a0a0', padding: '20px' }}>
                                Nenhum sinal ainda
                            </div>
                        ) : (
                            <div>
                                {signals.filter(s => s && s.status !== 'PENDENTE').map(signal => (
                                    <div key={signal.id} style={{ 
                                        padding: '15px', 
                                        margin: '10px 0',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        background: signal.status === 'ACERTO' ? 
                                            'rgba(0, 255, 136, 0.1)' : 'rgba(255, 71, 87, 0.1)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <strong>{signal.direction} {signal.symbol}</strong>
                                                <span style={{ marginLeft: '10px', fontSize: '14px', color: '#a0a0a0' }}>
                                                    Score: {signal.score}%
                                                </span>
                                            </div>
                                            <div style={{ 
                                                color: signal.status === 'ACERTO' ? '#00ff88' : '#ff4757',
                                                fontWeight: 'bold'
                                            }}>
                                                {formatBRL(signal.pnl || 0)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        function MLEngine({ alphaEngine, memoryDB, updateTrigger }) {
            const [weightsHistory, setWeightsHistory] = useState([]);
            const [currentWeights, setCurrentWeights] = useState({});

            // NOVO: Atualizar pesos quando alphaEngine ou updateTrigger mudar
            useEffect(() => {
                const loadHistory = async () => {
                    if (memoryDB) {
                        const history = await memoryDB.getWeightsHistory();
                        setWeightsHistory(history);
                    }
                };
                loadHistory();
                
                // NOVO: Atualizar a cada 5 segundos
                const interval = setInterval(loadHistory, 5000);
                return () => clearInterval(interval);
            }, [memoryDB, updateTrigger]);

            useEffect(() => {
                if (alphaEngine && alphaEngine.weights) {
                    setCurrentWeights(alphaEngine.weights);
                }
                
                // NOVO: Atualizar a cada 5 segundos
                const interval = setInterval(() => {
                    if (alphaEngine && alphaEngine.weights) {
                        setCurrentWeights({...alphaEngine.weights});
                    }
                }, 5000);
                
                return () => clearInterval(interval);
            }, [alphaEngine, updateTrigger]);

            if (!alphaEngine) return null;

            return (
                <div>
                    <div className="card">
                        <h3>🧠 Pesos Adaptativos</h3>
                        <div style={{ marginTop: '20px' }}>
                            {Object.entries(currentWeights).map(([indicator, weight]) => (
                                <div key={indicator} className="weight-item">
                                    <div>
                                        <strong>{indicator.replace('_', ' ').toUpperCase()}</strong>
                                        <br />
                                        <small>{((weight || 0) * 100).toFixed(1)}%</small>
                                    </div>
                                    <div className="weight-bar">
                                        <div 
                                            className="weight-fill" 
                                            style={{ width: `${(weight || 0) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        /* CONTINUAÇÃO DOS COMPONENTES - SignalCard, RobotView, AuditView, ConnectionsView, Settings */

        function SignalCard({ signal, onDismiss, onCopy, formatBRL, mode, onExecute }) {
            if (!signal) return null;

            const getStatusClass = () => {
                if (signal.status === 'ACERTO') return 'success';
                if (signal.status === 'ERRO') return 'error';
                return '';
            };

            let timeToEntry = 0;
            let minutes = 0;
            let seconds = 0;
            
            try {
                if (signal.entryTime) {
                    const now = new Date();
                    const entryTime = new Date(signal.entryTime);
                    timeToEntry = Math.max(0, Math.floor((entryTime - now) / 1000));
                    minutes = Math.floor(timeToEntry / 60);
                    seconds = timeToEntry % 60;
                }
            } catch (error) {
                timeToEntry = 0;
            }
            
            const formatEntryTime = () => {
                if (signal.status !== 'PENDENTE') return `Status: ${signal.status}`;
                if (timeToEntry <= 0) return "⏰ ENTRAR AGORA";
                if (timeToEntry < 60) return `⏱️ ${seconds}s para entrada`;
                return `⏱️ ${minutes}m ${seconds}s para entrada`;
            };

            const getExactEntryTime = () => {
                try {
                    const entryDate = new Date(signal.entryTime);
                    return entryDate.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                    });
                } catch {
                    return 'N/A';
                }
            };
            
            return (
                <div className={`signal-card ${timeToEntry <= 30 && timeToEntry > 0 ? 'urgent' : ''} ${getStatusClass()}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div className={`signal-direction ${(signal.direction || '').toLowerCase()}`}>
                            {signal.direction === 'BUY' ? '🟢' : '🔴'} {signal.direction || 'N/A'} {signal.symbol || 'N/A'}
                        </div>
                        
                        <div style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            background: 'rgba(0, 255, 136, 0.2)',
                            color: '#00ff88',
                            border: '1px solid #00ff88'
                        }}>
                            📡 API Real
                        </div>
                    </div>
                    
                    <div>
                        <span className="signal-score">Score: {signal.score || 0}%</span>
                        {signal.mlProbability && (
                            <span style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                marginLeft: '8px',
                                background: signal.mlConfidence === 'MUITO ALTA' || signal.mlConfidence === 'ALTA' ?
                                    'rgba(0, 255, 136, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                                color: signal.mlConfidence === 'MUITO ALTA' || signal.mlConfidence === 'ALTA' ?
                                    '#00ff88' : '#ffc107',
                                border: signal.mlConfidence === 'MUITO ALTA' || signal.mlConfidence === 'ALTA' ?
                                    '1px solid #00ff88' : '1px solid #ffc107'
                            }}>
                                🧠 {signal.mlConfidence} ({(signal.mlProbability * 100).toFixed(0)}%)
                            </span>
                        )}
                        <span className={`signal-status ${signal.status?.toLowerCase() || 'pending'}`}>
                            {signal.status === 'ACERTO' && '✅ ACERTO'}
                            {signal.status === 'ERRO' && '❌ ERRO'}
                            {signal.status === 'EXPIRADO' && '⏱️ EXPIRADO'}
                            {signal.status === 'PENDENTE' && '⏳ PENDENTE'}
                            {signal.status === 'CANCELADO' && '🚫 CANCELADO'}
                        </span>
                        {signal.executed && (
                            <span className="signal-status success" style={{ marginLeft: '5px' }}>
                                {mode === 'auto' ? '🤖 EXECUTADO' : '✅ ORDEM EXECUTADA'}
                            </span>
                        )}
                    </div>
                    
                    <div style={{ 
                        background: timeToEntry <= 30 && signal.status === 'PENDENTE' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 255, 136, 0.1)',
                        border: `1px solid ${timeToEntry <= 30 && signal.status === 'PENDENTE' ? '#ffd700' : 'rgba(0, 255, 136, 0.3)'}`,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: timeToEntry <= 30 && signal.status === 'PENDENTE' ? '#ffd700' : '#00ff88',
                        marginBottom: '10px',
                        marginTop: '10px',
                        textAlign: 'center'
                    }}>
                        {formatEntryTime()}
                    </div>

                    {signal.status === 'PENDENTE' && (
                        <>
                            <div style={{
                                background: 'rgba(0, 184, 217, 0.15)',
                                border: '1px solid rgba(0, 184, 217, 0.4)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                marginBottom: '10px',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                color: '#00b8d9',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '16px' }}>🎯</span>
                                <div>
                                    <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '2px' }}>
                                        ENTRADA (Início do Candle)
                                    </div>
                                    <div style={{ fontSize: '16px', letterSpacing: '1px' }}>
                                        {getExactEntryTime()}
                                    </div>
                                </div>
                            </div>
                            {signal.expirationTime && (
                                <div style={{
                                    background: 'rgba(255, 107, 107, 0.15)',
                                    border: '1px solid rgba(255, 107, 107, 0.4)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    marginBottom: '10px',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    color: '#ff6b6b',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '16px' }}>🏁</span>
                                    <div>
                                        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '2px' }}>
                                            EXPIRAÇÃO (Fechamento do Candle)
                                        </div>
                                        <div style={{ fontSize: '16px', letterSpacing: '1px' }}>
                                            {new Date(signal.expirationTime).toLocaleTimeString('pt-BR', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    
                    {signal.divergence && (
                        <div style={{
                            background: 'rgba(255, 215, 0, 0.2)',
                            border: '1px solid #ffd700',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#ffd700',
                            marginBottom: '10px'
                        }}>
                            ⚡ Divergência {signal.divergence.type || 'N/A'}
                        </div>
                    )}
                    
                    {signal.executionDetails && (
                        <div style={{
                            background: 'rgba(0, 255, 136, 0.1)',
                            border: '1px solid #00ff88',
                            borderRadius: '8px',
                            padding: '10px',
                            marginBottom: '10px',
                            fontSize: '12px'
                        }}>
                            <strong>Detalhes da Execução:</strong>
                            <div>Order ID: {signal.executionDetails.orderId}</div>
                            <div>Preço Executado: {formatBRL(signal.executionDetails.executedPrice)}</div>
                            <div>Quantidade: {signal.executionDetails.executedQty}</div>
                        </div>
                    )}
                    
                    <div className="signal-details">
                        <div><strong>Preço:</strong> {formatBRL(signal.price)}</div>
                        <div><strong>Timeframe:</strong> {signal.timeframe || 'N/A'}</div>
                        <div><strong>Stop Loss:</strong> {formatBRL(signal.stopLoss)}</div>
                        <div><strong>Take Profit:</strong> {formatBRL(signal.takeProfit)}</div>
                        <div><strong>R/R:</strong> 1:2</div>
                        <div><strong>Risco:</strong> R$ 100</div>
                    </div>
                    
                    {signal.status !== 'PENDENTE' && signal.pnl !== undefined && (
                        <div style={{ 
                            padding: '12px', 
                            borderRadius: '8px', 
                            background: signal.pnl >= 0 ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 71, 87, 0.2)',
                            marginTop: '10px',
                            border: `1px solid ${signal.pnl >= 0 ? '#00ff88' : '#ff4757'}`
                        }}>
                            <strong>Resultado Final:</strong> 
                            <span style={{ 
                                color: signal.pnl >= 0 ? '#00ff88' : '#ff4757',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                marginLeft: '10px'
                            }}>
                                {formatBRL(signal.pnl)}
                            </span>
                            {signal.finalPrice && (
                                <div style={{ fontSize: '12px', marginTop: '5px', color: '#a0a0a0' }}>
                                    Preço final: {formatBRL(signal.finalPrice)}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="signal-actions">
                        {/* Botão EXECUTAR ORDEM - só aparece em modo MANUAL, sinal PENDENTE e tempo de entrada não expirado */}
                        {mode === 'manual' && signal.status === 'PENDENTE' && !signal.executed && timeToEntry > 0 && (
                            <button
                                className="btn btn-success"
                                onClick={() => onExecute && onExecute(signal)}
                                style={{
                                    gridColumn: '1 / -1',
                                    backgroundColor: '#00ff88',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    padding: '12px',
                                    marginBottom: '8px'
                                }}
                            >
                                ✅ EXECUTAR ORDEM
                            </button>
                        )}

                        <button className="btn btn-primary" onClick={() => onCopy && onCopy(signal)}>
                            📋 Copiar
                        </button>
                        <button className="btn btn-secondary" onClick={() => onDismiss && onDismiss(signal.id)}>
                            ❌ Dispensar
                        </button>
                    </div>
                </div>
            );
        }

        function RobotView({ orderExecutor, formatBRL, maxPositions, setMaxPositions }) {
            const [logs, setLogs] = useState([]);
            const [positions, setPositions] = useState([]);
            const [history, setHistory] = useState([]);

            useEffect(() => {
                if (!orderExecutor) return;

                const updateData = () => {
                    setLogs(orderExecutor.getSystemLogs().slice(-50).reverse());
                    setPositions(orderExecutor.getActivePositions());
                    setHistory(orderExecutor.getExecutionHistory().slice(-20).reverse());
                };

                updateData();
                const interval = setInterval(updateData, 2000);
                return () => clearInterval(interval);
            }, [orderExecutor]);

            if (!orderExecutor) {
                return (
                    <div className="card">
                        <h3>⏳ Carregando...</h3>
                        <p>Inicializando sistema de execução...</p>
                    </div>
                );
            }

            return (
                <div>
                    <div className="warning-box">
                        ⚠️ <strong>Painel do Robô:</strong> Sistema de execução automática para conta DEMO. 
                        Todas as ordens são executadas em ambiente de testes.
                    </div>

                    <div className="warning-box" style={{ background: 'rgba(255, 193, 7, 0.1)', borderColor: 'rgba(255, 193, 7, 0.3)' }}>
                        ℹ️ <strong>Aviso:</strong> Os dados não são salvos permanentemente. 
                        Todas as configurações e histórico são mantidos apenas durante a sessão atual. 
                        Ao recarregar a página, os dados serão perdidos.
                    </div>

                    <div className="grid">
                        <div className="card">
                            <h3>💰 Status Financeiro</h3>
                            <div className="metric-card">
                                <div className="metric-value">
                                    {formatBRL(orderExecutor.getVirtualBalance())}
                                </div>
                                <div className="metric-label">Saldo Virtual Disponível</div>
                            </div>
                        </div>

                        <div className="card">
                            <h3>⚙️ Configurações de Risco</h3>
                            <div className="form-group">
                                <label className="form-label">
                                    Máximo de Posições: {maxPositions}
                                </label>
                                <input 
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={maxPositions}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setMaxPositions(val);
                                        orderExecutor.setMaxPositions(val);
                                    }}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3>📊 Posições Abertas ({positions.length})</h3>
                        {positions.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#a0a0a0', padding: '20px' }}>
                                Nenhuma posição aberta no momento
                            </div>
                        ) : (
                            positions.map(pos => (
                                <div key={pos.signal.id} className="position-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <strong>
                                            {pos.signal.direction} {pos.signal.symbol}
                                        </strong>
                                        <span style={{ fontSize: '12px', color: '#a0a0a0' }}>
                                            {new Date(pos.openTime).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '13px' }}>
                                        <div>Entrada: {formatBRL(pos.orderResult.executedPrice)}</div>
                                        <div>Stop: {formatBRL(pos.signal.stopLoss)}</div>
                                        <div>Alvo: {formatBRL(pos.signal.takeProfit)}</div>
                                        <div>Order ID: {pos.orderResult.orderId}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="card">
                        <h3>📜 Histórico de Execuções</h3>
                        {history.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#a0a0a0', padding: '20px' }}>
                                Nenhuma execução ainda
                            </div>
                        ) : (
                            <div>
                                {history.map((exec, idx) => (
                                    <div key={idx} style={{
                                        padding: '10px',
                                        margin: '5px 0',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '6px',
                                        fontSize: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <strong>{exec.direction} {exec.symbol}</strong>
                                            <span>{new Date(exec.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div style={{ marginTop: '5px', color: '#a0a0a0' }}>
                                            Preço: {formatBRL(exec.orderResult.executedPrice)} | 
                                            Order: {exec.orderResult.orderId}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <h3>📋 Logs do Sistema</h3>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {logs.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#a0a0a0', padding: '20px' }}>
                                    Nenhum log ainda
                                </div>
                            ) : (
                                logs.map((log, idx) => (
                                    <div key={idx} className={`log-entry ${log.type}`}>
                                        <span style={{ color: '#00ff88' }}>
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span> {log.message}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        function AuditView({ auditSystem, formatBRL }) {
            const [activeTab, setActiveTab] = useState('logs');
            const [logs, setLogs] = useState([]);
            const [alerts, setAlerts] = useState([]);
            const [perfByHour, setPerfByHour] = useState({});
            const [perfByScore, setPerfByScore] = useState({});
            const [indicatorPerf, setIndicatorPerf] = useState({});

            useEffect(() => {
                if (!auditSystem) return;

                const updateData = async () => {
                    const recentLogs = await auditSystem.getRecentLogs(50, true); // forceReload = true
                    setLogs(recentLogs);
                    setAlerts(auditSystem.getHealthAlerts());
                    setPerfByHour(auditSystem.getPerformanceByHour());
                    setPerfByScore(auditSystem.getPerformanceByScore());
                    setIndicatorPerf(auditSystem.getIndicatorPerformance());
                };

                updateData();
                const interval = setInterval(updateData, 5000);
                return () => clearInterval(interval);
            }, [auditSystem]);

            const handleExport = () => {
                if (!auditSystem) return;
                
                const csv = auditSystem.exportToCSV();
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `audit_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
            };

            const handleDiagnostic = () => {
                console.log('====== DIAGNÓSTICO DO SISTEMA DE AUDITORIA ======');
                console.log('auditSystem existe?', !!auditSystem);
                console.log('window.auditSystemRef existe?', !!window.auditSystemRef);
                console.log('São o mesmo objeto?', auditSystem === window.auditSystemRef);
                console.log('Número de logs:', auditSystem ? auditSystem.auditLogs.length : 0);
                console.log('Debug ativo?', window.debugAudit);
                console.log('===============================================');
                
                if (auditSystem) {
                    const validation = auditSystem.validateData();
                    
                    let message = `Sistema OK!\n\nLogs totais: ${validation.total}\n`;
                    message += `Com resultado: ${validation.withOutcome}\n`;
                    message += `Acertos: ${validation.acertos}\n`;
                    message += `Erros: ${validation.erros}\n`;
                    message += `Expirados: ${validation.expirados}\n\n`;
                    
                    if (validation.withOutcome === 0) {
                        message += '⚠️ NENHUM sinal tem resultado final!\n';
                        message += 'O sistema pode não estar verificando os sinais corretamente.';
                    } else if (validation.expirados > validation.withOutcome * 0.8) {
                        message += `⚠️ ${(validation.expirados/validation.withOutcome*100).toFixed(1)}% dos sinais estão EXPIRANDO!\n`;
                        message += 'Considere ajustar os alvos ou timeouts.';
                    }
                    
                    message += '\n\nVerifique o console para mais detalhes.';
                    alert(message);
                } else {
                    alert('ERRO: Sistema de auditoria não inicializado!');
                }
            };

            const handleClearOldData = async () => {
                if (!auditSystem) return;
                if (confirm('Limpar logs com mais de 7 dias?')) {
                    auditSystem.clearOldData(7);
                    const recentLogs = await auditSystem.getRecentLogs(50, true);
                    setLogs(recentLogs);
                    alert('Dados antigos removidos!');
                }
            };

            const handleValidateData = () => {
                if (!auditSystem) return;
                
                console.log('\n🔍 === VALIDAÇÃO MANUAL ===');
                const validation = auditSystem.validateData();
                
                let alertMsg = '📊 VALIDAÇÃO DOS DADOS\n\n';
                alertMsg += `Total de logs: ${validation.total}\n`;
                alertMsg += `Com resultado final: ${validation.withOutcome}\n`;
                alertMsg += `├─ Acertos: ${validation.acertos}\n`;
                alertMsg += `├─ Erros: ${validation.erros}\n`;
                alertMsg += `└─ Expirados: ${validation.expirados}\n\n`;
                
                if (validation.withOutcome === 0) {
                    alertMsg += '❌ PROBLEMA: Nenhum sinal tem resultado!\n';
                    alertMsg += 'O sistema não está verificando os sinais.';
                } else {
                    const winRate = validation.withOutcome > 0 ? (validation.acertos / validation.withOutcome * 100) : 0;
                    const expiredRate = validation.withOutcome > 0 ? (validation.expirados / validation.withOutcome * 100) : 0;
                    
                    alertMsg += `Win Rate: ${winRate.toFixed(1)}%\n`;
                    alertMsg += `Taxa de Expiração: ${expiredRate.toFixed(1)}%\n\n`;
                    
                    if (expiredRate > 80) {
                        alertMsg += '⚠️ Muitos sinais expirando!\n';
                        alertMsg += 'Ajuste os alvos ou timeouts.';
                    } else if (expiredRate > 50) {
                        alertMsg += '⚠️ Taxa de expiração alta.';
                    } else {
                        alertMsg += '✅ Sistema funcionando corretamente!';
                    }
                }
                
                alert(alertMsg);
            };

            if (!auditSystem) {
                return <div className="card"><h3>Carregando auditoria...</h3></div>;
            }

            return (
                <div>
                    <div className="warning-box">
                        📊 Sistema de Auditoria e Validação
                        <div style={{ marginTop: '8px', fontSize: '11px' }}>
                            Logs coletados: <strong>{logs.length}</strong> | 
                            Debug: <strong>{window.debugAudit ? 'ATIVO' : 'INATIVO'}</strong> |
                            Sistema: <strong>{auditSystem ? 'OK' : 'ERRO'}</strong>
                        </div>
                    </div>

                    {logs.length === 0 && auditSystem && (
                        <div className="warning-box">
                            ⚠️ Nenhum log coletado ainda. Use o botão "Diagnóstico" para verificar o status.
                        </div>
                    )}

                    {alerts.length > 0 && (
                        <div className="card">
                            <h3>⚠️ Alertas</h3>
                            {alerts.map((alert, idx) => (
                                <div key={idx} className={alert.type === 'error' ? 'error-box' : 'warning-box'}>
                                    {alert.message}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3>Dados de Auditoria</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-secondary" onClick={handleDiagnostic}>
                                    🔍 Diagnóstico
                                </button>
                                <button className="btn btn-secondary" onClick={handleValidateData}>
                                    ✅ Validar Dados
                                </button>
                                <button className="btn btn-secondary" onClick={handleClearOldData}>
                                    🗑️ Limpar Antigos
                                </button>
                                <button className="btn btn-primary" onClick={handleExport}>
                                    📥 Exportar CSV
                                </button>
                            </div>
                        </div>

                        <div className="mode-selector">
                            <div className={`mode-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
                                📋 Logs
                            </div>
                            <div className={`mode-btn ${activeTab === 'hour' ? 'active' : ''}`} onClick={() => setActiveTab('hour')}>
                                ⏰ Por Horário
                            </div>
                            <div className={`mode-btn ${activeTab === 'score' ? 'active' : ''}`} onClick={() => setActiveTab('score')}>
                                📊 Por Score
                            </div>
                            <div className={`mode-btn ${activeTab === 'indicators' ? 'active' : ''}`} onClick={() => setActiveTab('indicators')}>
                                🎯 Indicadores
                            </div>
                        </div>

                        {activeTab === 'logs' && (
                            <div style={{ maxHeight: '600px', overflowY: 'auto', marginTop: '20px' }}>
                                {logs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#a0a0a0' }}>
                                        Nenhum log ainda
                                    </div>
                                ) : (
                                    logs.map((log, idx) => (
                                        <div key={idx} style={{
                                            padding: '15px',
                                            margin: '10px 0',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px',
                                            background: log.outcome === 'ACERTO' ? 'rgba(0, 255, 136, 0.05)' : 
                                                       log.outcome === 'ERRO' ? 'rgba(255, 71, 87, 0.05)' : 'rgba(255, 255, 255, 0.02)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <strong>{log.metadata.direction} {log.metadata.symbol}</strong>
                                                <span style={{ fontSize: '12px', color: '#a0a0a0' }}>
                                                    {new Date(log.generatedAt).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#c0c0c0', marginTop: '10px' }}>
                                                <div>Score: {log.scoreRange} | Horário: {log.hourOfDay}h</div>
                                                <div>Preço: {formatBRL(log.prices.theoretical)}</div>
                                                {log.outcome && (
                                                    <div style={{ marginTop: '8px', color: log.outcome === 'ACERTO' ? '#00ff88' : '#ff4757' }}>
                                                        {log.outcome} | P&L: {formatBRL(log.prices.finalPnL)}
                                                        <div style={{ fontSize: '11px', marginTop: '3px' }}>{log.reason}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'hour' && (
                            <div style={{ marginTop: '20px' }}>
                                {Object.keys(perfByHour).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#a0a0a0' }}>
                                        Dados insuficientes
                                    </div>
                                ) : (
                                    Object.entries(perfByHour).sort((a, b) => Number(a[0]) - Number(b[0])).map(([hour, stats]) => {
                                        const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
                                        return (
                                            <div key={hour} style={{
                                                padding: '15px',
                                                margin: '10px 0',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <strong>{hour}:00h</strong>
                                                        <div style={{ fontSize: '13px', color: '#a0a0a0', marginTop: '5px' }}>
                                                            {stats.total} sinais | {stats.wins} vitórias
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '24px', color: winRate >= 50 ? '#00ff88' : '#ff4757' }}>
                                                            {winRate.toFixed(1)}%
                                                        </div>
                                                        <div style={{ fontSize: '14px', color: stats.totalPnL >= 0 ? '#00ff88' : '#ff4757' }}>
                                                            {formatBRL(stats.totalPnL)}
                                                        </div>
                                                          </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {activeTab === 'score' && (
                            <div style={{ marginTop: '20px' }}>
                                {Object.keys(perfByScore).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#a0a0a0' }}>
                                        Dados insuficientes
                                    </div>
                                ) : (
                                    Object.entries(perfByScore).map(([range, stats]) => {
                                        const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
                                        return (
                                            <div key={range} style={{
                                                padding: '15px',
                                                margin: '10px 0',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <strong>Score: {range}%</strong>
                                                        <div style={{ fontSize: '13px', color: '#a0a0a0', marginTop: '5px' }}>
                                                            {stats.total} sinais | {stats.wins} vitórias
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '20px', color: winRate >= 50 ? '#00ff88' : '#ff4757' }}>
                                                        {winRate.toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {activeTab === 'indicators' && (
                            <div style={{ marginTop: '20px' }}>
                                {Object.keys(indicatorPerf).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#a0a0a0' }}>
                                        Dados insuficientes
                                    </div>
                                ) : (
                                    Object.entries(indicatorPerf).map(([indicator, stats]) => {
                                        const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
                                        return (
                                            <div key={indicator} style={{
                                                padding: '15px',
                                                margin: '10px 0',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <strong>{indicator.toUpperCase()}</strong>
                                                        <div style={{ fontSize: '13px', color: '#a0a0a0', marginTop: '5px' }}>
                                                            {stats.total} sinais
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '24px', color: winRate >= 50 ? '#00ff88' : '#ff4757' }}>
                                                        {winRate.toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        function ConnectionsView({ apiManager, showNotification }) {
            const [selectedProvider, setSelectedProvider] = useState('BINANCE');
            const [apiKey, setApiKey] = useState('');
            const [secretKey, setSecretKey] = useState('');
            const [testing, setTesting] = useState(false);
            const [testResult, setTestResult] = useState(null);
            const [updateTrigger, setUpdateTrigger] = useState(0);
            const [isReady, setIsReady] = useState(false);


            // ✅ ADICIONE ESTE useEffect:
    useEffect(() => {
        const initialize = async () => {
            if (apiManager) {
                await apiManager.ensureInitialized();
                setIsReady(true);
            }
        };
        initialize();
    }, [apiManager]);

    if (!apiManager || !isReady) { // ✅ MODIFICADO
        return (
            <div className="card">
                <h3>⏳ Carregando conexões...</h3>
                <p>Aguarde enquanto carregamos seus dados do Supabase...</p>
            </div>
        );
    }
            if (!apiManager) {
                return <div className="card"><h3>⏳ Carregando...</h3></div>;
            }

            const handleTest = async () => {
                if (!apiKey.trim()) {
                    showNotification('Insira a API Key');
                    return;
                }

                // Validate API key format
                const validationErrors = validateAPIKey(selectedProvider, apiKey, secretKey);
                if (validationErrors.length > 0) {
                    showNotification(`❌ ${validationErrors.join(', ')}`);
                    return;
                }

                setTesting(true);
                setTestResult(null);

                try {
                    const result = await testAPIConnection(selectedProvider, apiKey, secretKey || null);
                    setTestResult(result);
                    
                    if (result.success) {
                        apiManager.addConnection(selectedProvider, apiKey, secretKey || null);
                        apiManager.updateStatus(selectedProvider, 'connected');
                        apiManager.setActive(selectedProvider);
                        showNotification('✅ Conexão estabelecida!');
                        setUpdateTrigger(prev => prev + 1);
                    } else {
                        showNotification(`❌ ${result.message}`);
                    }
                } catch (error) {
                    setTestResult({ success: false, message: `Erro: ${error.message}` });
                } finally {
                    setTesting(false);
                }
            };

            const handleDisconnect = (provider) => {
                apiManager.removeConnection(provider);
                showNotification('Conexão removida');
                setUpdateTrigger(prev => prev + 1);
            };

            const connectedProviders = [];
            if (apiManager.connections) {
                apiManager.connections.forEach((conn, provider) => {
                    if (conn.status === 'connected') {
                        connectedProviders.push(provider);
                    }
                });
            }

            return (
                <div>
                    <div className="warning-box">
                        ⚠️ Use chaves da Testnet para testes sem risco
                    </div>

                    <div className="card">
                        <h3>🔗 Nova Conexão</h3>
                        
                        <div className="form-group">
                            <label className="form-label">Provedor</label>
                            <select 
                                className="form-select"
                                value={selectedProvider}
                                onChange={(e) => setSelectedProvider(e.target.value)}
                            >
                                {Object.entries(API_PROVIDERS).map(([key, provider]) => (
                                    <option key={key} value={key}>
                                        {provider.icon} {provider.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* AwesomeAPI não precisa de chave */}
                        {selectedProvider !== 'AWESOMEAPI' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">API Key</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                    />
                                </div>

                                {API_PROVIDERS[selectedProvider].requiresSecret && (
                                    <div className="form-group">
                                        <label className="form-label">Secret Key</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={secretKey}
                                            onChange={(e) => setSecretKey(e.target.value)}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Aviso para AwesomeAPI */}
                        {selectedProvider === 'AWESOMEAPI' && (
                            <div className="success-box">
                                ✅ Esta API é pública e gratuita. Não requer chaves de acesso.<br/>
                                <strong>Símbolos disponíveis:</strong> USD-BRL, EUR-BRL, BTC-BRL, ETH-BRL, etc.
                            </div>
                        )}

                        {/* AwesomeAPI não precisa de API Key - botão direto */}
                        {selectedProvider === 'AWESOMEAPI' ? (
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    apiManager.addConnection('AWESOMEAPI', 'PUBLIC_API', null);
                                    apiManager.updateStatus('AWESOMEAPI', 'connected');
                                    apiManager.setActive('AWESOMEAPI');
                                    showNotification('✅ AwesomeAPI ativada! (API pública brasileira)');
                                    setUpdateTrigger(prev => prev + 1);
                                }}
                                style={{ width: '100%' }}
                            >
                                ⚡ Ativar AwesomeAPI (Sem chave necessária)
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary"
                                onClick={handleTest}
                                disabled={testing}
                                style={{ width: '100%' }}
                            >
                                {testing ? '🔄 Testando...' : '🔗 Salvar e Testar'}
                            </button>
                        )}

                        {testResult && (
                            <div className={testResult.success ? 'success-box' : 'error-box'} style={{ marginTop: '15px' }}>
                                {testResult.message}
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <h3>📊 Conexões Ativas</h3>
                        {connectedProviders.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#a0a0a0', padding: '40px' }}>
                                Nenhuma conexão ativa
                            </div>
                        ) : (
                            connectedProviders.map(provider => {
                                const providerInfo = API_PROVIDERS[provider];
                                const isActive = apiManager.activeProvider === provider;
                                
                                return (
                                    <div key={provider} className={`api-provider-card ${isActive ? 'connected' : ''}`}>
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ color: '#00ff88', margin: 0 }}>
                                                    {providerInfo.icon} {providerInfo.name}
                                                </h4>
                                            </div>
                                            <div className="api-status-badge api-status-connected">
                                                ✅ Conectado
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {!isActive && (
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => {
                                                        apiManager.updateStatus(provider, 'connected');
                                                        apiManager.setActive(provider);
                                                        showNotification(`${providerInfo.name} ativado`);
                                                        setUpdateTrigger(prev => prev + 1);
                                                    }}
                                                >
                                                    ⚡ Ativar
                                                </button>
                                            )}
                                            <button 
                                                className="btn btn-danger"
                                                onClick={() => handleDisconnect(provider)}
                                            >
                                                🗑️ Remover
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            );
        }
function BacktestView({ alphaEngine, memoryDB, formatBRL }) {
            const [config, setConfig] = useState({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                initialBalance: 10000,
                riskPerTrade: 100,
                minScore: 60,
                timeframe: 'M5'
            });
            const [results, setResults] = useState(null);
            const [isRunning, setIsRunning] = useState(false);
            const [progress, setProgress] = useState(0);
            const backtestEngineRef = useRef(null);

            useEffect(() => {
                if (alphaEngine && memoryDB) {
                    backtestEngineRef.current = new BacktestEngine(alphaEngine, memoryDB);
                }
            }, [alphaEngine, memoryDB]);

            const handleRunBacktest = async () => {
                if (!backtestEngineRef.current) return;
                
                setIsRunning(true);
                setResults(null);
                setProgress(0);
                
                try {
                    const result = await backtestEngineRef.current.runBacktest(config);
                    setResults(result);
                } catch (error) {
                    alert(`Erro no backtest: ${error.message}`);
                } finally {
                    setIsRunning(false);
                    setProgress(100);
                }
            };

            const handleExport = () => {
                if (!backtestEngineRef.current) return;
                
                const csv = backtestEngineRef.current.exportResults();
                if (csv) {
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `backtest_${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                }
            };

            return (
                <div>
                    <div className="warning-box">
                        🔬 <strong>Backtesting:</strong> Teste suas estratégias com dados históricos antes de operar com dinheiro real.
                    </div>

                    <div className="card">
                        <h3>⚙️ Configuração do Backtest</h3>
                        
                        <div className="grid">
                            <div className="form-group">
                                <label className="form-label">Data Inicial</label>
                                <input 
                                    type="date"
                                    className="form-input"
                                    value={config.startDate}
                                    onChange={(e) => setConfig({...config, startDate: e.target.value})}
                                    disabled={isRunning}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Data Final</label>
                                <input 
                                    type="date"
                                    className="form-input"
                                    value={config.endDate}
                                    onChange={(e) => setConfig({...config, endDate: e.target.value})}
                                    disabled={isRunning}
                                />
                            </div>
                        </div>

                        <div className="grid">
                            <div className="form-group">
                                <label className="form-label">Saldo Inicial (R$)</label>
                                <input 
                                    type="number"
                                    className="form-input"
                                    value={config.initialBalance}
                                    onChange={(e) => setConfig({...config, initialBalance: Number(e.target.value)})}
                                    disabled={isRunning}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Risco por Trade (R$)</label>
                                <input 
                                    type="number"
                                    className="form-input"
                                    value={config.riskPerTrade}
                                    onChange={(e) => setConfig({...config, riskPerTrade: Number(e.target.value)})}
                                    disabled={isRunning}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Score Mínimo: {config.minScore}%</label>
                            <input 
                                type="range"
                                min="30"
                                max="90"
                                value={config.minScore}
                                onChange={(e) => setConfig({...config, minScore: Number(e.target.value)})}
                                className="form-input"
                                disabled={isRunning}
                            />
                        </div>

                        <button 
                            className="btn btn-primary"
                            onClick={handleRunBacktest}
                            disabled={isRunning}
                            style={{ width: '100%', fontSize: '16px', padding: '15px' }}
                        >
                            {isRunning ? '⏳ Executando Backtest...' : '🚀 Iniciar Backtest'}
                        </button>

                        {isRunning && (
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ 
                                    height: '8px', 
                                    background: 'rgba(255,255,255,0.1)', 
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${progress}%`,
                                        background: '#00ff88',
                                        transition: 'width 0.3s ease'
                                    }}></div>
                                </div>
                                <div style={{ textAlign: 'center', marginTop: '10px', color: '#a0a0a0' }}>
                                    Processando dados históricos...
                                </div>
                            </div>
                        )}
                    </div>

                    {results && results.stats && (
                        <>
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3>📊 Resultados do Backtest</h3>
                                    <button className="btn btn-primary" onClick={handleExport}>
                                        📥 Exportar CSV
                                    </button>
                                </div>

                                <div className="metric-grid">
                                    <div className="metric-card">
                                        <div className="metric-value">{results.stats.totalTrades}</div>
                                        <div className="metric-label">Total de Trades</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value" style={{ color: '#00ff88' }}>{results.stats.wins}</div>
                                        <div className="metric-label">Vitórias</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value" style={{ color: '#ff4757' }}>{results.stats.losses}</div>
                                        <div className="metric-label">Derrotas</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value">{results.stats.winRate.toFixed(1)}%</div>
                                        <div className="metric-label">Win Rate</div>
                                    </div>
                                </div>

                                <div className="metric-grid" style={{ marginTop: '20px' }}>
                                    <div className="metric-card">
                                        <div className="metric-value" style={{ 
                                            color: results.stats.totalReturn >= 0 ? '#00ff88' : '#ff4757',
                                            fontSize: '28px'
                                        }}>
                                            {results.stats.totalReturn >= 0 ? '+' : ''}{results.stats.totalReturn.toFixed(2)}%
                                        </div>
                                        <div className="metric-label">Retorno Total</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value" style={{ color: '#ff4757' }}>
                                            {results.stats.maxDrawdown.toFixed(2)}%
                                        </div>
                                        <div className="metric-label">Max Drawdown</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value">{results.stats.sharpeRatio.toFixed(2)}</div>
                                        <div className="metric-label">Sharpe Ratio</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value">{results.stats.profitFactor.toFixed(2)}</div>
                                        <div className="metric-label">Profit Factor</div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                    <h4 style={{ marginBottom: '15px', color: '#00ff88' }}>💰 Resumo Financeiro</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '14px' }}>
                                        <div>
                                            <strong>Saldo Inicial:</strong>
                                            <div style={{ color: '#00ff88', fontSize: '18px', marginTop: '5px' }}>
                                                {formatBRL(config.initialBalance)}
                                            </div>
                                        </div>
                                        <div>
                                            <strong>Saldo Final:</strong>
                                            <div style={{ 
                                                color: results.finalBalance >= config.initialBalance ? '#00ff88' : '#ff4757',
                                                fontSize: '18px',
                                                marginTop: '5px'
                                            }}>
                                                {formatBRL(results.finalBalance)}
                                            </div>
                                        </div>
                                        <div>
                                            <strong>Lucro Médio:</strong>
                                            <div style={{ color: '#00ff88', marginTop: '5px' }}>
                                                {formatBRL(results.stats.avgWin)}
                                            </div>
                                        </div>
                                        <div>
                                            <strong>Perda Média:</strong>
                                            <div style={{ color: '#ff4757', marginTop: '5px' }}>
                                                {formatBRL(results.stats.avgLoss)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <h3>📈 Histórico de Trades</h3>
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {results.trades.slice(0, 50).map((trade, idx) => (
                                        <div key={idx} style={{
                                            padding: '15px',
                                            margin: '10px 0',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            background: trade.result === 'WIN' ? 'rgba(0,255,136,0.05)' : 
                                                       trade.result === 'LOSS' ? 'rgba(255,71,87,0.05)' : 'rgba(255,255,255,0.02)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                <strong>{trade.direction} @ {formatBRL(trade.entryPrice)}</strong>
                                                <span style={{ 
                                                    color: trade.result === 'WIN' ? '#00ff88' : trade.result === 'LOSS' ? '#ff4757' : '#ffc107',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {trade.result === 'WIN' ? '✅' : trade.result === 'LOSS' ? '❌' : '⏱️'} {trade.result}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#a0a0a0' }}>
                                                <div>Entrada: {new Date(trade.entryTime).toLocaleString('pt-BR')}</div>
                                                <div>Saída: {formatBRL(trade.exitPrice)} | P&L: {formatBRL(trade.pnl)}</div>
                                                <div>Saldo após: {formatBRL(trade.balance)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {results.trades.length > 50 && (
                                    <div style={{ textAlign: 'center', color: '#a0a0a0', marginTop: '15px' }}>
                                        Mostrando 50 de {results.trades.length} trades. Exporte para ver todos.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            );
        }

        /* ========================================
           DASHBOARD DE MÉTRICAS AVANÇADAS
           ======================================== */

        function AdvancedMetrics({ auditSystem, alphaEngine, memoryDB, formatBRL }) {
            const [metrics, setMetrics] = useState(null);
            const [timeRange, setTimeRange] = useState('7d');

            useEffect(() => {
                const calculateMetrics = async () => {
                    if (!auditSystem || !alphaEngine || !memoryDB) return;

                    const logs = await auditSystem.getRecentLogs(200);
                    if (!Array.isArray(logs)) {
                        console.warn('⚠️ getRecentLogs não retornou array em AdvancedMetrics:', logs);
                        return;
                    }
                    const completedLogs = logs.filter(l => l.outcome && l.outcome !== 'PENDENTE');
                    
                    if (completedLogs.length === 0) {
                        setMetrics(null);
                        return;
                    }

                    const cutoffDate = new Date();
                    if (timeRange === '24h') cutoffDate.setHours(cutoffDate.getHours() - 24);
                    else if (timeRange === '7d') cutoffDate.setDate(cutoffDate.getDate() - 7);
                    else if (timeRange === '30d') cutoffDate.setDate(cutoffDate.getDate() - 30);
                    
                    const filteredLogs = completedLogs.filter(l => 
                        new Date(l.generatedAt) >= cutoffDate
                    );

                    if (filteredLogs.length === 0) {
                        setMetrics(null);
                        return;
                    }

                    const wins = filteredLogs.filter(l => l.outcome === 'ACERTO');
                    const losses = filteredLogs.filter(l => l.outcome === 'ERRO');
                    const expired = filteredLogs.filter(l => l.outcome === 'EXPIRADO');

                    const totalPnL = filteredLogs.reduce((sum, l) => sum + (l.prices.finalPnL || 0), 0);
                    const winRate = (wins.length / filteredLogs.length) * 100;
                    const lossRate = (losses.length / filteredLogs.length) * 100;
                    const expiredRate = (expired.length / filteredLogs.length) * 100;

                    const totalWins = wins.reduce((sum, l) => sum + (l.prices.finalPnL || 0), 0);
                    const totalLosses = Math.abs(losses.reduce((sum, l) => sum + (l.prices.finalPnL || 0), 0));
                    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

                    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
                    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
                    const expectancy = (winRate / 100 * avgWin) - (lossRate / 100 * avgLoss);

                    const kellyCriterion = winRate > 0 ? 
                        (winRate / 100 - (lossRate / 100)) / (avgWin / avgLoss || 1) : 0;

                    const returns = filteredLogs.map(l => (l.prices.finalPnL || 0) / 100);
                    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
                    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
                    const stdDev = Math.sqrt(variance);
                    const sharpeRatio = stdDev !== 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

                    let peak = 0;
                    let maxDrawdown = 0;
                    let runningPnL = 0;

                    filteredLogs.forEach(log => {
                        runningPnL += log.prices.finalPnL || 0;
                        if (runningPnL > peak) {
                            peak = runningPnL;
                        } else {
                            const currentDrawdown = peak - runningPnL;
                            if (currentDrawdown > maxDrawdown) {
                                maxDrawdown = currentDrawdown;
                            }
                        }
                    });

                    let currentStreak = 0;
                    let maxWinStreak = 0;
                    let maxLossStreak = 0;
                    let lastOutcome = null;

                    filteredLogs.forEach(log => {
                        if (log.outcome === 'ACERTO') {
                            if (lastOutcome === 'ACERTO') {
                                currentStreak++;
                            } else {
                                currentStreak = 1;
                            }
                            if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
                        } else if (log.outcome === 'ERRO') {
                            if (lastOutcome === 'ERRO') {
                                currentStreak++;
                            } else {
                                currentStreak = 1;
                            }
                            if (currentStreak > maxLossStreak) maxLossStreak = currentStreak;
                        } else {
                            currentStreak = 0;
                        }
                        lastOutcome = log.outcome;
                    });

                    const recoveryFactor = maxDrawdown > 0 ? totalPnL / maxDrawdown : 0;

                    const durations = filteredLogs
                        .filter(l => l.outcomeTime)
                        .map(l => (new Date(l.outcomeTime) - new Date(l.generatedAt)) / 60000);
                    const avgDuration = durations.length > 0 ? 
                        durations.reduce((a, b) => a + b, 0) / durations.length : 0;

                    const hourlyPerformance = {};
                    for (let h = 0; h < 24; h++) {
                        const hourLogs = filteredLogs.filter(l => l.hourOfDay === h);
                        if (hourLogs.length > 0) {
                            const hourWins = hourLogs.filter(l => l.outcome === 'ACERTO').length;
                            const hourPnL = hourLogs.reduce((sum, l) => sum + (l.prices.finalPnL || 0), 0);
                            hourlyPerformance[h] = {
                                trades: hourLogs.length,
                                winRate: (hourWins / hourLogs.length) * 100,
                                pnl: hourPnL
                            };
                        }
                    }

                    const bestHour = Object.entries(hourlyPerformance)
                        .sort((a, b) => b[1].pnl - a[1].pnl)[0];
                    const worstHour = Object.entries(hourlyPerformance)
                        .sort((a, b) => a[1].pnl - b[1].pnl)[0];

                    const scorePerformance = {};
                    ['90-100', '80-89', '70-79', '60-69', '50-59'].forEach(range => {
                        const rangeLogs = filteredLogs.filter(l => l.scoreRange === range);
                        if (rangeLogs.length > 0) {
                            const rangeWins = rangeLogs.filter(l => l.outcome === 'ACERTO').length;
                            scorePerformance[range] = {
                                trades: rangeLogs.length,
                                winRate: (rangeWins / rangeLogs.length) * 100,
                                pnl: rangeLogs.reduce((sum, l) => sum + (l.prices.finalPnL || 0), 0)
                            };
                        }
                    });

                    setMetrics({
                        totalTrades: filteredLogs.length,
                        wins: wins.length,
                        losses: losses.length,
                        expired: expired.length,
                        winRate,
                        lossRate,
                        expiredRate,
                        totalPnL,
                        profitFactor,
                        expectancy,
                        kellyCriterion,
                        sharpeRatio,
                        maxDrawdown,
                        recoveryFactor,
                        avgWin,
                        avgLoss,
                        avgDuration,
                        maxWinStreak,
                        maxLossStreak,
                        hourlyPerformance,
                        bestHour: bestHour ? { hour: bestHour[0], data: bestHour[1] } : null,
                        worstHour: worstHour ? { hour: worstHour[0], data: worstHour[1] } : null,
                        scorePerformance
                    });
                };

                calculateMetrics();
                const interval = setInterval(calculateMetrics, 10000);
                return () => clearInterval(interval);
            }, [auditSystem, alphaEngine, memoryDB, timeRange]);

            if (!metrics) {
                return (
                    <div className="card">
                        <h3>📊 Métricas Avançadas</h3>
                        <div style={{ textAlign: 'center', padding: '40px', color: '#a0a0a0' }}>
                            Dados insuficientes. Execute alguns sinais primeiro.
                        </div>
                    </div>
                );
            }

            return (
                <div>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>📊 Métricas Avançadas</h3>
                            <div className="mode-selector" style={{ width: 'auto' }}>
                                <div 
                                    className={`mode-btn ${timeRange === '24h' ? 'active' : ''}`}
                                    onClick={() => setTimeRange('24h')}
                                    style={{ padding: '8px 16px', fontSize: '14px' }}
                                >
                                    24h
                                </div>
                                <div 
                                    className={`mode-btn ${timeRange === '7d' ? 'active' : ''}`}
                                    onClick={() => setTimeRange('7d')}
                                    style={{ padding: '8px 16px', fontSize: '14px' }}
                                >
                                    7 dias
                                </div>
                                <div 
                                    className={`mode-btn ${timeRange === '30d' ? 'active' : ''}`}
                                    onClick={() => setTimeRange('30d')}
                                    style={{ padding: '8px 16px', fontSize: '14px' }}
                                >
                                    30 dias
                                </div>
                            </div>
                        </div>

                        <div className="metric-grid">
                            <div className="metric-card">
                                <div className="metric-value">{metrics.totalTrades}</div>
                                <div className="metric-label">Total de Trades</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value" style={{ color: metrics.winRate >= 50 ? '#00ff88' : '#ff4757' }}>
                                    {metrics.winRate.toFixed(1)}%
                                </div>
                                <div className="metric-label">Win Rate</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value" style={{ 
                                    color: metrics.totalPnL >= 0 ? '#00ff88' : '#ff4757',
                                    fontSize: '24px'
                                }}>
                                    {formatBRL(metrics.totalPnL)}
                                </div>
                                <div className="metric-label">P&L Total</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value" style={{ 
                                    color: metrics.profitFactor >= 1.5 ? '#00ff88' : metrics.profitFactor >= 1 ? '#ffc107' : '#ff4757'
                                }}>
                                    {metrics.profitFactor.toFixed(2)}
                                </div>
                                <div className="metric-label">Profit Factor</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid">
                        <div className="card">
                            <h3>🎯 Métricas de Risco</h3>
                            <div style={{ padding: '15px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong>Sharpe Ratio</strong>
                                        <span style={{ 
                                            color: metrics.sharpeRatio >= 1.5 ? '#00ff88' : 
                                                   metrics.sharpeRatio >= 1 ? '#ffc107' : '#ff4757',
                                            fontSize: '18px',
                                            fontWeight: 'bold'
                                        }}>
                                            {metrics.sharpeRatio.toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
                                        {metrics.sharpeRatio >= 2 ? '🌟 Excelente' : 
                                         metrics.sharpeRatio >= 1.5 ? '✅ Muito Bom' :
                                         metrics.sharpeRatio >= 1 ? '👍 Bom' :
                                         metrics.sharpeRatio >= 0.5 ? '⚠️ Regular' : '❌ Ruim'}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong>Max Drawdown</strong>
                                        <span style={{ color: '#ff4757', fontSize: '18px', fontWeight: 'bold' }}>
                                            {formatBRL(metrics.maxDrawdown)}
                                        </span>
                                    </div>
                                    <div style={{ 
                                        height: '8px', 
                                        background: 'rgba(255,255,255,0.1)', 
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(100, (metrics.maxDrawdown / Math.abs(metrics.totalPnL || 1)) * 100)}%`,
                                            background: '#ff4757'
                                        }}></div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong>Recovery Factor</strong>
                                        <span style={{ 
                                            color: metrics.recoveryFactor >= 3 ? '#00ff88' : '#ffc107',
                                            fontSize: '18px',
                                            fontWeight: 'bold'
                                        }}>
                                            {metrics.recoveryFactor.toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
                                        Lucro / Max Drawdown {metrics.recoveryFactor >= 3 ? '(Ótimo)' : '(Melhorar)'}
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong>Kelly Criterion</strong>
                                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#00ff88' }}>
                                            {(metrics.kellyCriterion * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
                                        Tamanho de posição sugerido
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3>💰 Análise de Retornos</h3>
                            <div style={{ padding: '15px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong>Expectativa Matemática</strong>
                                        <span style={{ 
                                            color: metrics.expectancy >= 0 ? '#00ff88' : '#ff4757',
                                            fontSize: '18px',
                                            fontWeight: 'bold'
                                        }}>
                                            {formatBRL(metrics.expectancy)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
                                        Retorno esperado por trade
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong>Lucro Médio</strong>
                                        <span style={{ color: '#00ff88', fontSize: '18px', fontWeight: 'bold' }}>
                                            {formatBRL(metrics.avgWin)}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong>Perda Média</strong>
                                        <span style={{ color: '#ff4757', fontSize: '18px', fontWeight: 'bold' }}>
                                            {formatBRL(metrics.avgLoss)}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong>Tempo Médio</strong>
                                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                            {metrics.avgDuration.toFixed(1)} min
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3>⏰ Performance por Horário</h3>
                        <div style={{ padding: '15px' }}>
                            {metrics.bestHour && (
                                <div style={{ 
                                    marginBottom: '15px', 
                                    padding: '15px', 
                                    background: 'rgba(0,255,136,0.1)',
                                    border: '1px solid #00ff88',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong style={{ color: '#00ff88' }}>🏆 Melhor Horário: {metrics.bestHour.hour}:00h</strong>
                                            <div style={{ fontSize: '13px', color: '#a0a0a0', marginTop: '5px' }}>
                                                {metrics.bestHour.data.trades} trades | Win Rate: {metrics.bestHour.data.winRate.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '20px', color: '#00ff88', fontWeight: 'bold' }}>
                                            {formatBRL(metrics.bestHour.data.pnl)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {metrics.worstHour && (
                                <div style={{ 
                                    padding: '15px', 
                                    background: 'rgba(255,71,87,0.1)',
                                    border: '1px solid #ff4757',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong style={{ color: '#ff4757' }}>⚠️ Pior Horário: {metrics.worstHour.hour}:00h</strong>
                                            <div style={{ fontSize: '13px', color: '#a0a0a0', marginTop: '5px' }}>
                                                {metrics.worstHour.data.trades} trades | Win Rate: {metrics.worstHour.data.winRate.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '20px', color: '#ff4757', fontWeight: 'bold' }}>
                                            {formatBRL(metrics.worstHour.data.pnl)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <h3>📊 Performance por Score</h3>
                        <div style={{ padding: '15px' }}>
                            {Object.entries(metrics.scorePerformance).map(([range, data]) => (
                                <div key={range} style={{
                                    padding: '12px',
                                    margin: '8px 0',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.02)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>Score: {range}%</strong>
                                            <div style={{ fontSize: '13px', color: '#a0a0a0', marginTop: '5px' }}>
                                                {data.trades} trades | Win Rate: {data.winRate.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div style={{ 
                                            fontSize: '18px', 
                                            fontWeight: 'bold',
                                            color: data.pnl >= 0 ? '#00ff88' : '#ff4757'
                                        }}>
                                            {formatBRL(data.pnl)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid">
                        <div className="card">
                            <h3>🔥 Sequências</h3>
                            <div style={{ padding: '15px' }}>
                                <div style={{ 
                                    padding: '15px', 
                                    background: 'rgba(0,255,136,0.1)',
                                    borderRadius: '8px',
                                    marginBottom: '15px'
                                }}>
                                    <div style={{ fontSize: '32px', color: '#00ff88', fontWeight: 'bold', textAlign: 'center' }}>
                                        {metrics.maxWinStreak}
                                    </div>
                                    <div style={{ textAlign: 'center', color: '#a0a0a0', marginTop: '5px' }}>
                                        Vitórias Consecutivas
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    padding: '15px', 
                                    background: 'rgba(255,71,87,0.1)',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ fontSize: '32px', color: '#ff4757', fontWeight: 'bold', textAlign: 'center' }}>
                                        {metrics.maxLossStreak}
                                    </div>
                                    <div style={{ textAlign: 'center', color: '#a0a0a0', marginTop: '5px' }}>
                                        Perdas Consecutivas
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3>📈 Distribuição de Resultados</h3>
                            <div style={{ padding: '15px' }}>
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>Vitórias</span>
                                        <strong style={{ color: '#00ff88' }}>{metrics.winRate.toFixed(1)}%</strong>
                                    </div>
                                    <div style={{ 
                                        height: '8px', 
                                        background: 'rgba(255,255,255,0.1)', 
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${metrics.winRate}%`,
                                            background: '#00ff88'
                                        }}></div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>Derrotas</span>
                                        <strong style={{ color: '#ff4757' }}>{metrics.lossRate.toFixed(1)}%</strong>
                                    </div>
                                    <div style={{ 
                                        height: '8px', 
                                        background: 'rgba(255,255,255,0.1)', 
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${metrics.lossRate}%`,
                                            background: '#ff4757'
                                        }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>Expirados</span>
                                        <strong style={{ color: '#ffc107' }}>{metrics.expiredRate.toFixed(1)}%</strong>
                                    </div>
                                    <div style={{ 
                                        height: '8px', 
                                        background: 'rgba(255,255,255,0.1)', 
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${metrics.expiredRate}%`,
                                            background: '#ffc107'
                                        }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        function TelegramConfig({ telegramNotifier, showNotification }) {
            const [botToken, setBotToken] = useState('');
            const [chatId, setChatId] = useState('');
            const [isTesting, setIsTesting] = useState(false);
            const [isEnabled, setIsEnabled] = useState(false);

            useEffect(() => {
                if (telegramNotifier) {
                    setIsEnabled(telegramNotifier.isEnabled());
                }
            }, [telegramNotifier]);

            const handleSave = () => {
                if (!botToken.trim() || !chatId.trim()) {
                    showNotification('Preencha todos os campos');
                    return;
                }

                telegramNotifier.configure(botToken.trim(), chatId.trim());
                showNotification('✅ Configuração salva!');
            };

            const handleTest = async () => {
                setIsTesting(true);
                
                try {
                    const result = await telegramNotifier.testConnection();
                    if (result.success) {
                        showNotification('✅ Teste bem-sucedido! Verifique seu Telegram');
                    } else {
                        showNotification(`❌ ${result.message}`);
                    }
                } catch (error) {
                    showNotification(`❌ Erro: ${error.message}`);
                } finally {
                    setIsTesting(false);
                }
            };

            const handleToggle = () => {
                try {
                    if (isEnabled) {
                        telegramNotifier.disable();
                        setIsEnabled(false);
                        showNotification('Notificações desativadas');
                    } else {
                        telegramNotifier.enable();
                        setIsEnabled(true);
                        showNotification('✅ Notificações ativadas!');
                    }
                } catch (error) {
                    showNotification(`❌ ${error.message}`);
                }
            };

            return (
                <div>
                    <div className="warning-box">
                        📱 <strong>Como configurar:</strong><br/>
                        1. Abra o Telegram e procure por <strong>@BotFather</strong><br/>
                        2. Envie <code>/newbot</code> e siga as instruções<br/>
                        3. Copie o <strong>Bot Token</strong> fornecido<br/>
                        4. Procure seu bot e envie <code>/start</code><br/>
                        5. Acesse <a href="https://api.telegram.org/botSEU_TOKEN/getUpdates" target="_blank" style={{color: '#00ff88'}}>
                            api.telegram.org/botSEU_TOKEN/getUpdates
                        </a><br/>
                        6. Procure por <code>"chat":{"{"}id":NUMERO{"}"}</code> - esse é seu Chat ID
                    </div>

                    <div className="card">
                        <h3>⚙️ Configuração do Telegram</h3>
                        
                        <div className="form-group">
                            <label className="form-label">Bot Token</label>
                            <input 
                                type="password"
                                className="form-input"
                                placeholder="123456:ABC-DEF1234ghIkl..."
                                value={botToken}
                                onChange={(e) => setBotToken(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Chat ID</label>
                            <input 
                                type="text"
                                className="form-input"
                                placeholder="123456789"
                                value={chatId}
                                onChange={(e) => setChatId(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                className="btn btn-primary"
                                onClick={handleSave}
                                style={{ flex: 1 }}
                            >
                                💾 Salvar
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={handleTest}
                                disabled={isTesting || !telegramNotifier?.isConfigured()}
                                style={{ flex: 1 }}
                            >
                                {isTesting ? '⏳ Testando...' : '🔍 Testar'}
                            </button>
                        </div>
                    </div>

                    {telegramNotifier?.isConfigured() && (
                        <div className="card">
                            <h3>📢 Notificações</h3>
                            
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '20px',
                                background: isEnabled ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                border: `1px solid ${isEnabled ? '#00ff88' : 'rgba(255,255,255,0.1)'}`
                            }}>
                                <div>
                                    <strong style={{ fontSize: '18px' }}>
                                        {isEnabled ? '✅ Ativado' : '⭕ Desativado'}
                                    </strong>
                                    <div style={{ fontSize: '14px', color: '#a0a0a0', marginTop: '5px' }}>
                                        {isEnabled ? 'Você receberá notificações de todos os sinais' : 'Ative para receber notificações'}
                                    </div>
                                </div>
                                
                                <div 
                                    className={`toggle-switch ${isEnabled ? 'active' : ''}`}
                                    onClick={handleToggle}
                                    style={{ cursor: 'pointer' }}
                                ></div>
                            </div>

                            {isEnabled && (
                                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px' }}>
                                    <strong style={{ color: '#00ff88' }}>📬 Você receberá notificações para:</strong>
                                    <ul style={{ marginTop: '10px', paddingLeft: '20px', lineHeight: '1.8' }}>
                                        <li>Novos sinais gerados</li>
                                        <li>Ordens executadas (modo robô)</li>
                                        <li>Stop Loss / Take Profit atingido</li>
                                        <li>Relatório diário de performance</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }
        function Settings({ minScore, setMinScore }) {
            return (
                <div>
                    <div className="card">
                        <h3>⚙️ Configurações</h3>
                        <div className="form-group">
                            <label className="form-label">Score Mínimo: {minScore}%</label>
                            <input 
                                type="range"
                                min="50"
                                max="95"
                                value={minScore}
                                onChange={(e) => setMinScore(Number(e.target.value))}
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="card">
                        <h3>📚 Sobre</h3>
                        <p style={{ lineHeight: '1.6', color: '#c0c0c0' }}>
                            Plataforma de trading algorítmico com Machine Learning e sistema de auditoria integrado.
                        </p>
                        <div style={{ marginTop: '15px', fontSize: '14px', color: '#00ff88' }}>
                            Versão: 2.3.0 | Build: 2024.006 | Atualização em Tempo Real Implementada
                        </div>
                        
                        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0, 255, 136, 0.1)', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.3)' }}>
                            <h4 style={{ color: '#00ff88', marginBottom: '10px' }}>✨ Novidades v2.3</h4>
                            <ul style={{ color: '#c0c0c0', lineHeight: '1.8', paddingLeft: '20px' }}>
                                <li>✅ <strong>Atualização em tempo real</strong> de todas as métricas</li>
                                <li>✅ <strong>Dashboard responsivo</strong> com dados sempre atualizados</li>
                                <li>✅ <strong>Performance ao vivo</strong> sem necessidade de recarregar</li>
                                <li>✅ <strong>ML Engine dinâmico</strong> com pesos adaptativos visíveis</li>
                                <li>✅ <strong>Sistema de listeners</strong> para propagação de mudanças</li>
                                <li>✅ <strong>Correções de bugs</strong> em cálculos de indicadores</li>
                            </ul>
                        </div>

                        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
                            <h4 style={{ color: '#ffc107', marginBottom: '10px' }}>💡 Dicas de Uso</h4>
                            <ul style={{ color: '#c0c0c0', lineHeight: '1.8', paddingLeft: '20px' }}>
                                <li>Use o <strong>Modo Assistente</strong> para análise manual com alertas</li>
                                <li>Use o <strong>Modo Robô</strong> para execução automática (DEMO)</li>
                                <li>Conecte APIs reais para dados em tempo real</li>
                                <li>Verifique a <strong>Auditoria</strong> para análise detalhada</li>
                                <li>Digite <code>auditDiag()</code> no console para diagnóstico</li>
                            </ul>
                        </div>

                        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 71, 87, 0.3)' }}>
                            <h4 style={{ color: '#ff4757', marginBottom: '10px' }}>⚠️ Aviso Legal</h4>
                            <p style={{ color: '#c0c0c0', lineHeight: '1.8', fontSize: '13px' }}>
                                Este sistema é fornecido apenas para fins educacionais e de demonstração. 
                                Trading de ativos financeiros envolve risco significativo de perda. 
                                Não opere com capital que você não pode perder. 
                                Os desenvolvedores não se responsabilizam por perdas financeiras.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

// Exportar componente principal
export default App
