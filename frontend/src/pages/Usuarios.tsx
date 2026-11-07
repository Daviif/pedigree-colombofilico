import { useState } from 'react'

import {
  mensagemDeErro,
  useAtualizarUsuario,
  useCriarUsuario,
  useDesbloquearUsuario,
  useRedefinirSenha,
  useUsuarioAtual,
  useUsuarios,
} from '../api/hooks'
import type { UsuarioAdmin, UsuarioNovo } from '../api/types'

const VAZIO: UsuarioNovo = { login: '', nome: '', senha: '', admin: false }

// O último acesso é gravado no máximo a cada 5 minutos; 10 minutos dá folga para "online".
const ONLINE_MS = 10 * 60 * 1000

// `agora` é o horário em que a lista veio da API (dataUpdatedAt), para a renderização ser pura.
function estaOnline(iso: string | null | undefined, agora: number): boolean {
  return !!iso && agora - new Date(iso).getTime() < ONLINE_MS
}

function descreverAcesso(iso: string | null | undefined, agora: number): string {
  if (!iso) return 'Nunca entrou'
  const data = new Date(iso)
  const minutos = Math.floor((agora - data.getTime()) / 60000)
  if (minutos < 60) return minutos <= 1 ? 'Agora há pouco' : `Há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Há ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 30) return dias === 1 ? 'Ontem' : `Há ${dias} dias`
  return data.toLocaleDateString('pt-BR')
}

const inputCls = 'w-full rounded border border-slate-300 px-2 py-2 text-sm sm:py-1'
const botaoSecundario =
  'rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'

export function Usuarios() {
  const { data: usuarios, dataUpdatedAt: agora } = useUsuarios()
  const { data: eu } = useUsuarioAtual()
  const criar = useCriarUsuario()
  const [novo, setNovo] = useState<UsuarioNovo>(VAZIO)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      const criado = await criar.mutateAsync(novo)
      setAviso(`Usuário ${criado.login} criado. Passe o login e a senha para ${criado.nome}.`)
      setNovo(VAZIO)
      setMostrarForm(false)
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao criar o usuário.'))
    }
  }

  const ativos = usuarios?.filter((u) => u.ativo).length ?? 0
  const online = usuarios?.filter((u) => estaOnline(u.ultimo_acesso, agora)).length ?? 0

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Usuários</h1>
          {usuarios && (
            <p className="text-sm text-slate-500">
              {ativos} ativo{ativos === 1 ? '' : 's'} · {online} online agora
            </p>
          )}
        </div>
        {!mostrarForm && (
          <button
            onClick={() => {
              setMostrarForm(true)
              setAviso(null)
            }}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Novo usuário
          </button>
        )}
      </div>

      {aviso && <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">{aviso}</div>}

      {mostrarForm && (
        <form
          onSubmit={enviar}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <h2 className="text-lg font-medium text-slate-800">Novo usuário</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-600">
              Nome completo
              <input
                required
                placeholder="ex.: João da Silva"
                className={inputCls}
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
            </label>
            <label className="text-sm text-slate-600">
              Login
              <input
                required
                autoCapitalize="none"
                autoComplete="off"
                placeholder="ex.: joao.silva"
                className={inputCls}
                value={novo.login}
                onChange={(e) => setNovo({ ...novo, login: e.target.value.toLowerCase() })}
              />
            </label>
            <label className="text-sm text-slate-600">
              Senha (mínimo 8 caracteres)
              <input
                required
                minLength={8}
                autoComplete="new-password"
                className={inputCls}
                value={novo.senha}
                onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-1 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={novo.admin}
                onChange={(e) => setNovo({ ...novo, admin: e.target.checked })}
              />
              Administrador (vê e edita tudo)
            </label>
          </div>
          {erro && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={criar.isPending}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false)
                setErro(null)
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {usuarios?.map((u) => (
          <LinhaUsuario key={u.id} usuario={u} souEu={u.id === eu?.id} agora={agora} />
        ))}
      </ul>
    </div>
  )
}

function LinhaUsuario({
  usuario: u,
  souEu,
  agora,
}: {
  usuario: UsuarioAdmin
  souEu: boolean
  agora: number
}) {
  const atualizar = useAtualizarUsuario()
  const redefinir = useRedefinirSenha()
  const desbloquear = useDesbloquearUsuario()
  const [modo, setModo] = useState<'nome' | 'senha' | null>(null)
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const online = estaOnline(u.ultimo_acesso, agora)

  function abrir(m: 'nome' | 'senha') {
    setModo(m)
    setValor(m === 'nome' ? u.nome : '')
    setErro(null)
    setAviso(null)
  }

  async function executar(acao: () => Promise<unknown>, sucesso?: string) {
    setErro(null)
    setAviso(null)
    try {
      await acao()
      setModo(null)
      if (sucesso) setAviso(sucesso)
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível salvar.'))
    }
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (modo === 'nome') executar(() => atualizar.mutateAsync({ id: u.id, nome: valor }))
    else
      executar(
        () => redefinir.mutateAsync({ id: u.id, senha: valor }),
        souEu
          ? 'Senha alterada.'
          : `Senha alterada. ${u.nome} foi desconectado(a) e precisa entrar com a nova senha.`,
      )
  }

  function alternarAtivo() {
    if (u.ativo && !confirm(`Desativar ${u.nome}? O plantel é mantido, mas a pessoa não consegue mais entrar.`))
      return
    executar(() => atualizar.mutateAsync({ id: u.id, ativo: !u.ativo }))
  }

  function alternarAdmin() {
    const pergunta = u.admin
      ? `Tirar o perfil de administrador de ${u.nome}?`
      : `Tornar ${u.nome} administrador? Ele(a) vai ver e editar os pombos de todos e gerenciar usuários.`
    if (!confirm(pergunta)) return
    executar(() => atualizar.mutateAsync({ id: u.id, admin: !u.admin }))
  }

  const ocupado = atualizar.isPending || redefinir.isPending

  return (
    <li
      className={`rounded-lg border bg-white p-4 shadow-sm ${u.ativo ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-800">{u.nome}</span>
            {souEu && <span className="text-xs text-slate-400">(você)</span>}
            {u.admin && (
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">admin</span>
            )}
            {u.bloqueado && (
              <span
                className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700"
                title="Errou a senha 5 vezes nos últimos 15 minutos"
              >
                bloqueado
              </span>
            )}
            {!u.ativo && (
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                desativado
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500">
            {u.login} · {u.total_pombos} pombo{u.total_pombos === 1 ? '' : 's'}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          {online && <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />}
          {online ? 'Online' : descreverAcesso(u.ultimo_acesso, agora)}
        </div>
      </div>

      {modo ? (
        <form onSubmit={salvar} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            required
            autoFocus
            minLength={modo === 'senha' ? 8 : 1}
            autoComplete={modo === 'senha' ? 'new-password' : 'off'}
            placeholder={modo === 'senha' ? 'Nova senha (mínimo 8 caracteres)' : 'Nome completo'}
            className="flex-1 rounded border border-slate-300 px-2 py-2 text-sm sm:py-1"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={ocupado}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:py-1"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setModo(null)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 sm:py-1"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => abrir('nome')} className={botaoSecundario}>
            Editar nome
          </button>
          <button onClick={() => abrir('senha')} className={botaoSecundario}>
            Redefinir senha
          </button>
          {u.bloqueado && (
            <button
              onClick={() =>
                executar(() => desbloquear.mutateAsync(u.id), `${u.nome} pode tentar entrar de novo.`)
              }
              disabled={desbloquear.isPending}
              className={`${botaoSecundario} text-red-700`}
            >
              Desbloquear
            </button>
          )}
          {!souEu && (
            <>
              <button onClick={alternarAdmin} disabled={ocupado} className={botaoSecundario}>
                {u.admin ? 'Tirar admin' : 'Tornar admin'}
              </button>
              <button
                onClick={alternarAtivo}
                disabled={ocupado}
                className={`${botaoSecundario} ${u.ativo ? 'text-red-600' : 'text-green-700'}`}
              >
                {u.ativo ? 'Desativar' : 'Reativar'}
              </button>
            </>
          )}
        </div>
      )}

      {erro && <div className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      {aviso && <div className="mt-2 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{aviso}</div>}
    </li>
  )
}
