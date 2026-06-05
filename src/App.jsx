import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Autenticacao from './pages/Autenticacao'
import FormularioPost from './components/FormularioPost'
import ListaDePosts from './components/ListaDePosts'

// ---------------------------------------------------------------------------
// FLUXO DE AUTENTICAÇÃO
//
// 1. Ao abrir o app, getSession() verifica se há sessão ativa no browser
//    (o Supabase guarda o token no localStorage automaticamente).
//
// 2. onAuthStateChange escuta QUALQUER mudança de auth em tempo real:
//    - SIGNED_IN       → usuário fez login
//    - SIGNED_OUT      → usuário fez logout
//    - TOKEN_REFRESHED → token renovado automaticamente (transparente)
//
// 3. usuario = null  → mostra <Autenticacao />
//    usuario existe  → mostra o mural
//
// O App nunca precisa "verificar" manualmente se o usuário está logado —
// o listener cuida disso e atualiza o estado React automaticamente.
// ---------------------------------------------------------------------------

function mapearPost(postDoBanco) {
  return {
    id:        postDoBanco.id,
    userId:    postDoBanco.user_id,     // UUID do dono do post (auth.users)
    autor:     postDoBanco.autor,
    conteudo:  postDoBanco.conteudo,
    imagemUrl: postDoBanco.imagem_url,
    curtidas:  postDoBanco.curtidas,
    criadoEm:  new Date(postDoBanco.criado_em),
  }
}

export default function App() {
  const [usuario, setUsuario]       = useState(null)
  const [posts, setPosts]           = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]             = useState(null)

  // ─── Autenticação ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Verifica sessão salva no browser ao abrir o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      if (session?.user) buscarPosts()
      else setCarregando(false)
    })

    // Escuta login, logout e refresh de token em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUsuario(session?.user ?? null)
        if (session?.user) {
          buscarPosts()
        } else {
          setPosts([])
          setCarregando(false)
        }
      }
    )

    // Cleanup: cancela o listener quando o componente desmonta (evita memory leak)
    return () => subscription.unsubscribe()
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    // onAuthStateChange detecta o SIGNED_OUT e reseta o estado automaticamente
  }

  // ─── Posts ────────────────────────────────────────────────────────────────
  async function buscarPosts() {
    setCarregando(true)
    setErro(null)

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error) {
      setErro('Não foi possível carregar os posts.')
      console.error(error)
    } else {
      setPosts(data.map(mapearPost))
    }
    setCarregando(false)
  }

  async function criarPost({ conteudo, imagemUrl }) {
    // O nome do autor vem do perfil — não precisa digitar no formulário
    const autor = usuario.user_metadata?.nome_exibicao ?? usuario.email

    const { data, error } = await supabase
      .from('posts')
      .insert([{
        user_id:    usuario.id,         // necessário para a policy "criacao autenticada"
        autor,
        conteudo,
        imagem_url: imagemUrl || null,
      }])
      .select()
      .single()

    if (!error) setPosts([mapearPost(data), ...posts])
    else console.error('Erro ao criar post:', error)
  }

  async function curtirPost(id) {
    // Atualização otimista: atualiza a tela antes de esperar o banco
    setPosts(posts.map(p =>
      p.id === id ? { ...p, curtidas: p.curtidas + 1 } : p
    ))
    const postAtual = posts.find(p => p.id === id)
    const { error } = await supabase
      .from('posts')
      .update({ curtidas: postAtual.curtidas + 1 })
      .eq('id', id)

    if (error) {
      console.error('Erro ao curtir:', error)
      setPosts(posts.map(p =>
        p.id === id ? { ...p, curtidas: postAtual.curtidas } : p
      ))
    }
  }

  async function deletarPost(id) {
    // Atualização otimista: remove da tela imediatamente
    setPosts(posts.filter(p => p.id !== id))

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
    // Se o usuário não for o dono, a policy RLS bloqueia no banco

    if (error) {
      console.error('Erro ao deletar:', error)
      buscarPosts()
    }
  }

  // ─── Renderização ─────────────────────────────────────────────────────────

  if (!usuario && carregando) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Carregando...</p>
      </div>
    )
  }

  if (!usuario) return <Autenticacao />

  const nomeUsuario = usuario.user_metadata?.nome_exibicao ?? usuario.email

  return (
    <div className="bg-gray-100 min-h-screen font-sans">

      <header className="bg-white sticky top-0 z-10 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600">📋 Mural da Turma</h1>
            <p className="text-sm text-gray-500">Compartilhe algo com a galera</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-700 text-sm font-semibold
                             px-3 py-1 rounded-full hidden sm:block">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </span>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-0.5">Olá, {nomeUsuario}</p>
              <button
                onClick={sair}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <FormularioPost onCriar={criarPost} usuario={usuario} />

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            ⚠️ {erro}
          </div>
        )}

        <ListaDePosts
          posts={posts}
          carregando={carregando}
          usuarioId={usuario.id}
          onCurtir={curtirPost}
          onDeletar={deletarPost}
        />
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        Feito com 💜 no curso Do Zero ao Deploy
      </footer>
    </div>
  )
}
