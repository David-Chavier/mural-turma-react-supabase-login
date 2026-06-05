import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// CLIENTE SUPABASE
//
// createClient recebe dois argumentos:
//   1. A URL do seu projeto Supabase
//   2. A anon key (chave pública — segura com RLS ativado)
//
// import.meta.env.VITE_* → forma como o Vite lê variáveis do arquivo .env
// O prefixo VITE_ é obrigatório: sem ele, a variável não chega ao browser.
//
// Em produção (Vercel), essas variáveis são configuradas no painel do projeto,
// não no código. Por isso o .env nunca vai pro repositório.
// ---------------------------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// Aviso no console se as variáveis não estiverem configuradas
if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Variáveis de ambiente do Supabase não encontradas.\n' +
    'Crie um arquivo .env na raiz do projeto com:\n' +
    'VITE_SUPABASE_URL=...\n' +
    'VITE_SUPABASE_KEY=...'
  )
}

// Exportamos o cliente para ser usado em qualquer componente que precisar
export const supabase = createClient(supabaseUrl, supabaseKey)
