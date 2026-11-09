import { useRef, useState } from 'react'

import { separarErros } from '../api/erros'
import { mensagemDeErro, useAtualizarUsuario, useCriarUsuario, useDesbloquearUsuario, useRedefinirSenha, useUsuarioAtual, useUsuarios } from '../api/hooks'
import type { UsuarioAdmin, UsuarioNovo } from '../api/types'
import { FalhaAoCarregar } from '../components/FalhaAoCarregar'
import { Aviso, Botao, Campo, Carregando, Dialogo, DialogoConfirmacao, Migalhas, classeEntrada, useNotificar } from '../components/ui'
import { iniciais } from '../formatadores'

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

type Acao =
  | { tipo: 'novo' }
  | { tipo: 'nome' | 'senha' | 'admin' | 'desativar'; u: UsuarioAdmin }

/** US-01 / US-02 (e regras 1–9 da tela Usuários). */
export function Usuarios() {
  const { data: usuarios, dataUpdatedAt: agora, isLoading, isError, error, refetch } = useUsuarios()
  const { data: eu } = useUsuarioAtual()
  const atualizar = useAtualizarUsuario()
  const desbloquear = useDesbloquearUsuario()
  const notificar = useNotificar()
  const [acao, setAcao] = useState<Acao | null>(null)
  const [erroLista, setErroLista] = useState<string | null>(null)

  const ativos = usuarios?.filter((u) => u.ativo).length ?? 0
  const online = usuarios?.filter((u) => estaOnline(u.ultimo_acesso, agora)).length ?? 0

  async function direto(fazer: () => Promise<unknown>, aviso: string) {
    setErroLista(null)
    try {
      await fazer()
      notificar(aviso)
    } catch (err) {
      setErroLista(mensagemDeErro(err, 'Não foi possível salvar.'))
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Migalhas itens={[{ rotulo: 'Início', para: '/' }, { rotulo: 'Usuários' }]} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold text-marinho">Usuários</h1>
            {usuarios && (
              <p className="text-sm text-slate-600">
                {ativos} ativo{ativos === 1 ? '' : 's'} · {online} online agora
              </p>
            )}
          </div>
          <Botao variante="primaria" onClick={() => setAcao({ tipo: 'novo' })}>
            + Novo usuário
          </Botao>
        </div>
      </div>

      {erroLista && <Aviso tom="erro">{erroLista}</Aviso>}
      {isError && <FalhaAoCarregar erro={error} oQue="os usuários" onTentar={refetch} />}
      {isLoading && <Carregando linhas={4} rotulo="Carregando os usuários…" />}

      <ul className="space-y-3">
        {usuarios?.map((u) => {
          const souEu = u.id === eu?.id
          const on = estaOnline(u.ultimo_acesso, agora)
          return (
            <li key={u.id} className={`rounded-[10px] border border-borda-suave bg-white px-4 py-3.5 shadow-sm ${u.ativo ? '' : 'opacity-70'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8edf5] font-bold text-marinho">
                    {iniciais(u.nome)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <b className="text-slate-900">{u.nome}</b>
                      {souEu && <span className="text-sm text-slate-500">(você)</span>}
                      {u.admin && <span className="rounded-full border border-amber-300 bg-dourado-claro px-2 py-px text-xs font-semibold text-dourado-texto">admin</span>}
                      {u.bloqueado && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-px text-xs font-semibold text-red-700" title="Errou a senha 5 vezes nos últimos 15 minutos">
                          bloqueado
                        </span>
                      )}
                      {!u.ativo && <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-px text-xs font-semibold text-slate-600">desativado</span>}
                    </div>
                    <div className="text-[13px] text-slate-600">
                      {u.login} · {u.total_pombos} pombo{u.total_pombos === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[13px]">
                  {on ? (
                    <span className="flex items-center gap-1.5 font-semibold text-green-700">
                      <i aria-hidden className="h-2 w-2 rounded-full bg-green-500" />
                      Online
                    </span>
                  ) : (
                    <span className="text-slate-600">{descreverAcesso(u.ultimo_acesso, agora)}</span>
                  )}
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Botao pequeno onClick={() => setAcao({ tipo: 'nome', u })}>Editar nome</Botao>
                <Botao pequeno onClick={() => setAcao({ tipo: 'senha', u })}>Redefinir senha</Botao>
                {u.bloqueado && (
                  <Botao pequeno carregando={desbloquear.isPending && desbloquear.variables === u.id} onClick={() => direto(() => desbloquear.mutateAsync(u.id), `${u.nome} pode tentar entrar de novo`)}>
                    Desbloquear
                  </Botao>
                )}
                {!souEu && (
                  <>
                    <Botao pequeno onClick={() => setAcao({ tipo: 'admin', u })}>{u.admin ? 'Tirar admin' : 'Tornar admin'}</Botao>
                    {u.ativo ? (
                      <Botao pequeno variante="fantasmaPerigo" onClick={() => setAcao({ tipo: 'desativar', u })}>
                        Desativar
                      </Botao>
                    ) : (
                      <Botao pequeno onClick={() => direto(() => atualizar.mutateAsync({ id: u.id, ativo: true }), `${u.nome} reativado(a)`)}>
                        Reativar
                      </Botao>
                    )}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {acao?.tipo === 'novo' && <NovoUsuario aoFechar={() => setAcao(null)} />}
      {(acao?.tipo === 'nome' || acao?.tipo === 'senha') && <EditarUsuario key={`${acao.tipo}-${acao.u.id}`} modo={acao.tipo} u={acao.u} souEu={acao.u.id === eu?.id} aoFechar={() => setAcao(null)} />}
      {(acao?.tipo === 'admin' || acao?.tipo === 'desativar') && <ConfirmarPerfil key={`${acao.tipo}-${acao.u.id}`} tipo={acao.tipo} u={acao.u} aoFechar={() => setAcao(null)} />}
    </div>
  )
}

const CAMPOS_NOVO = ['nome', 'login', 'senha'] as const

function NovoUsuario({ aoFechar }: { aoFechar: () => void }) {
  const criar = useCriarUsuario()
  const notificar = useNotificar()
  const [novo, setNovo] = useState<UsuarioNovo>({ login: '', nome: '', senha: '', admin: false })
  const [erros, setErros] = useState<Partial<Record<(typeof CAMPOS_NOVO)[number], string>>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)

  function mudar<K extends keyof UsuarioNovo>(c: K, v: UsuarioNovo[K]) {
    setNovo((n) => ({ ...n, [c]: v }))
    setErros((e) => ({ ...e, [c]: undefined }))
  }

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault()
    setErroGeral(null)
    try {
      const criado = await criar.mutateAsync(novo)
      notificar(`Usuário ${criado.login} criado — passe o login e a senha para ${criado.nome}`)
      aoFechar()
    } catch (err) {
      const r = separarErros(err, CAMPOS_NOVO, 'Não foi possível criar o usuário.')
      setErros(r.campos)
      setErroGeral(r.geral)
    }
  }

  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo="Novo usuário"
      acoes={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primaria" carregando={criar.isPending} textoCarregando="Criando…" onClick={() => enviar()}>
            Criar
          </Botao>
        </>
      }
    >
      <form onSubmit={enviar} noValidate className="grid gap-4">
        {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
        <Campo rotulo="Nome completo" obrigatorio erro={erros.nome}>
          {(c) => <input {...c} autoFocus maxLength={200} placeholder="ex.: João da Silva" value={novo.nome} onChange={(e) => mudar('nome', e.target.value)} className={classeEntrada(!!erros.nome)} />}
        </Campo>
        <Campo rotulo="Login" obrigatorio erro={erros.login} dica="3 a 50 caracteres: letras sem acento, números, . _ -">
          {(c) => (
            <input {...c} autoCapitalize="none" autoComplete="off" spellCheck={false} maxLength={50} placeholder="ex.: joao.silva" value={novo.login} onChange={(e) => mudar('login', e.target.value.toLowerCase())} className={classeEntrada(!!erros.login)} />
          )}
        </Campo>
        <Campo rotulo="Senha" obrigatorio erro={erros.senha} dica="Mínimo 8 caracteres. Passe para a pessoa; ela pode pedir para trocar depois.">
          {(c) => <input {...c} autoComplete="new-password" value={novo.senha} onChange={(e) => mudar('senha', e.target.value)} className={classeEntrada(!!erros.senha)} />}
        </Campo>
        <label className="flex min-h-11 items-center gap-2.5">
          <input type="checkbox" className="h-5 w-5 accent-marinho" checked={novo.admin} onChange={(e) => mudar('admin', e.target.checked)} />
          Administrador (vê e edita tudo e gerencia usuários)
        </label>
        <button type="submit" hidden />
      </form>
    </Dialogo>
  )
}

function EditarUsuario({ modo, u, souEu, aoFechar }: { modo: 'nome' | 'senha'; u: UsuarioAdmin; souEu: boolean; aoFechar: () => void }) {
  const atualizar = useAtualizarUsuario()
  const redefinir = useRedefinirSenha()
  const notificar = useNotificar()
  const [valor, setValor] = useState(modo === 'nome' ? u.nome : '')
  const [erro, setErro] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  async function salvar(e?: React.FormEvent) {
    e?.preventDefault()
    setErro(null)
    try {
      if (modo === 'nome') {
        await atualizar.mutateAsync({ id: u.id, nome: valor })
        notificar('Nome alterado')
      } else {
        await redefinir.mutateAsync({ id: u.id, senha: valor })
        notificar(souEu ? 'Senha alterada' : `Senha alterada — ${u.nome} precisa entrar com a nova senha`)
      }
      aoFechar()
    } catch (err) {
      setErro(separarErros(err, [modo] as const, 'Não foi possível salvar.').campos[modo] ?? mensagemDeErro(err, 'Não foi possível salvar.'))
      campo.current?.focus()
    }
  }

  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo={modo === 'nome' ? `Editar o nome de ${u.login}` : `Redefinir a senha de ${u.nome}`}
      acoes={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primaria" carregando={atualizar.isPending || redefinir.isPending} textoCarregando="Salvando…" onClick={() => salvar()}>
            Salvar
          </Botao>
        </>
      }
    >
      <form onSubmit={salvar} noValidate>
        <Campo
          rotulo={modo === 'nome' ? 'Nome completo' : 'Nova senha'}
          obrigatorio
          erro={erro}
          dica={modo === 'senha' ? (souEu ? 'Mínimo 8 caracteres. Sua sessão atual continua.' : 'Mínimo 8 caracteres. As sessões abertas da pessoa são encerradas.') : 'Nome e sobrenome.'}
        >
          {(c) => <input {...c} ref={campo} autoFocus autoComplete={modo === 'senha' ? 'new-password' : 'off'} maxLength={200} value={valor} onChange={(e) => { setValor(e.target.value); setErro(null) }} className={classeEntrada(!!erro)} />}
        </Campo>
        <button type="submit" hidden />
      </form>
    </Dialogo>
  )
}

function ConfirmarPerfil({ tipo, u, aoFechar }: { tipo: 'admin' | 'desativar'; u: UsuarioAdmin; aoFechar: () => void }) {
  const atualizar = useAtualizarUsuario()
  const notificar = useNotificar()
  const [erro, setErro] = useState<string | null>(null)
  const titulo = tipo === 'desativar' ? `Desativar ${u.nome}?` : u.admin ? `Tirar o perfil de administrador de ${u.nome}?` : `Tornar ${u.nome} administrador?`
  const texto =
    tipo === 'desativar'
      ? 'O plantel é mantido, mas a pessoa não consegue mais entrar, as sessões abertas param na hora e ela some dos plantéis compartilhados. Dá para reativar depois.'
      : u.admin
        ? 'A pessoa volta a ver e editar só o próprio plantel e deixa de gerenciar usuários.'
        : 'A pessoa vai ver e editar os pombos de todos e gerenciar usuários.'

  return (
    <DialogoConfirmacao
      aberto
      aoFechar={aoFechar}
      titulo={titulo}
      textoConfirmar={tipo === 'desativar' ? 'Desativar' : u.admin ? 'Tirar admin' : 'Tornar admin'}
      perigo={tipo === 'desativar' || u.admin}
      carregando={atualizar.isPending}
      aoConfirmar={async () => {
        setErro(null)
        try {
          await atualizar.mutateAsync(tipo === 'desativar' ? { id: u.id, ativo: false } : { id: u.id, admin: !u.admin })
          notificar(tipo === 'desativar' ? `${u.nome} desativado(a)` : u.admin ? `${u.nome} não é mais administrador(a)` : `${u.nome} agora é administrador(a)`)
          aoFechar()
        } catch (err) {
          setErro(mensagemDeErro(err, 'Não foi possível salvar.')) // regras 8 e 9
        }
      }}
    >
      {erro ? <Aviso tom="erro">{erro}</Aviso> : <p>{texto}</p>}
    </DialogoConfirmacao>
  )
}
