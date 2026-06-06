// ---------------------------------------------------------------------------
// COMPONENTE CardPost — versão com autenticação
//
// Nova prop: usuarioId — o ID do usuário logado atualmente.
// Nova prop em post: userId — o ID de quem criou o post.
//
// Regra de negócio:
//   - Botão "Deletar" só aparece se usuarioId === post.userId
//   - Mesmo que alguém tente chamar deletarPost() diretamente,
//     a policy RLS "exclusao do dono" no Supabase bloqueia no banco.
//   - Segurança em duas camadas: UI (esconde o botão) + banco (bloqueia a query)
// ---------------------------------------------------------------------------

function formatarData(data) {
  return data.toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).replace(' de ', ' ')
}

function gerarCorAvatar(nomeAutor) {
  const cores = [
    'bg-indigo-100 text-indigo-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-sky-100 text-sky-700',
    'bg-purple-100 text-purple-700',
  ]
  return cores[nomeAutor.charCodeAt(0) % cores.length]
}

export default function CardPost({ post, usuarioId, onCurtir, onDeletar }) {
  const { id, userId, autor, conteudo, imagemUrl, curtidas, euCurti, criadoEm } = post

  // O dono do post pode deletar — os outros nem veem o botão
  const ehDono = usuarioId === userId

  return (
    <article className="bg-white rounded-2xl shadow overflow-hidden">

      {imagemUrl && (
        <img src={imagemUrl} alt={`Imagem do post de ${autor}`}
             className="w-full h-48 object-cover" />
      )}

      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center
                          font-bold text-sm flex-shrink-0 ${gerarCorAvatar(autor)}`}>
            {autor.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{autor}</p>
            <p className="text-xs text-gray-400">{formatarData(criadoEm)}</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm leading-relaxed mb-4">{conteudo}</p>

        <div className="flex items-center gap-3 pt-3 border-t border-gray-100">

          {/*
            Botão curtir/descurtir.
            euCurti = true  → coração VERMELHO PREENCHIDO (fill) + texto vermelho
            euCurti = false → coração CINZA VAZADO (só contorno)

            A diferença visual é controlada por duas coisas no SVG:
              - fill: "currentColor" (preenche) vs "none" (vazado)
              - a cor do texto/ícone via classes text-red-500 vs text-gray-500
          */}
          <button onClick={() => onCurtir(id)}
                  className={`flex items-center gap-1.5 text-sm transition-colors
                              cursor-pointer group
                              ${euCurti
                                ? 'text-red-500'
                                : 'text-gray-500 hover:text-red-500'}`}
                  aria-label={euCurti ? `Descurtir post de ${autor}` : `Curtir post de ${autor}`}>
            <svg xmlns="http://www.w3.org/2000/svg"
                 className="w-5 h-5 group-hover:scale-110 transition-transform"
                 fill={euCurti ? 'currentColor' : 'none'}
                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682
                       a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318
                       a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{curtidas} {curtidas === 1 ? 'curtida' : 'curtidas'}</span>
          </button>

          <span className="flex-1" />

          {/* Deletar: só aparece para o dono do post */}
          {ehDono && (
            <button onClick={() => onDeletar(id)}
                    className="flex items-center gap-1.5 text-sm text-gray-400
                               hover:text-red-500 transition-colors cursor-pointer"
                    aria-label={`Deletar post de ${autor}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
                         01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0
                         00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Deletar
            </button>
          )}

        </div>
      </div>
    </article>
  )
}
