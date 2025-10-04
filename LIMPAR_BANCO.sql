-- ============================================
-- SCRIPT PARA LIMPAR BANCO DE DADOS SUPABASE
-- Execute este script no Supabase SQL Editor
-- ============================================

-- 1. Limpar tabela de sinais
DELETE FROM signals;

-- 2. Limpar tabela de logs de auditoria
DELETE FROM audit_logs;

-- 3. Limpar conexões de API (OPCIONAL - descomente se quiser resetar)
-- DELETE FROM api_connections;

-- 4. Limpar configurações do Telegram (OPCIONAL - descomente se quiser resetar)
-- DELETE FROM telegram_config;

-- 5. Resetar sequências/auto-increment (se houver)
-- ALTER SEQUENCE signals_id_seq RESTART WITH 1;

-- 6. Verificar tabelas vazias
SELECT 'signals' as tabela, COUNT(*) as registros FROM signals
UNION ALL
SELECT 'audit_logs' as tabela, COUNT(*) as registros FROM audit_logs
UNION ALL
SELECT 'api_connections' as tabela, COUNT(*) as registros FROM api_connections
UNION ALL
SELECT 'telegram_config' as tabela, COUNT(*) as registros FROM telegram_config;

-- ============================================
-- CONFIRMAÇÃO
-- ============================================
SELECT 'Banco de dados limpo com sucesso!' as status;
