import { useRef, useState } from 'react'

import { separarErros } from '../api/erros'
import { mensagemDeErro, useAtualizarProprietario, useCriarProprietario, usePombos, useProprietarios, useRemoverProprietario, useUsuarioAtual } from '../api/hooks'
import type { Proprietario, ProprietarioInput } from '../api/types'
import { FalhaAoCarregar } from '../components/FalhaAoCarregar'
import { rotuloPombal } from '../formatadores'
import { Aviso, Botao, Campo, Carregando, Dialogo, DialogoConfirmacao, Migalhas, Vazio, classeEntrada, useNotificar } from '../components/ui'

const CAMPOS = ['nome', 'colombodromo', 'telefone', 'endereco', 'email', 'observacoes'] as const
type CampoProp = (typeof CAMPOS)[number]
const VAZIO: Record<CampoProp, string> = { nome: '', colombodromo: '', telefone: '', endereco: '', email: '', observacoes: '' }

/** PR-01..03: donos e pombais que aparecem no pombo e no certificado. */
export function Proprietarios() {
  const { data: usuario } = useUsuarioAtual()
  const { data: proprietarios, isLoading, isError, error, refetch } = useProprietarios()
  const { data: plantel } = usePombos({ usuario_id: usuario!.id })
  const [editando, setEditando] = useState<Proprietario | 'novo' | null>(null)
  const [excluindo, setExcluindo] = useState<Proprietario | null>(null)

  const uso = new Map<number, number>()
  for (const p of plantel ?? []) if (p.proprietario) uso.set(p.proprietario.id, (uso.get(p.proprietario.id) ?? 0) + 1)

  return (
    <div className="space-y-4">
      <div>
        <Migalhas itens={[{ rotulo: 'Início', para: '/' }, { rotulo: 'Proprietários' }]} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold text-marinho">Proprietários</h1>
            <p className="text-sm text-slate-600">Donos e pombais que aparecem no pombo e no certificado.</p>
          </div>
          <Botao variante="primaria" onClick={() => setEditando('novo')}>
            + Novo proprietário
          </Botao>
        </div>
      </div>

      {isError ? (
        <FalhaAoCarregar erro={error} oQue="os proprietários" onTentar={refetch} />
      ) : isLoading ? (
        <Carregando linhas={4} rotulo="Carregando os proprietários…" />
      ) : !proprietarios?.length ? (
        <section className="rounded-[10px] border border-borda-suave bg-white shadow-sm">
          <Vazio titulo="Nenhum proprietário cadastrado" acao={<Botao variante="primaria" onClick={() => setEditando('novo')}>+ Novo proprietário</Botao>}>
            Cadastre o dono ou o pombal para escolher no pombo e mostrar no certificado.
          </Vazio>
        </section>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-borda-suave bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[#f6f8fb] text-left text-xs font-semibold text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2.5">Nome</th>
                <th scope="col" className="hidden px-4 py-2.5 md:table-cell">Pombal</th>
                <th scope="col" className="hidden px-4 py-2.5 md:table-cell">Contato</th>
                <th scope="col" className="hidden px-4 py-2.5 md:table-cell">Pombos</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda-suave">
              {proprietarios.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-3">
                    <b className="text-slate-900">{p.nome}</b>
                    {p.endereco && <div className="text-[13px] text-slate-600">{p.endereco}</div>}
                    {p.observacoes && <div className="line-clamp-2 text-[13px] italic text-slate-500">{p.observacoes}</div>}
                    <div className="mt-1 space-y-0.5 text-[13px] text-slate-600 md:hidden">
                      {p.colombodromo && <div>{rotuloPombal(p.colombodromo)}</div>}
                      {p.telefone && <div className="tabular-nums">{p.telefone}</div>}
                      {p.email && <div className="[overflow-wrap:anywhere]">{p.email}</div>}
                      <div>{uso.get(p.id) ?? 0} {(uso.get(p.id) ?? 0) === 1 ? 'pombo' : 'pombos'}</div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">{p.colombodromo || '—'}</td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="tabular-nums">{p.telefone || '—'}</span>
                    {p.email && <div className="text-[13px] text-slate-600 [overflow-wrap:anywhere]">{p.email}</div>}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="rounded-full bg-[#eef2f7] px-2.5 py-0.5 text-xs text-slate-600" aria-label={`${uso.get(p.id) ?? 0} pombos`}>
                      {uso.get(p.id) ?? 0}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right sm:px-4">
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                      <Botao pequeno onClick={() => setEditando(p)} aria-label={`Editar ${p.nome}`}>
                        Editar
                      </Botao>
                      <Botao pequeno variante="fantasmaPerigo" onClick={() => setExcluindo(p)} aria-label={`Excluir ${p.nome}`}>
                        Excluir
                      </Botao>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && <FormularioProprietario key={editando === 'novo' ? 'novo' : editando.id} atual={editando === 'novo' ? null : editando} aoFechar={() => setEditando(null)} />}
      <ExcluirProprietario alvo={excluindo} emUso={excluindo ? (uso.get(excluindo.id) ?? 0) : 0} aoFechar={() => setExcluindo(null)} />
    </div>
  )
}

/** PR-02: janela de novo/editar, erros embaixo do campo. */
function FormularioProprietario({ atual, aoFechar }: { atual: Proprietario | null; aoFechar: () => void }) {
  const criar = useCriarProprietario()
  const atualizar = useAtualizarProprietario()
  const notificar = useNotificar()
  const [dados, setDados] = useState<Record<CampoProp, string>>(() =>
    atual ? (Object.fromEntries(CAMPOS.map((c) => [c, atual[c] ?? ''])) as Record<CampoProp, string>) : VAZIO,
  )
  const [erros, setErros] = useState<Partial<Record<CampoProp, string>>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const salvando = criar.isPending || atualizar.isPending
  const refNome = useRef<HTMLInputElement>(null)

  function mudar(c: CampoProp, v: string) {
    setDados((d) => ({ ...d, [c]: v }))
    setErros((e) => ({ ...e, [c]: undefined }))
  }

  async function salvar(e?: React.FormEvent) {
    e?.preventDefault()
    setErroGeral(null)
    if (!dados.nome.trim()) {
      setErros({ nome: 'Nome: obrigatório' })
      refNome.current?.focus()
      return
    }
    const payload = Object.fromEntries(CAMPOS.map((c) => [c, c === 'nome' ? dados.nome : dados[c].trim() || null])) as ProprietarioInput
    try {
      if (atual) await atualizar.mutateAsync({ id: atual.id, dados: payload })
      else await criar.mutateAsync(payload)
      notificar(`${dados.nome.trim()} salvo`)
      aoFechar()
    } catch (err) {
      const r = separarErros(err, CAMPOS, 'Não foi possível salvar o proprietário.')
      setErros(r.campos)
      setErroGeral(r.geral)
    }
  }

  const texto = (c: CampoProp, rotulo: string, max: number, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> & { ref?: React.Ref<HTMLInputElement> } = {}, larga = false) => (
    <Campo rotulo={rotulo} obrigatorio={c === 'nome'} erro={erros[c]} className={larga ? 'sm:col-span-2' : ''}>
      {(ctl) => <input {...ctl} {...extra} maxLength={max} value={dados[c]} onChange={(e) => mudar(c, e.target.value)} className={classeEntrada(!!erros[c])} />}
    </Campo>
  )

  return (
    <Dialogo
      aberto
      largo
      aoFechar={aoFechar}
      titulo={atual ? `Editar ${atual.nome}` : 'Novo proprietário'}
      acoes={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primaria" carregando={salvando} textoCarregando="Salvando…" onClick={() => salvar()}>
            Salvar
          </Botao>
        </>
      }
    >
      <form onSubmit={salvar} noValidate className="grid gap-4 sm:grid-cols-2">
        {erroGeral && (
          <Aviso tom="erro" className="sm:col-span-2">
            {erroGeral}
          </Aviso>
        )}
        {texto('nome', 'Nome', 200, { ref: refNome, autoFocus: true }, true)}
        {texto('colombodromo', 'Pombal / colombódromo', 200)}
        {texto('telefone', 'Telefone', 50, { inputMode: 'tel', autoComplete: 'off' })}
        {texto('endereco', 'Endereço', 300, { placeholder: 'Rua, número, bairro, cidade/UF' }, true)}
        {texto('email', 'E-mail', 200, { type: 'email', inputMode: 'email', autoCapitalize: 'none' }, true)}
        <Campo rotulo="Observações" erro={erros.observacoes} className="sm:col-span-2" dica="O pombal, o endereço, o telefone, o e-mail e as observações aparecem no cabeçalho do certificado.">
          {(ctl) => (
            <textarea
              {...ctl}
              rows={3}
              maxLength={5000}
              placeholder="Títulos, especialidade, informações que aparecem no certificado"
              value={dados.observacoes}
              onChange={(e) => mudar('observacoes', e.target.value)}
              className={`${classeEntrada(!!erros.observacoes)} h-auto py-2`}
            />
          )}
        </Campo>
        <button type="submit" hidden />
      </form>
    </Dialogo>
  )
}

/** PR-03: em uso → só explica; sem uso → confirma; recusa do servidor → na janela. */
function ExcluirProprietario({ alvo, emUso, aoFechar }: { alvo: Proprietario | null; emUso: number; aoFechar: () => void }) {
  const remover = useRemoverProprietario()
  const notificar = useNotificar()
  const [erro, setErro] = useState<string | null>(null)
  const fechar = () => {
    setErro(null)
    aoFechar()
  }

  if (alvo && emUso > 0)
    return (
      <Dialogo aberto aoFechar={fechar} titulo={`Não é possível excluir ${alvo.nome}`} acoes={<Botao variante="escura" onClick={fechar}>Entendi</Botao>}>
        <p>
          Ele é proprietário de <b>{emUso} {emUso === 1 ? 'pombo' : 'pombos'}</b>. Troque o proprietário desses pombos antes de excluir.
        </p>
      </Dialogo>
    )

  return (
    <DialogoConfirmacao
      aberto={alvo !== null}
      aoFechar={fechar}
      titulo={`Excluir ${alvo?.nome ?? ''}?`}
      textoConfirmar="Excluir"
      perigo
      carregando={remover.isPending}
      aoConfirmar={async () => {
        if (!alvo) return
        setErro(null)
        try {
          await remover.mutateAsync(alvo.id)
          notificar(`${alvo.nome} excluído`)
          fechar()
        } catch (err) {
          setErro(mensagemDeErro(err, 'Não foi possível excluir o proprietário.')) // RG-10
        }
      }}
    >
      {erro ? <Aviso tom="erro">{erro}</Aviso> : <p>Nenhum pombo usa este proprietário. Não dá para desfazer.</p>}
    </DialogoConfirmacao>
  )
}
