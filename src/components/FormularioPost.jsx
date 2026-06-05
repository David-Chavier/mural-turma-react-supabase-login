import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ---------------------------------------------------------------------------
// Diferença das versões anteriores:
//   - SEM campo de autor — vem do usuario.user_metadata.nome_exibicao
//   - Exibe "Postando como: [nome]" para feedback
//   - onCriar recebe apenas { conteudo, imagemUrl }
// ---------------------------------------------------------------------------

const LIMITE_CONTEUDO = 280
const BUCKET = 'imagens-posts'

export default function FormularioPost({ onCriar, usuario }) {
  const [conteudo, setConteudo]           = useState('')
  const [enviando, setEnviando]           = useState(false)
  const [imagemPreview, setImagemPreview] = useState(null)
  const [imagemArquivo, setImagemArquivo] = useState(null)
  const inputArquivoRef                   = useRef(null)

  const caracteresRestantes = LIMITE_CONTEUDO - conteudo.length
  const corContador =
    caracteresRestantes <= 20 ? 'text-red-500 font-semibold' :
    caracteresRestantes <= 60 ? 'text-amber-500'             :
                                'text-gray-400'

  const nomeAutor = usuario?.user_metadata?.nome_exibicao ?? usuario?.email

  function handleImagemSelecionada(evento) {
    const arquivo = evento.target.files[0]
    if (!arquivo) return
    if (imagemPreview) URL.revokeObjectURL(imagemPreview)
    setImagemArquivo(arquivo)
    setImagemPreview(URL.createObjectURL(arquivo))
  }

  function removerImagem() {
    if (imagemPreview) URL.revokeObjectURL(imagemPreview)
    setImagemPreview(null)
    setImagemArquivo(null)
    if (inputArquivoRef.current) inputArquivoRef.current.value = ''
  }

  async function uploadImagem(arquivo) {
    const extensao      = arquivo.name.split('.').pop()
    const nomeNoStorage = `${Date.now()}.${extensao}`
    const { error }     = await supabase.storage.from(BUCKET).upload(nomeNoStorage, arquivo)
    if (error) { console.error('Erro no upload:', error); return null }
    return supabase.storage.from(BUCKET).getPublicUrl(nomeNoStorage).data.publicUrl
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    if (!conteudo.trim() || enviando) return

    setEnviando(true)

    let imagemUrl = null
    if (imagemArquivo) imagemUrl = await uploadImagem(imagemArquivo)

    await onCriar({ conteudo: conteudo.trim(), imagemUrl })

    setEnviando(false)
    setConteudo('')
    setImagemPreview(null)
    setImagemArquivo(null)
    if (inputArquivoRef.current) inputArquivoRef.current.value = ''
  }

  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Novo post</h2>

      {/* Quem está postando */}
      <p className="text-xs text-gray-400 mb-4">
        Postando como{' '}
        <span className="font-medium text-indigo-600">{nomeAutor}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label htmlFor="conteudo" className="block text-sm font-medium text-gray-700 mb-1">
            O que você quer compartilhar?
          </label>
          <textarea
            id="conteudo"
            placeholder="Escreva aqui... (máx. 280 caracteres)"
            maxLength={LIMITE_CONTEUDO}
            rows={3}
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-400
                       placeholder:text-gray-400 resize-none"
          />
          <p className={`text-xs text-right mt-1 ${corContador}`}>
            {caracteresRestantes} / {LIMITE_CONTEUDO}
          </p>
        </div>

        {/* Upload de imagem */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Imagem <span className="font-normal text-gray-400">(opcional)</span>
          </label>

          {imagemPreview && (
            <div className="relative mb-2">
              <img src={imagemPreview} alt="Prévia"
                   className="w-full h-40 object-cover rounded-lg" />
              <button type="button" onClick={removerImagem}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70
                                 text-white rounded-full w-7 h-7 flex items-center
                                 justify-center text-sm transition-colors cursor-pointer">
                ✕
              </button>
            </div>
          )}

          <label htmlFor="input-imagem"
                 className="flex items-center gap-2 cursor-pointer w-fit rounded-lg
                            border border-dashed border-gray-300 px-4 py-2 text-sm
                            text-gray-500 hover:border-indigo-400 hover:text-indigo-600
                            transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {imagemPreview ? 'Trocar imagem' : 'Escolher do computador'}
          </label>

          <input id="input-imagem" type="file" accept="image/*"
                 ref={inputArquivoRef} onChange={handleImagemSelecionada}
                 className="hidden" />
        </div>

        <button
          type="submit"
          disabled={!conteudo.trim() || enviando}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                     py-2 px-4 rounded-lg transition-colors cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enviando ? 'Enviando...' : 'Publicar'}
        </button>
      </form>
    </section>
  )
}
