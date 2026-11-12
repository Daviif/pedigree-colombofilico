import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { separarErros } from '../../api/erros'
import {
  eNaoEncontrado,
  useAtualizarPombo,
  useCriarPombo,
  usePombo,
  usePombos,
  useProprietarios,
  useUsuarioAtual,
} from '../../api/hooks'
import type { PomboDetail, PomboInput, Sexo, StatusPombo } from '../../api/types'
import { FalhaAoCarregar } from '../../components/FalhaAoCarregar'
import { PomboSelect } from '../../components/PomboSelect'
import { Aviso, Botao, BotaoBarra, Campo, Carregando, Migalhas, Vazio, classeBotao, classeEntrada, useNotificar } from '../../components/ui'
import { capitalizarPrimeira, limparAnilha } from '../../formatadores'

const CAMPOS = ['anilha', 'sexo', 'cor', 'status', 'proprietario_id', 'pai_id', 'mae_id', 'origem', 'observacoes'] as const
type CampoPombo = (typeof CAMPOS)[number]

const VAZIO: PomboInput = {
  anilha: '',
  sexo: 'DESCONHECIDO',
  cor: '',
  status: 'ATIVO',
  observacoes: '',
  origem: '',
  proprietario_id: undefined,
  pai_id: undefined,
  mae_id: undefined,
}

function dadosDe(p: PomboDetail): PomboInput {
  return {
    anilha: p.anilha,
    sexo: p.sexo,
    cor: p.cor ?? '',
    status: p.status,
    observacoes: p.observacoes ?? '',
    origem: p.origem ?? '',
    proprietario_id: p.proprietario_id ?? undefined,
    pai_id: p.pai_id ?? undefined,
    mae_id: p.mae_id ?? undefined,
  }
}

/** Cadastro e edição de pombo (CA-01..07). Aqui só o carregamento; o formulário vem abaixo. */
export function PomboForm() {
  const params = useParams()
  const editandoId = params.id ? Number(params.id) : undefined
  const pomboQuery = usePombo(editandoId)
  const [busca] = useSearchParams()

  const migalhas = (rotulo: string) => (
    <Migalhas itens={[{ rotulo: 'Início', para: '/' }, { rotulo: 'Meus pombos', para: '/pombos' }, { rotulo }]} />
  )

  if (editandoId) {
    if (pomboQuery.isError) {
      return eNaoEncontrado(pomboQuery.error) ? (
        <Vazio titulo="Pombo não encontrado" acao={<Link to="/pombos" className={classeBotao()}>Voltar para a lista</Link>}>
          Ele pode ter sido excluído, ou não está num plantel que você pode editar.
        </Vazio>
      ) : (
        <FalhaAoCarregar erro={pomboQuery.error} oQue="o pombo" onTentar={pomboQuery.refetch} />
      )
    }
    // CA-06: nada de formulário vazio enquanto os dados não chegam
    if (!pomboQuery.data) {
      return (
        <div className="max-w-3xl">
          {migalhas('Editar pombo')}
          <Carregando linhas={6} rotulo="Carregando o pombo…" />
        </div>
      )
    }
    return <FormularioPombo key={editandoId} pombo={pomboQuery.data} migalhas={migalhas(`Editar ${pomboQuery.data.anilha}`)} />
  }

  // NV-05: "Cadastrar <anilha>" na busca abre o formulário com a anilha preenchida
  return (
    <FormularioPombo
      key="novo"
      inicial={{ ...VAZIO, anilha: limparAnilha(busca.get('anilha') ?? '') }}
      migalhas={migalhas('Novo pombo')}
    />
  )
}

function FormularioPombo({ pombo, inicial, migalhas }: { pombo?: PomboDetail; inicial?: PomboInput; migalhas: React.ReactNode }) {
  const navigate = useNavigate()
  const notificar = useNotificar()
  const { data: usuario } = useUsuarioAtual()
  const editando = pombo !== undefined
  // Pai, mãe e proprietário vêm do plantel do pombo (o admin pode editar pombos de outros).
  const donoId = editando ? pombo.usuario_id : usuario!.id
  const { data: todosPombos } = usePombos({ usuario_id: donoId })
  const { data: proprietarios } = useProprietarios(donoId)
  const criar = useCriarPombo()
  const atualizar = useAtualizarPombo()

  const [dados, setDados] = useState<PomboInput>(() => (pombo ? dadosDe(pombo) : (inicial ?? VAZIO)))
  const [erros, setErros] = useState<Partial<Record<CampoPombo, string>>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const anilhaRef = useRef<HTMLInputElement>(null)
  const salvando = criar.isPending || atualizar.isPending

  // CA-03: as cores mais usadas no plantel
  const cores = useMemo(() => {
    const contagem = new Map<string, number>()
    for (const p of todosPombos ?? []) if (p.cor) contagem.set(p.cor, (contagem.get(p.cor) ?? 0) + 1)
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [todosPombos])

  function campo<K extends keyof PomboInput>(chave: K, valor: PomboInput[K]) {
    setDados((d) => ({ ...d, [chave]: valor }))
    if (erros[chave as CampoPombo]) setErros((e) => ({ ...e, [chave]: undefined }))
  }

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (salvando) return
    const outro = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-acao') === 'outro'
    setErroGeral(null)
    if (!dados.anilha.trim()) {
      setErros({ anilha: 'Anilha: obrigatória' })
      anilhaRef.current?.focus()
      return
    }
    setErros({})
    const payload: PomboInput = {
      ...dados,
      cor: dados.cor?.trim() || null,
      observacoes: dados.observacoes?.trim() || null,
      origem: dados.origem?.trim() || null,
    }
    try {
      const salvo = editando
        ? await atualizar.mutateAsync({ id: pombo.id, dados: payload })
        : await criar.mutateAsync(payload)
      if (outro) {
        // CA-04: mantém pai, mãe, proprietário, cor e situação
        notificar(`${salvo.anilha} salvo — cadastre o próximo`)
        setDados((d) => ({ ...d, anilha: '', sexo: 'DESCONHECIDO', origem: '', observacoes: '' }))
        anilhaRef.current?.focus()
      } else {
        notificar(`${salvo.anilha} salvo`)
        navigate(`/pombos/${salvo.id}`)
      }
    } catch (err) {
      // CA-02: erro do servidor embaixo do campo certo; o que foi digitado continua no formulário
      const r = separarErros(err, CAMPOS, 'Não foi possível salvar o pombo.')
      setErros(r.campos)
      setErroGeral(r.geral)
      if (r.campos.anilha) anilhaRef.current?.focus()
    }
  }

  const titulo = editando ? `Editar ${pombo.anilha}` : 'Novo pombo'

  return (
    <div className="max-w-3xl">
      {migalhas}
      <h1 className="text-[26px] font-bold text-marinho">{titulo}</h1>
      <p className="mb-4 text-sm text-slate-600">
        Campos com <span className="text-red-700">*</span> são obrigatórios.
      </p>

      <form onSubmit={salvar} noValidate className="rounded-[10px] border border-borda-suave bg-white p-4 shadow-sm sm:p-6">
        {erroGeral && (
          <Aviso tom="erro" className="mb-4">
            {erroGeral}
          </Aviso>
        )}

        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <Campo rotulo="Anilha" obrigatorio erro={erros.anilha} dica="Só números e /, ex.: 4272402/24">
            {(c) => (
              <div className="flex gap-2">
                <input
                  {...c}
                  ref={anilhaRef}
                  autoFocus={!editando}
                  inputMode="numeric"
                  className={`${classeEntrada(!!erros.anilha)} tabular-nums`}
                  value={dados.anilha}
                  onChange={(e) => campo('anilha', limparAnilha(e.target.value))}
                />
                <BotaoBarra aoInserir={() => campo('anilha', limparAnilha(dados.anilha + '/'))} />
              </div>
            )}
          </Campo>

          <fieldset aria-describedby={erros.sexo ? 'erro-sexo' : undefined}>
            <legend className="mb-1.5 text-[13px] font-semibold text-slate-700">Sexo</legend>
            <div className="flex gap-2">
              {(
                [
                  ['M', '♂', 'Macho', 'text-macho'],
                  ['F', '♀', 'Fêmea', 'text-femea'],
                  ['DESCONHECIDO', '', 'Não sei', ''],
                ] as [Sexo, string, string, string][]
              ).map(([valor, simbolo, rotulo, cor]) => (
                <label
                  key={valor}
                  className="relative flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] border border-borda font-medium has-[:checked]:border-marinho has-[:checked]:bg-[#f8fafd] has-[:checked]:font-bold has-[:checked]:shadow-[inset_0_0_0_1px_var(--color-marinho)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link sm:h-[42px]"
                >
                  <input type="radio" name="sexo" value={valor} checked={dados.sexo === valor} onChange={() => campo('sexo', valor)} className="sr-only" />
                  {simbolo && (
                    <b aria-hidden className={`text-[17px] ${cor}`}>
                      {simbolo}
                    </b>
                  )}
                  {rotulo}
                </label>
              ))}
            </div>
            {erros.sexo && (
              <p id="erro-sexo" role="alert" className="mt-1.5 flex gap-1 text-[12.5px] text-red-700">
                <span aria-hidden>⚠</span>
                {erros.sexo}
              </p>
            )}
          </fieldset>

          <Campo rotulo="Cor" erro={erros.cor}>
            {(c) => (
              <div className="flex flex-col gap-2">
                <input
                  {...c}
                  list="cores-plantel"
                  placeholder="ex.: Escama"
                  className={classeEntrada(!!erros.cor)}
                  value={dados.cor ?? ''}
                  onChange={(e) => campo('cor', capitalizarPrimeira(e.target.value))}
                />
                <datalist id="cores-plantel">
                  {cores.map((cor) => (
                    <option key={cor} value={cor} />
                  ))}
                </datalist>
                {cores.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" aria-label="Cores mais usadas no seu plantel">
                    {cores.slice(0, 6).map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        onClick={() => campo('cor', cor)}
                        aria-pressed={dados.cor === cor}
                        className="min-h-11 rounded-full border border-borda bg-white px-3 text-[13px] hover:border-dourado-2 hover:bg-dourado-claro aria-pressed:border-marinho aria-pressed:bg-[#f8fafd] sm:min-h-8"
                      >
                        {cor}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Campo>

          <Campo rotulo="Situação" erro={erros.status}>
            {(c) => (
              <select {...c} className={classeEntrada(!!erros.status)} value={dados.status} onChange={(e) => campo('status', e.target.value as StatusPombo)}>
                <option value="ATIVO">Ativo</option>
                <option value="REPRODUTOR">Reprodutor</option>
                <option value="VENDIDO">Vendido</option>
                <option value="FALECIDO">Falecido</option>
              </select>
            )}
          </Campo>

          <Campo rotulo="Pai ♂" erro={erros.pai_id} dica="Só machos ou de sexo desconhecido">
            {(c) => (
              <PomboSelect
                controle={c}
                invalido={!!erros.pai_id}
                pombos={todosPombos ?? []}
                value={dados.pai_id}
                onChange={(id) => campo('pai_id', id)}
                excludeId={pombo?.id}
                label="pai"
                sexoPadrao="M"
                permitirCriar={donoId === usuario!.id}
              />
            )}
          </Campo>

          <Campo rotulo="Mãe ♀" erro={erros.mae_id} dica="Só fêmeas ou de sexo desconhecido">
            {(c) => (
              <PomboSelect
                controle={c}
                invalido={!!erros.mae_id}
                pombos={todosPombos ?? []}
                value={dados.mae_id}
                onChange={(id) => campo('mae_id', id)}
                excludeId={pombo?.id}
                label="mãe"
                sexoPadrao="F"
                permitirCriar={donoId === usuario!.id}
              />
            )}
          </Campo>

          <Campo rotulo="Proprietário" erro={erros.proprietario_id}>
            {(c) => (
              <select
                {...c}
                className={classeEntrada(!!erros.proprietario_id)}
                value={dados.proprietario_id ?? ''}
                onChange={(e) => campo('proprietario_id', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Sem proprietário</option>
                {proprietarios?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          <Campo rotulo="Origem" erro={erros.origem} dica="Se o pai ou a mãe não estão no sistema">
            {(c) => (
              <input {...c} placeholder="ex.: Comprado de terceiros" className={classeEntrada(!!erros.origem)} value={dados.origem ?? ''} onChange={(e) => campo('origem', e.target.value)} />
            )}
          </Campo>

          <Campo rotulo="Observações" erro={erros.observacoes} className="sm:col-span-2">
            {(c) => (
              <textarea {...c} rows={3} className={`${classeEntrada(!!erros.observacoes)} h-auto py-2.5`} value={dados.observacoes ?? ''} onChange={(e) => campo('observacoes', e.target.value)} />
            )}
          </Campo>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Botao type="submit" variante="primaria" carregando={salvando} data-acao="salvar">
            Salvar
          </Botao>
          {!editando && (
            <Botao type="submit" data-acao="outro" disabled={salvando}>
              Salvar e cadastrar outro
            </Botao>
          )}
          <Botao variante="fantasma" onClick={() => navigate(-1)}>
            Cancelar
          </Botao>
        </div>
      </form>
    </div>
  )
}
