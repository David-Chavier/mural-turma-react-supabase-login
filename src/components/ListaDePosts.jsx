import CardPost from './CardPost'

// Recebe usuarioId para repassar ao CardPost
// O CardPost usa para saber se mostra ou esconde o botão deletar
export default function ListaDePosts({ posts, carregando, usuarioId, onCurtir, onDeletar }) {

  if (carregando) {
    return (
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Posts recentes
        </h2>
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl shadow p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-gray-200" />
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-2 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-4/5" />
            </div>
          </div>
        ))}
      </section>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">Nenhum post ainda. Seja o primeiro!</p>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        Posts recentes
      </h2>
      {posts.map(post => (
        <CardPost
          key={post.id}
          post={post}
          usuarioId={usuarioId}
          onCurtir={onCurtir}
          onDeletar={onDeletar}
        />
      ))}
    </section>
  )
}
