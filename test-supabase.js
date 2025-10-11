import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kxcsmkwnxdeiaifbnecx.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Y3Nta3dueGRlaWFpZmJuZWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMzU5NTAsImV4cCI6MjA3NTYxMTk1MH0.rxTmiqvcJ0bxuqn1iWnM8PNDoG_tDmu62KGxoz0KuuI'

console.log('📍 URL Supabase:', supabaseUrl)
console.log('🔑 Key definida:', supabaseKey ? 'SIM' : 'NÃO')

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
