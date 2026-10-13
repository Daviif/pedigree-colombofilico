import { useState } from 'react'

import { useLogin } from '../api/hooks'

export function Login() {
  const login = useLogin()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      await login.mutateAsync({ login: usuario, senha })
    } catch (err: any) {
      setErro(err?.response?.data?.detail ?? 'Não foi possível entrar. Tente de novo.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl">🐦</div>
          <h1 className="mt-2 text-xl font-semibold text-slate-800">Pedigree Colombófilo</h1>
        </div>

        <form onSubmit={entrar} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {erro && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Usuário</span>
            <input
              required
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Senha</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {login.isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
