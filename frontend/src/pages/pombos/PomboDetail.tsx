import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { eNaoEncontrado, mensagemDeErro, useArvore, useCopiarPombo, usePombo, useRemoverPombo, useResultados, useUsuarioAtual } from '../../api/hooks'
import type { PomboDetail as TPombo } from '../../api/types'
import { ArvoreGenealogica } from '../../components/arvore/ArvoreGenealogica'
import type { Papel } from '../../components/arvore/montagem'
import { PainelGenitor } from '../../components/arvore/PainelGenitor'
import { FalhaAoCarregar } from '../../components/FalhaAoCarregar'
import { IrmaosSection } from '../../components/IrmaosSection'
import { ResultadosSection } from '../../components/ResultadosSection'
import { Aviso, Botao, Carregando, Dialogo, DialogoConfirmacao, Migalhas, SeloSituacao, SexoRotulo, Vazio, classeBotao, classeEntrada, useNotificar } from '../../components/ui'

type Aba = 'pedigree' | 'resultados' | 'observacoes'
const GERACOES = [2, 3, 4, 5, 6]
const ALCANCE: Record<number, string> = { 2: 'até avós', 3: 'até bisavós', 4: 'até tataravós', 5: 'até a 5ª geração', 6: 'até a 6ª geração' }

/** Detalhe do pombo (DT-01..06) com a árvore (AR-01..06). */
export function PomboDetail() {
  const { id } = useParams()
  const pomboId = Number(id)
  const { data: pombo, isError, error, refetch } = usePombo(pomboId)

  if (isError) {
    return eNaoEncontrado(error) ? (
      <Vazio titulo="Pombo não encontrado" acao={<Link to="/pombos" className={classeBotao()}>Voltar para a lista</Link>}>
        Ele pode ter sido excluído, ou não está num plantel que você pode ver.
      </Vazio>
    ) : (
      <FalhaAoCarregar erro={error} oQue="o pombo" onTentar={refetch} />
    )
  }
  if (!pombo) {
    return (
      <div>
        <Migalhas itens={[{ rotulo: 'Início', para: '/' }, { rotulo: 'Meus pombos', para: '/pombos' }, { rotulo: 'Pombo' }]} />
        <Carregando linhas={6} rotulo="Carregando o pombo…" />
      </div>
    )
  }
  return <Detalhe key={pombo.id} pombo={pombo} />
}

function Detalhe({ pombo }: { pombo: TPombo }) {
  const navigate = useNavigate()
  const notificar = useNotificar()
  const { data: usuario } = useUsuarioAtual()
  const [geracoes, setGeracoes] = useState(4)
  const [aba, setAba] = useState<Aba>('pedigree')
  const [alvo, setAlvo] = useState<{ papel: Papel; filho: { id: number; anilha: string } } | null>(null)
  const [certificado, setCertificado] = useState(false)
  const [excluir, setExcluir] = useState(false)
  const [copiar, setCopiar] = useState(false)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const arvore = useArvore(pombo.id, geracoes)
  const resultados = useResultados(pombo.id) // contador da aba igual à tabela (DT-05)
  const remover = useRemoverPombo()
  const copiarPombo = useCopiarPombo()

  const doMeuPlantel = pombo.usuario_id === usuario!.id
  const podeEditar = doMeuPlantel || usuario!.admin

  async function confirmarExclusao() {
    setErroAcao(null)
    try {
      await remover.mutateAsync(pombo.id)
      notificar(`${pombo.anilha} excluído`)
      navigate('/pombos')
    } catch (err) {
      setErroAcao(mensagemDeErro(err, 'Não foi possível excluir o pombo.')) // RG-09: lista os filhos
    }
  }

  async function confirmarCopia() {
    setErroAcao(null)
    try {
      const copia = await copiarPombo.mutateAsync(pombo.id)
      notificar(`${pombo.anilha} copiado para o seu plantel`)
      setCopiar(false)
      navigate(`/pombos/${copia.id}`)
    } catch (err) {
      setErroAcao(mensagemDeErro(err, 'Não foi possível copiar o pombo.')) // RC-03: lista os conflitos
    }
  }

  return (
    <div>
      <Migalhas itens={[{ rotulo: 'Início', para: '/' }, { rotulo: 'Meus pombos', para: '/pombos' }, { rotulo: pombo.anilha }]} />

      {!doMeuPlantel && (
        <Aviso tom="alerta" className="mb-3.5">
          <b>Plantel de {pombo.dono.nome}</b>
          {podeEditar ? ' — você edita como administrador.' : ' — você pode ver este pombo, mas não alterá-lo.'}
        </Aviso>
      )}

      {/* DT-01 faixa */}
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-[14px] bg-[radial-gradient(130%_160%_at_90%_0%,#2b4b8a_0%,var(--color-marinho)_60%)] px-4 py-4 text-white sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h1 className="break-all text-[26px] font-bold leading-tight tabular-nums sm:text-[32px]">{pombo.anilha}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[#dbe4f3] [&_.text-femea]:text-pink-300 [&_.text-macho]:text-blue-300">
            <SexoRotulo sexo={pombo.sexo} />
            <span aria-hidden>·</span>
            <span>{pombo.cor || 'Cor não informada'}</span>
            <SeloSituacao situacao={pombo.status} />
            {!podeEditar && <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-px text-xs font-semibold text-amber-800">Só leitura</span>}
          </div>
          <p className="mt-1.5 text-[13px] text-[#b8c4da]">
            {pombo.proprietario ? (
              <>
                Proprietário: <b className="text-white">{pombo.proprietario.nome}</b>
                {pombo.proprietario.colombodromo && ` · Pombal ${pombo.proprietario.colombodromo}`}
              </>
            ) : (
              'Sem proprietário'
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao variante="primaria" onClick={() => setCertificado(true)} icone={<IconePdf />}>
            Certificado PDF
          </Botao>
          {podeEditar ? (
            <>
              <Link to={`/pombos/${pombo.id}/editar`} className={classeBotao('vidro')}>
                Editar
              </Link>
              <MenuMais
                aoCopiarAnilha={() => {
                  navigator.clipboard?.writeText(pombo.anilha)
                  notificar('Anilha copiada')
                }}
                aoExcluir={() => {
                  setErroAcao(null)
                  setExcluir(true)
                }}
              />
            </>
          ) : (
            <Botao variante="vidro" onClick={() => { setErroAcao(null); setCopiar(true) }}>
              Copiar para meu plantel
            </Botao>
          )}
        </div>
      </section>

      {/* DT-05 abas */}
      <Abas aba={aba} aoTrocar={setAba} totalResultados={resultados.data?.length ?? pombo.resultados.length} />

      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`} tabIndex={-1}>
        {aba === 'pedigree' && (
          <div className="space-y-5">
            <section aria-labelledby="titulo-arvore" className="rounded-[10px] border border-borda-suave bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                <h2 id="titulo-arvore" className="text-[17px] font-semibold text-marinho">
                  Árvore genealógica
                </h2>
                <label className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
                  Gerações
                  <select value={geracoes} onChange={(e) => setGeracoes(Number(e.target.value))} className={`${classeEntrada()} !h-9 w-20`}>
                    {GERACOES.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
              </div>
              {arvore.isError ? (
                <FalhaAoCarregar erro={arvore.error} oQue="a árvore" onTentar={arvore.refetch} />
              ) : !arvore.data ? (
                <Carregando linhas={4} rotulo="Carregando a árvore…" />
              ) : (
                <ArvoreGenealogica raiz={arvore.data.raiz} geracoes={arvore.data.geracoes} podeEditar={podeEditar} aoAdicionar={(papel, filho) => setAlvo({ papel, filho })} />
              )}
              <ul aria-label="Legenda" className="mt-3.5 hidden flex-wrap gap-4 text-xs text-slate-600 sm:flex">
                <li><b aria-hidden className="text-macho">♂</b> Macho</li>
                <li><b aria-hidden className="text-femea">♀</b> Fêmea</li>
                <li className="flex items-center gap-1.5"><i aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-300" />Ancestral repetido (consanguinidade)</li>
                {podeEditar && <li className="flex items-center gap-1.5"><i aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-[#b7c2d4]" />Desconhecido — clique para adicionar</li>}
              </ul>
            </section>
            <IrmaosSection pomboId={pombo.id} />
          </div>
        )}
        {aba === 'resultados' && <ResultadosSection pomboId={pombo.id} somenteLeitura={!podeEditar} />}
        {aba === 'observacoes' && (
          <section className="space-y-3 rounded-[10px] border border-borda-suave bg-white p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-[15px] font-semibold text-marinho">Observações</h2>
              <p className="mt-1 whitespace-pre-line text-slate-700">{pombo.observacoes || 'Nenhuma observação.'}</p>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-marinho">Origem</h2>
              <p className="mt-1 text-slate-700">{pombo.origem || '—'}</p>
            </div>
            {podeEditar && (
              <Link to={`/pombos/${pombo.id}/editar`} className={classeBotao('secundaria', true)}>
                Editar observações
              </Link>
            )}
          </section>
        )}
      </div>

      <PainelGenitor alvo={alvo} donoId={pombo.usuario_id} aoFechar={() => setAlvo(null)} />

      <DialogoCertificadoPdf aberto={certificado} aoFechar={() => setCertificado(false)} pombo={pombo} geracoesArvore={geracoes} />

      <DialogoConfirmacao
        aberto={excluir}
        aoFechar={() => setExcluir(false)}
        aoConfirmar={confirmarExclusao}
        titulo={`Excluir ${pombo.anilha}?`}
        textoConfirmar="Excluir pombo"
        perigo
        carregando={remover.isPending}
      >
        {erroAcao ? <Aviso tom="erro">{erroAcao}</Aviso> : <p>Os resultados dele também serão apagados. <b>Não dá para desfazer.</b></p>}
      </DialogoConfirmacao>

      <DialogoConfirmacao
        aberto={copiar}
        aoFechar={() => setCopiar(false)}
        aoConfirmar={confirmarCopia}
        titulo={`Copiar ${pombo.anilha} para o seu plantel?`}
        textoConfirmar="Copiar"
        carregando={copiarPombo.isPending}
      >
        {erroAcao ? <Aviso tom="erro">{erroAcao}</Aviso> : <p>Vão junto os ancestrais e os resultados. A cópia é independente do original.</p>}
      </DialogoConfirmacao>
    </div>
  )
}

function IconePdf() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[17px] w-[17px]">
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
        <path d="M14 3H6v18h12V7z" />
        <path d="M14 3v4h4M9 13h6M9 17h6" />
      </g>
    </svg>
  )
}

/** DT-05: abas com setas do teclado (← →, Home, End). */
function Abas({ aba, aoTrocar, totalResultados }: { aba: Aba; aoTrocar: (a: Aba) => void; totalResultados: number }) {
  const lista: [Aba, string][] = [
    ['pedigree', 'Pedigree'],
    ['resultados', 'Resultados'],
    ['observacoes', 'Observações'],
  ]
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  function tecla(e: React.KeyboardEvent, i: number) {
    const destino = e.key === 'ArrowRight' ? (i + 1) % lista.length : e.key === 'ArrowLeft' ? (i - 1 + lista.length) % lista.length : e.key === 'Home' ? 0 : e.key === 'End' ? lista.length - 1 : -1
    if (destino < 0) return
    e.preventDefault()
    aoTrocar(lista[destino][0])
    refs.current[lista[destino][0]]?.focus()
  }
  return (
    <div role="tablist" aria-label="Seções do pombo" className="my-4 flex gap-1 overflow-x-auto border-b border-borda">
      {lista.map(([valor, texto], i) => (
        <button
          key={valor}
          ref={(el) => {
            refs.current[valor] = el
          }}
          id={`aba-${valor}`}
          type="button"
          role="tab"
          aria-selected={aba === valor}
          aria-controls={`painel-${valor}`}
          tabIndex={aba === valor ? 0 : -1}
          onClick={() => aoTrocar(valor)}
          onKeyDown={(e) => tecla(e, i)}
          className={`-mb-px min-h-11 whitespace-nowrap border-b-[3px] px-3.5 font-semibold ${aba === valor ? 'border-dourado text-marinho' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
        >
          {texto}
          {valor === 'resultados' && <span className="ml-1.5 rounded-full bg-[#e8edf5] px-1.5 text-[11px] text-slate-600">{totalResultados}</span>}
        </button>
      ))}
    </div>
  )
}

/** ⋯ Mais ações (UX-09): excluir fica longe das ações comuns. */
function MenuMais({ aoCopiarAnilha, aoExcluir }: { aoCopiarAnilha: () => void; aoExcluir: () => void }) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])
  const item = 'flex min-h-11 w-full items-center rounded-lg px-3 text-left hover:bg-fundo sm:min-h-10'
  return (
    <div className="relative" ref={raiz}>
      <Botao variante="vidro" aria-label="Mais ações" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        ⋯
      </Botao>
      {aberto && (
        <div role="menu" className="absolute right-0 top-12 z-20 w-56 rounded-[10px] border border-borda-suave bg-white p-1 text-slate-800 shadow-2xl max-sm:left-0 max-sm:right-auto">
          <button role="menuitem" type="button" className={item} onClick={() => { setAberto(false); aoCopiarAnilha() }}>
            Copiar anilha
          </button>
          <button role="menuitem" type="button" className={`${item} text-red-700`} onClick={() => { setAberto(false); aoExcluir() }}>
            Excluir pombo…
          </button>
        </div>
      )}
    </div>
  )
}

/** DT-03: escolher 2 a 6 gerações; o layout do PDF não muda. */
function DialogoCertificadoPdf({ aberto, aoFechar, pombo, geracoesArvore }: { aberto: boolean; aoFechar: () => void; pombo: TPombo; geracoesArvore: number }) {
  const [escolha, setEscolha] = useState<number | null>(null)
  const geracoes = escolha ?? geracoesArvore
  const marcado = useRef<HTMLInputElement>(null)
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={() => { setEscolha(null); aoFechar() }}
      titulo={`Certificado de ${pombo.anilha}`}
      focoInicial={marcado}
      acoes={
        <>
          <Botao onClick={() => { setEscolha(null); aoFechar() }}>Cancelar</Botao>
          <a
            href={`/api/pombos/${pombo.id}/certificado?geracoes=${geracoes}`}
            download
            onClick={() => { setEscolha(null); aoFechar() }}
            className={classeBotao('primaria')}
          >
            Baixar PDF ({geracoes} gerações)
          </a>
        </>
      }
    >
      <fieldset>
        <legend className="mb-2.5">Quantas gerações de ancestrais vão no PDF?</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {GERACOES.map((g) => (
            <label
              key={g}
              className="flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-[10px] border border-borda bg-white px-1 py-2 text-center has-[:checked]:border-marinho has-[:checked]:bg-dourado-claro has-[:checked]:shadow-[inset_0_0_0_1px_var(--color-marinho)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-link"
            >
              <input ref={g === geracoes ? marcado : undefined} type="radio" name="geracoes-pdf" value={g} checked={g === geracoes} onChange={() => setEscolha(g)} className="sr-only" />
              <b className="text-xl text-marinho">{g}</b>
              <span className="text-[11.5px] text-slate-600">{ALCANCE[g]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-2.5 text-xs text-slate-500">Mesmo layout de hoje (A4 deitado). Com mais gerações, as caixas mais distantes mostram menos detalhes para caber na página.</p>
    </Dialogo>
  )
}
