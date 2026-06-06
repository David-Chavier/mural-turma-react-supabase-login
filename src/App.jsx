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

// Converte um registro do banco para o formato do React.
// `idsCurtidosPeloUsuario` é um Set com os IDs dos posts que o usuário logado curtiu.
//
// Sobre as curtidas:
//   - O total NÃO vem mais de uma coluna na tabela posts.
//   - Vem CONTADO da tabela 'curtidas' via agregação: select('*, curtidas(count)')
//   - O Supabase retorna isso como um array: postDoBanco.curtidas = [{ count: 5 }]
//   - Por isso lemos postDoBanco.curtidas[0]?.count
function mapearPost(postDoBanco, idsCurtidosPeloUsuario) {
  return {
    id:         postDoBanco.id,
    userId:     postDoBanco.user_id,
    autor:      postDoBanco.autor,
    conteudo:   postDoBanco.conteudo,
    imagemUrl:  postDoBanco.imagem_url,
    curtidas:   postDoBanco.curtidas[0]?.count ?? 0,      // total de curtidas (contado)
    euCurti:    idsCurtidosPeloUsuario.has(postDoBanco.id), // o usuário atual curtiu?
    criadoEm:   new Date(postDoBanco.criado_em),
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

    // Passo 1: busca os posts JÁ com a contagem de curtidas.
    // 'curtidas(count)' é uma agregação: o Supabase conta quantas linhas
    // da tabela 'curtidas' apontam para cada post. Funciona porque criamos
    // a foreign key curtidas.post_id → posts.id.
    const { data: dadosPosts, error: erroPosts } = await supabase
      .from('posts')
      .select('*, curtidas(count)')
      .order('criado_em', { ascending: false })

    if (erroPosts) {
      setErro('Não foi possível carregar os posts.')
      console.error(erroPosts)
      setCarregando(false)
      return
    }

    // Passo 2: descobre quais posts ESTE usuário já curtiu.
    // Buscamos só as curtidas dele e montamos um Set com os post_id.
    // Set permite checar "este post está curtido?" de forma rápida (.has()).
    const { data: minhasCurtidas } = await supabase
      .from('curtidas')
      .select('post_id')
      .eq('user_id', usuario.id)

    const idsCurtidos = new Set((minhasCurtidas ?? []).map(c => c.post_id))

    // Passo 3: mapeia cada post, marcando se o usuário curtiu
    setPosts(dadosPosts.map(p => mapearPost(p, idsCurtidos)))
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
      .select('*, curtidas(count)')     // já traz a contagem (zero) no formato esperado
      .single()

    if (!error) {
      // Post novo: 0 curtidas e o usuário ainda não curtiu (Set vazio)
      setPosts([mapearPost(data, new Set()), ...posts])
    } else {
      console.error('Erro ao criar post:', error)
    }
  }

  // ─── Curtir / descurtir (toggle) ────────────────────────────────────────────
  // Agora cada curtida é uma LINHA na tabela 'curtidas' (post_id + user_id).
  // A restrição UNIQUE(post_id, user_id) no banco garante 1 curtida por pessoa.
  //
  // Se o usuário já curtiu  → remove a linha (descurtir)
  // Se ainda não curtiu     → insere a linha (curtir)
  async function alternarCurtida(id) {
    const post = posts.find(p => p.id === id)
    const jaCurtiu = post.euCurti

    // Atualização otimista: muda o coração e o número na hora
    setPosts(posts.map(p =>
      p.id === id
        ? { ...p, euCurti: !jaCurtiu, curtidas: p.curtidas + (jaCurtiu ? -1 : 1) }
        : p
    ))

    let error
    if (jaCurtiu) {
      // Descurtir: apaga a linha deste usuário para este post
      const res = await supabase
        .from('curtidas')
        .delete()
        .eq('post_id', id)
        .eq('user_id', usuario.id)
      error = res.error
    } else {
      // Curtir: insere a linha (post_id + user_id)
      const res = await supabase
        .from('curtidas')
        .insert([{ post_id: id, user_id: usuario.id }])
      error = res.error
    }

    if (error) {
      console.error('Erro ao curtir/descurtir:', error)
      // Desfaz a atualização otimista em caso de erro
      setPosts(posts.map(p =>
        p.id === id
          ? { ...p, euCurti: jaCurtiu, curtidas: post.curtidas }
          : p
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
          onCurtir={alternarCurtida}
          onDeletar={deletarPost}
        />
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        Feito com 💜 no curso Do Zero ao Deploy
      </footer>
    </div>
  )
}
