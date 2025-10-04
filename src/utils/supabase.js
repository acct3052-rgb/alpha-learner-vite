import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL ou Key não configurados!')
    console.error('VITE_SUPABASE_URL:', supabaseUrl)
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'definido' : 'undefined')
    throw new Error('Por favor, configure as variáveis de ambiente no arquivo .env')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

console.log('✅ Supabase inicializado')
