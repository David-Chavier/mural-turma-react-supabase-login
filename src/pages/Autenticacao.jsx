import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ---------------------------------------------------------------------------
// PÁGINA DE AUTENTICAÇÃO
//
// Combina login e registro em uma única tela.
// O estado `modo` alterna entre as duas.
//
// Supabase Auth — funções usadas:
//   signInWithPassword({ email, password }) → loga com email + senha
//   signUp({ email, password, options })    → cria conta nova
//     options.data.nome_exibicao → salvo em user.user_metadata.nome_exibicao
//
// Após login bem-sucedido, o onAuthStateChange no App.jsx detecta a sessão
// e renderiza o mural automaticamente — não precisamos fazer nada aqui.
// ---------------------------------------------------------------------------

export default function Autenticacao() {
  const [modo, setModo]         = useState('login')  // 'login' | 'registro'
  const [nome, setNome]         = useState('')        // só no registro
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro]         = useState(null)
  const [sucesso, setSucesso]   = useState(null)

  // ─── Entrar ───────────────────────────────────────────────────────────────
  async function entrar() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      // Traduz as mensagens de erro mais comuns para português
      if (error.message.includes('Invalid login credentials')) {
        setErro('E-mail ou senha incorretos.')
      } else {
        setErro(error.message)
      }
    }
    // Se ok: onAuthStateChange no App.jsx detecta e muda a tela automaticamente
  }

  // ─── Registrar ────────────────────────────────────────────────────────────
  async function registrar() {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        // user_metadata é um objeto livre — guardamos o nome de exibição aqui
        // Acessado depois via usuario.user_metadata.nome_exibicao
        data: { nome_exibicao: nome.trim() },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setErro('Este e-mail já está cadastrado. Tente fazer login.')
      } else {
        setErro(error.message)
      }
    } else {
      // Volta pro modo login com mensagem de sucesso
      setModo('login')
      setErro(null)
      setSucesso('Conta criada com sucesso! Faça login para continuar.')
      setSenha('')
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(evento) {
    evento.preventDefault()
    setErro(null)
    setSucesso(null)
    setCarregando(true)

    if (modo === 'login') await entrar()
    else await registrar()

    setCarregando(false)
  }

  function alternarModo() {
    setModo(modo === 'login' ? 'registro' : 'login')
    setErro(null)
    setSucesso(null)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">

        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 mb-1">📋 Mural da Turma</h1>
          <p className="text-gray-500 text-sm">
            {modo === 'login' ? 'Entre para compartilhar com a galera' : 'Crie sua conta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Campo nome — só no registro */}
          {modo === 'registro' && (
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Seu nome no mural
              </label>
              <input
                type="text"
                id="nome"
                placeholder="Ex: Ana Beatriz"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                maxLength={50}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-400
                           placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Esse nome vai aparecer nos seus posts
              </p>
            </div>
          )}

          {/* E-mail */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-400
                         placeholder:text-gray-400"
            />
          </div>

          {/* Senha */}
          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              id="senha"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-400
                         placeholder:text-gray-400"
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              ⚠️ {erro}
            </div>
          )}

          {/* Mensagem de sucesso */}
          {sucesso && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
              ✅ {sucesso}
            </div>
          )}

          {/* Botão submit */}
          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                       py-2 px-4 rounded-lg transition-colors cursor-pointer
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando
              ? (modo === 'login' ? 'Entrando...' : 'Criando conta...')
              : (modo === 'login' ? 'Entrar' : 'Criar conta')
            }
          </button>

        </form>

        {/* Alternar entre login e registro */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {modo === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            onClick={alternarModo}
            className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            {modo === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>

      </div>
    </div>
  )
}
