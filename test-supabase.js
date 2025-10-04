import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eamgmklplhbbdzflsxji.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbWdta2xwbGhiYmR6ZmxzeGppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NjI4NzQsImV4cCI6MjA3NTAzODg3NH0.nfcYiq8MQMPJOB8RaXhMofSeE_xZMM2mbpV7NFWK5ms'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Testando conexão Supabase...')

// Testar leitura da tabela signals
const { data, error } = await supabase
  .from('signals')
  .select('*')
  .limit(5)

if (error) {
  console.error('❌ Erro ao buscar signals:', error)
} else {
  console.log('✅ Signals encontrados:', data.length)
  console.log('Dados:', data)
}

// Testar inserção
const testSignal = {
  id: Date.now() + Math.random(),
  type: 'CALL',
  pair: 'BTCUSDT',
  price: 50000,
  score: 75,
  ml_prediction: 0.8,
  created_at: new Date().toISOString(),
  status: 'PENDENTE'
}

const { data: inserted, error: insertError } = await supabase
  .from('signals')
  .insert([testSignal])
  .select()

if (insertError) {
  console.error('❌ Erro ao inserir:', insertError)
} else {
  console.log('✅ Sinal inserido:', inserted)
}
