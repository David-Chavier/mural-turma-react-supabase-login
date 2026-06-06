# Mural da Turma — React + Supabase + Login 🔐

Timeline estilo rede social com **autenticação completa**.
Só usuários cadastrados postam. Cada um deleta apenas os próprios posts.

## O que muda em relação à versão sem login

| | Sem login | Com login |
|---|---|---|
| Criar post | Qualquer um | Só usuários cadastrados |
| Curtir | Qualquer um | Qualquer um |
| Deletar | Qualquer um | Só o dono do post |
| Campo "autor" | Digitado no formulário | Vem do cadastro |

---

## Configuração inicial

### 1. Desative a confirmação de e-mail (importante para a aula)

Por padrão o Supabase envia um e-mail de confirmação antes de liberar o login.
Em ambiente de aula isso trava tudo. Desative assim:

**Supabase → Authentication → Providers → Email → desmarque "Confirm email" → Save**

### 2. Crie as tabelas no Supabase

Cole no **SQL Editor**:

```sql
-- ── Tabela de posts ──────────────────────────────────────────────
CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  autor      VARCHAR(50)  NOT NULL,
  conteudo   TEXT         NOT NULL CHECK (char_length(conteudo) <= 280),
  imagem_url TEXT,
  criado_em  TIMESTAMP    DEFAULT NOW()
);
-- Nota: NÃO existe mais a coluna "curtidas" aqui.
-- O total de curtidas é CONTADO a partir da tabela abaixo.

-- ── Tabela de curtidas ───────────────────────────────────────────
-- Cada curtida é uma linha que liga UM post a UM usuário.
CREATE TABLE curtidas (
  id        SERIAL PRIMARY KEY,
  post_id   INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id   UUID    NOT NULL REFERENCES auth.users(id),
  criado_em TIMESTAMP DEFAULT NOW(),

  -- A MÁGICA: cada usuário só pode curtir cada post uma vez.
  -- Se tentar curtir de novo, o banco recusa com erro de duplicata.
  UNIQUE (post_id, user_id)
);
-- ON DELETE CASCADE: se o post for apagado, suas curtidas somem junto.

-- ── Segurança (RLS) ──────────────────────────────────────────────
ALTER TABLE posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE curtidas ENABLE ROW LEVEL SECURITY;

-- Posts: qualquer um lê
CREATE POLICY "leitura publica"
  ON posts FOR SELECT USING (true);

-- Posts: só usuários logados criam (e só para o próprio user_id)
CREATE POLICY "criacao autenticada"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Posts: só o dono deleta o próprio post
CREATE POLICY "exclusao do dono"
  ON posts FOR DELETE USING (auth.uid() = user_id);

-- Curtidas: qualquer um lê (para contar o total)
CREATE POLICY "curtidas leitura publica"
  ON curtidas FOR SELECT USING (true);

-- Curtidas: usuário logado só insere curtida em SEU próprio nome
CREATE POLICY "curtir autenticado"
  ON curtidas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Curtidas: usuário só remove a PRÓPRIA curtida (descurtir)
CREATE POLICY "descurtir proprio"
  ON curtidas FOR DELETE USING (auth.uid() = user_id);
```

### Como funcionam as curtidas agora

| Antes | Agora |
|---|---|
| Coluna `curtidas` (número) na tabela posts | Tabela `curtidas` com 1 linha por curtida |
| Qualquer um curtia infinitas vezes | `UNIQUE(post_id, user_id)` = 1 por pessoa |
| Não sabia quem curtiu | Cada curtida tem o `user_id` |
| Coração sempre cinza | Coração fica 🔴 vermelho se você curtiu |

**Curtir** = inserir uma linha. **Descurtir** = apagar a linha.
O total é `COUNT(*)` das linhas daquele post.

### 3. Crie o bucket de imagens

**Supabase → Storage → New bucket → `imagens-posts` → Public ✅**

```sql
-- Policy de upload para usuários autenticados
CREATE POLICY "upload autenticado" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imagens-posts');
```

### 4. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_KEY=sua_anon_key_aqui
```

Credenciais em: **Supabase → Project Settings → API → anon public**

### 5. Instale e rode

```bash
npm install
npm run dev
```

Acesse **http://localhost:5173**

---

## Estrutura

```
src/
├── lib/
│   └── supabase.js           → cliente Supabase
├── App.jsx                   → controla estado de autenticação
├── pages/
│   └── Autenticacao.jsx      → tela de login + registro (NOVO)
└── components/
    ├── FormularioPost.jsx     → sem campo autor (vem do usuário logado)
    ├── ListaDePosts.jsx       → passa usuarioId pro CardPost
    └── CardPost.jsx           → botão deletar só para o dono
```

---

## ✨ Prompt para recriar este projeto com IA

```
Crie um projeto React completo chamado "Mural da Turma" com autenticação via Supabase Auth.
Usa Vite + React 18 + Tailwind CSS 3 + @supabase/supabase-js.
O React fala diretamente com o Supabase (sem backend Node.js/Express).

─── ARQUIVOS DE CONFIGURAÇÃO ────────────────────────────────────────────────

package.json:
  dependencies: react ^18.3.1, react-dom ^18.3.1, @supabase/supabase-js ^2.45.4
  devDependencies: @vitejs/plugin-react ^4.3.1, tailwindcss ^3.4.14,
                   postcss ^8.4.47, autoprefixer ^10.4.20, vite ^5.4.10

vite.config.js: defineConfig com plugin react e base: process.env.BASE_URL || '/'
tailwind.config.js: content ['./index.html','./src/**/*.{js,jsx}'], cores primaria/secundaria
postcss.config.js: tailwindcss + autoprefixer
.env.example: VITE_SUPABASE_URL e VITE_SUPABASE_KEY
index.html: div#root + script src="/src/main.jsx"
src/index.css: @tailwind base, components, utilities
src/main.jsx: createRoot + StrictMode + App

─── SQL DO SUPABASE ─────────────────────────────────────────────────────────

CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  autor      VARCHAR(50)  NOT NULL,
  conteudo   TEXT         NOT NULL CHECK (char_length(conteudo) <= 280),
  imagem_url TEXT,
  criado_em  TIMESTAMP    DEFAULT NOW()
);
-- SEM coluna curtidas: o total é contado da tabela curtidas

CREATE TABLE curtidas (
  id        SERIAL PRIMARY KEY,
  post_id   INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id   UUID    NOT NULL REFERENCES auth.users(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE (post_id, user_id)   -- 1 curtida por usuário por post
);

ALTER TABLE posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE curtidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura publica"     ON posts FOR SELECT USING (true);
CREATE POLICY "criacao autenticada" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exclusao do dono"    ON posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "curtidas leitura publica" ON curtidas FOR SELECT USING (true);
CREATE POLICY "curtir autenticado"       ON curtidas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "descurtir proprio"        ON curtidas FOR DELETE USING (auth.uid() = user_id);

─── src/lib/supabase.js ─────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)
Aviso no console se variáveis não estiverem configuradas.

─── src/App.jsx ─────────────────────────────────────────────────────────────

Imports: useState, useEffect de 'react'; supabase de './lib/supabase';
         Autenticacao de './pages/Autenticacao';
         FormularioPost e ListaDePosts de './components/...'

Estado:
  const [usuario, setUsuario]       = useState(null)  // objeto do Supabase Auth
  const [posts, setPosts]           = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]             = useState(null)

useEffect para autenticação:
  useEffect(() => {
    // Verifica se já tem sessão ativa ao abrir a página
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      if (session?.user) buscarPosts()
      else setCarregando(false)
    })

    // Escuta mudanças de auth em tempo real (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUsuario(session?.user ?? null)
        if (session?.user) buscarPosts()
        else { setPosts([]); setCarregando(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  Comentário explicando: onAuthStateChange é como um "addEventListener" para o estado de login.
  O cleanup (unsubscribe) evita memory leaks.

Função mapearPost(postDoBanco, idsCurtidosPeloUsuario):
  idsCurtidosPeloUsuario = Set com os post_id que o usuário logado curtiu
  { id, userId: postDoBanco.user_id, autor, conteudo,
    imagemUrl: postDoBanco.imagem_url,
    curtidas: postDoBanco.curtidas[0]?.count ?? 0,   // total CONTADO via agregação
    euCurti: idsCurtidosPeloUsuario.has(postDoBanco.id), // este usuário curtiu?
    criadoEm: new Date(postDoBanco.criado_em) }

Funções assíncronas:
  buscarPosts():
    1. Busca posts com contagem de curtidas:
       supabase.from('posts').select('*, curtidas(count)').order('criado_em', {ascending:false})
       (curtidas(count) é uma agregação — conta as linhas da tabela curtidas por post)
    2. Busca as curtidas DESTE usuário:
       supabase.from('curtidas').select('post_id').eq('user_id', usuario.id)
       Monta um Set com os post_id → idsCurtidos
    3. setPosts(dados.map(p => mapearPost(p, idsCurtidos)))

  criarPost({ conteudo, imagemUrl }):
    autor = usuario.user_metadata?.nome_exibicao ?? usuario.email
    await supabase.from('posts')
      .insert([{ user_id: usuario.id, autor, conteudo, imagem_url: imagemUrl || null }])
      .select('*, curtidas(count)').single()
    setPosts([mapearPost(data, new Set()), ...posts])  // novo post: 0 curtidas, não curtido

  alternarCurtida(id):   ← antes era curtirPost
    post = posts.find(p => p.id === id); jaCurtiu = post.euCurti
    Atualização otimista: alterna euCurti e soma/subtrai 1 em curtidas
    Se jaCurtiu (descurtir):
      supabase.from('curtidas').delete().eq('post_id', id).eq('user_id', usuario.id)
    Senão (curtir):
      supabase.from('curtidas').insert([{ post_id: id, user_id: usuario.id }])
    Em caso de erro: desfaz a atualização otimista
    Comentário: a restrição UNIQUE no banco é a garantia final de 1 curtida por pessoa.

  deletarPost(id):
    setPosts(posts.filter(p => p.id !== id))  // otimista
    await supabase.from('posts').delete().eq('id', id)
    (as curtidas do post somem sozinhas por causa do ON DELETE CASCADE)

  async sair():
    await supabase.auth.signOut()
    Comentário: onAuthStateChange detecta o logout e limpa o estado automaticamente

JSX:
  Se !usuario && !carregando: <Autenticacao />
  Senão:
    - header com título + info do usuário logado + botão "Sair" (onClick={sair})
    - main com FormularioPost (passa usuario) e ListaDePosts (passa usuarioId)
    - footer

─── src/pages/Autenticacao.jsx ──────────────────────────────────────────────

Imports: useState de 'react'; supabase de '../lib/supabase'

Estados:
  modo ('login') — alterna entre 'login' e 'registro'
  nome ('') — só usado no registro
  email (''), senha ('')
  carregando (false), erro (null), sucesso (null)

Função entrar():
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  Se error: setErro(error.message)
  Comentário: onAuthStateChange no App.jsx detecta o login automaticamente

Função registrar():
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome_exibicao: nome } }  // salvo nos metadados do usuário
  })
  Se error: setErro(error.message)
  Senão: setModo('login'); setErro(null); setSucesso('Conta criada! Faça login.')
  Comentário: nome_exibicao fica em user.user_metadata.nome_exibicao

handleSubmit(evento):
  evento.preventDefault(); setErro(null)
  if (modo === 'login') entrar()
  else registrar()

JSX:
  Centralizado na tela (min-h-screen flex items-center justify-center bg-gray-100)
  Card branco rounded-2xl shadow p-8 max-w-md w-full

  Título: "📋 Mural da Turma"
  Subtítulo dinâmico: "Entrar" ou "Criar conta"

  Se modo === 'registro':
    Input nome_exibicao (text, "Seu nome no mural", required)

  Input email (type="email", required)
  Input senha (type="password", minLength=6, required)

  Se erro: div bg-red-50 text-red-700 com a mensagem
  Se sucesso: div bg-green-50 text-green-700 com a mensagem

  Botão submit: "Entrando..." ou "Criando conta..." quando carregando

  Link para alternar modo:
    login → "Não tem conta? Criar conta"
    registro → "Já tem conta? Entrar"

─── src/components/FormularioPost.jsx ───────────────────────────────────────

Imports: useState, useRef de 'react'; supabase de '../lib/supabase'
Props: { onCriar, usuario }
Constante BUCKET = 'imagens-posts'

Diferença da versão sem login:
  - NÃO tem campo de autor (vem do usuario.user_metadata.nome_exibicao ou email)
  - Mostra "Postando como: [nome]" acima do formulário em texto cinza
  - handleSubmit chama onCriar({ conteudo, imagemUrl }) — sem autor

Upload de imagem: idêntico à versão sem login (useRef, createObjectURL, Storage)
Skeleton de loading no botão: "Enviando..." quando enviando=true

─── src/components/ListaDePosts.jsx ─────────────────────────────────────────

Props: { posts, carregando, usuarioId, onCurtir, onDeletar }
Passa usuarioId para cada CardPost.
Skeleton de loading: idêntico à versão sem login.

─── src/components/CardPost.jsx ─────────────────────────────────────────────

Props: { post, usuarioId, onCurtir, onDeletar }
Desestrutura post: { id, userId, autor, conteudo, imagemUrl, curtidas, euCurti, criadoEm }

Botão curtir (estilo Instagram):
  euCurti = true  → coração VERMELHO PREENCHIDO + texto text-red-500
  euCurti = false → coração CINZA VAZADO, hover vermelho
  No SVG: fill={euCurti ? 'currentColor' : 'none'}
  Na classe: euCurti ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
  onClick={() => onCurtir(id)}  // a função alterna curtir/descurtir
  aria-label muda entre "Curtir" e "Descurtir"

Botão "Deletar" só aparece se usuarioId === post.userId:
  {usuarioId === userId && (
    <button onClick={() => onDeletar(id)}>Deletar</button>
  )}

  Comentário: "Quem não é dono do post simplesmente não vê o botão.
  Mesmo que alguém tente chamar a função de deletar diretamente,
  a policy RLS no Supabase bloqueia no banco."

Funções auxiliares (mesmas): formatarData, gerarCorAvatar

─── REQUISITOS GERAIS ───────────────────────────────────────────────────────
- Idioma: português brasileiro em variáveis, comentários e textos
- Comentários didáticos em todos os arquivos (material de curso)
- Sem TypeScript, sem ESLint config complexa
- Cores: indigo-600 principal, gray-100 fundo
- Gere TODOS os arquivos completos, prontos para uso
- Inclua um comentário em App.jsx explicando o fluxo completo de autenticação
```
