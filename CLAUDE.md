# CLAUDE.md — Aula 03: React + Supabase (sem backend)

> ⚠️ **Plano revisado** — o Express/Node foi removido do escopo.
> O front-end React fala diretamente com o Supabase via `@supabase/supabase-js`.
> Isso é possível e seguro porque o Supabase usa Row Level Security (RLS).

## 1. Objetivo da Aula

Partir do projeto React da aula 02 (CRUD em memória), conectar o Supabase JS diretamente
no front-end e fazer os dados persistirem num banco real. Ao final, recarregar a página
não perde mais nenhum post.

## 2. Estado Inicial Esperado

O aluno chega com:
- A pasta `aula-02-react-vite/` rodando (ou a cópia entregue pelo professor)
- Conta no Supabase criada (feita na aula 02) ✅
- Node.js 20+ instalado ✅

## 3. Estado Final Esperado

Ao final da aula, o aluno tem:
- Projeto baseado na aula 02, com `@supabase/supabase-js` instalado
- Arquivo `src/lib/supabase.js` com o cliente configurado via variáveis de ambiente
- `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` (anon key)
- `.env.example` com os nomes das variáveis (sem valores)
- Tabela `posts` criada no Supabase com RLS ativado e 4 políticas públicas
- `App.jsx` usando `useEffect` para buscar posts e Supabase para criar/curtir/deletar
- CRUD completo funcionando com persistência real

## 4. Conceitos Novos Introduzidos

- `useEffect`: executar código quando o componente monta (buscar dados do banco)
- Supabase JS Client: `.from('posts').select()`, `.insert()`, `.delete()`, `.update()`
- Variáveis de ambiente no Vite: `import.meta.env.VITE_*`
- `.env` vs `.env.example`: o que commitar e o que não commitar
- RLS (Row Level Security): políticas que controlam quem pode ler/escrever
- `async/await`: código assíncrono para chamadas ao banco
- Estado de loading: mostrar feedback enquanto os dados carregam

## 5. Comandos Principais

```bash
# Na pasta do projeto (baseada na aula 02)
npm install @supabase/supabase-js

# Rodar o projeto
npm run dev
```

**SQL no Supabase (SQL Editor):**
```sql
-- Criar tabela
CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  autor      VARCHAR(50)  NOT NULL,
  conteudo   TEXT         NOT NULL CHECK (char_length(conteudo) <= 280),
  imagem_url TEXT,
  curtidas   INTEGER      DEFAULT 0,
  criado_em  TIMESTAMP    DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (mural aberto, sem login)
CREATE POLICY "leitura publica"  ON posts FOR SELECT USING (true);
CREATE POLICY "criacao publica"  ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "curtida publica"  ON posts FOR UPDATE USING (true);
CREATE POLICY "exclusao publica" ON posts FOR DELETE USING (true);
```

## 6. Cuidados Pedagógicos

- **Tour rápido no React primeiro:** os alunos querem codar — não se prenda em teoria.
  Mostre os componentes em 15 minutos no estilo "isso aqui faz X", rode o projeto e parta pro Supabase.
- **Vibe coding é bem-vindo:** incentive os alunos a usarem IA para gerar partes do código.
  O papel do professor é garantir que eles entendam *o que está sendo gerado*, não que gerem tudo na mão.
- **anon key no front-end é seguro com RLS:** explique isso com convicção. Muitos vão estranhar
  ver a key no código. Mostre as políticas criadas e diga: "a key só faz o que as políticas deixam".
- **service_role jamais no front:** mencione isso uma vez com ênfase. É a única key perigosa.
- **useEffect é o momento de atenção:** é o conceito mais novo e abstrato. Use a analogia
  "é o código que roda assim que a página abre, igual ao onload do HTML".
- **Erro de RLS vai acontecer:** se um aluno esquecer de criar as políticas, vai receber
  `0 rows` silencioso no SELECT. Deixe o erro acontecer e use como ensino.
- **snake_case no banco, camelCase no JS:** a coluna é `imagem_url` mas no JS é `imagemUrl`.
  Mostre o mapeamento explicitamente.

## 7. Checkpoints da Aula

| Tempo | Checkpoint |
|---|---|
| 8h30 (30min) | Tour nos componentes da aula 02 concluído, projeto rodando em localhost |
| 9h15 (45min) | Tabela criada no Supabase, RLS ativado, 4 políticas criadas, 1 post inserido manualmente no painel |
| 10h00 (45min) | **Intervalo** — `supabase.js` configurado, `useEffect` buscando posts do banco |
| 10h45 (45min) | `criarPost` salvando no Supabase, novo post aparece sem recarregar |
| 11h30 (45min) | Curtir e deletar funcionando no banco; recarrega → posts continuam lá 🎉 |
| 12h00 (30min) | Revisão, ajustes visuais, preparação para o deploy da aula 04 |
