import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useCompartilhamentos, useCompartilhar, useRemoverCompartilhamento } from '../api/hooks'

export function Compartilhar() {
  const { data: compartilhamentos } = useCompartilhamentos()
  const compartilhar = useCompartilhar()
  const remover = useRemoverCompartilhamento()
  const [login, setLogin] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      await compartilhar.mutateAsync(login)
      setLogin('')
    } catch (err: any) {
      setErro(err?.response?.data?.detail ?? 'Erro ao compartilhar.')
    }
  }

  function pararDeCompartilhar(id: number, nome: string) {
    if (!confirm(`${nome} deixará de ver os seus pombos. Continuar?`)) return
    remover.mutate({ tipo: 'concedidos', usuarioId: id })
  }

  function deixarDeVer(id: number, nome: string) {
    if (!confirm(`Você deixará de ver os pombos de ${nome}. Continuar?`)) return
    remover.mutate({ tipo: 'recebidos', usuarioId: id })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Compartilhar</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-medium text-slate-800">Quem vê o meu plantel</h2>
        <p className="mb-3 text-sm text-slate-500">
          A pessoa vê todos os seus pombos, inclusive os que você cadastrar depois, mas não pode
          alterar nada. Ela pode copiar um pombo, com os ancestrais, para o plantel dela.
        </p>

        <form onSubmit={enviar} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            required
            placeholder="Usuário (login) de quem vai ver"
            autoCapitalize="none"
            className="flex-1 rounded border border-slate-300 px-2 py-2 text-sm sm:py-1"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <button
            type="submit"
            disabled={compartilhar.isPending}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:py-1"
          >
            Compartilhar
          </button>
        </form>
        {erro && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}

        {compartilhamentos?.concedidos.length === 0 && (
          <p className="text-sm text-slate-500">Seu plantel não está compartilhado com ninguém.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {compartilhamentos?.concedidos.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <span className="font-medium text-slate-700">{u.nome}</span>{' '}
                <span className="text-slate-400">({u.login})</span>
              </span>
              <button
                onClick={() => pararDeCompartilhar(u.id, u.nome)}
                className="shrink-0 py-1 text-xs text-red-600 hover:underline"
              >
                parar de compartilhar
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-lg font-medium text-slate-800">Plantéis compartilhados comigo</h2>
        {compartilhamentos?.recebidos.length === 0 && (
          <p className="text-sm text-slate-500">Ninguém compartilhou o plantel com você ainda.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {compartilhamentos?.recebidos.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <Link to={`/pombos?plantel=${u.id}`} className="font-medium text-blue-700 hover:underline">
                  {u.nome}
                </Link>{' '}
                <span className="text-slate-400">({u.login})</span>
              </span>
              <button
                onClick={() => deixarDeVer(u.id, u.nome)}
                className="shrink-0 py-1 text-xs text-red-600 hover:underline"
              >
                deixar de ver
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
