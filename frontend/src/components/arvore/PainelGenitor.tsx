import { useMemo, useRef, useState } from 'react'

import { separarErros } from '../../api/erros'
import { usePombos, usePreencherGenitor } from '../../api/hooks'
import { limparAnilha, capitalizarPrimeira } from '../../formatadores'
import { Aviso, Botao, BotaoBarra, Campo, PainelLateral, classeEntrada, useNotificar } from '../ui'
import type { Papel } from './montagem'

type Props = {
  alvo: { papel: Papel; filho: { id: number; anilha: string } } | null
  donoId: number
  aoFechar: () => void
}

/** AR-05: escolher do plantel ou cadastrar novo, sem sair da árvore (PE-01..05). */
export function PainelGenitor({ alvo, donoId, aoFechar }: Props) {
  return (
    <PainelLateral
      aberto={alvo !== null}
      aoFechar={aoFechar}
      titulo={alvo ? `Adicionar ${alvo.papel === 'pai' ? 'pai ♂' : 'mãe ♀'} de ${alvo.filho.anilha}` : ''}
      subtitulo={alvo?.papel === 'pai' ? 'Mostrando só machos ou de sexo desconhecido' : 'Mostrando só fêmeas ou de sexo desconhecido'}
    >
      {alvo && <Conteudo key={`${alvo.filho.id}-${alvo.papel}`} alvo={alvo} donoId={donoId} aoFechar={aoFechar} />}
    </PainelLateral>
  )
}

function Conteudo({ alvo, donoId, aoFechar }: { alvo: NonNullable<Props['alvo']>; donoId: number; aoFechar: () => void }) {
  const [aba, setAba] = useState<'escolher' | 'novo'>('escolher')
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState({ anilha: '', cor: '' })
  const [erros, setErros] = useState<{ anilha?: string; cor?: string }>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const anilhaNovo = useRef<HTMLInputElement>(null)
  const notificar = useNotificar()
  const preencher = usePreencherGenitor()
  const { data: pombos, isLoading } = usePombos({ usuario_id: donoId })
  const pai = alvo.papel === 'pai'
  const rotulo = pai ? 'pai' : 'mãe'

  const opcoes = useMemo(() => {
    const permitidos = pai ? ['M', 'DESCONHECIDO'] : ['F', 'DESCONHECIDO']
    const q = busca.trim()
    return (pombos ?? [])
      .filter((p) => p.id !== alvo.filho.id && permitidos.includes(p.sexo) && (!q || p.anilha.includes(q)))
      .slice(0, 30)
  }, [pombos, busca, pai, alvo.filho.id])

  async function ligar(dados: Parameters<typeof preencher.mutateAsync>[0]['dados'], anilha: string) {
    setErroGeral(null)
    try {
      await preencher.mutateAsync({ filhoId: alvo.filho.id, dados })
      notificar(`${anilha} ligado como ${rotulo} de ${alvo.filho.anilha}`)
      aoFechar()
    } catch (err) {
      const r = separarErros(err, ['anilha', 'cor'] as const, 'Não foi possível ligar o pombo.')
      setErros(r.campos)
      setErroGeral(r.geral)
    }
  }

  function trocarAba(nova: 'escolher' | 'novo') {
    setAba(nova)
    setErroGeral(null)
    if (nova === 'novo') setNovo((n) => ({ ...n, anilha: n.anilha || limparAnilha(busca) }))
  }

  return (
    <>
      <div role="tablist" aria-label="Como adicionar" className="mx-5 mt-1 flex gap-1 border-b border-borda-suave">
        {(
          [
            ['escolher', 'Escolher do plantel'],
            ['novo', 'Cadastrar novo'],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={aba === valor}
            onClick={() => trocarAba(valor)}
            className={`-mb-px min-h-11 border-b-[3px] px-3 font-semibold ${aba === valor ? 'border-dourado text-marinho' : 'border-transparent text-slate-600'}`}
          >
            {texto}
          </button>
        ))}
      </div>

      <div className="px-5 py-4">
        {erroGeral && (
          <Aviso tom="erro" className="mb-3">
            {erroGeral}
          </Aviso>
        )}

        {aba === 'escolher' ? (
          <div role="tabpanel" aria-label="Escolher do plantel">
            <input
              autoFocus
              type="search"
              aria-label={`Buscar ${rotulo} pela anilha`}
              placeholder="Buscar pela anilha…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={classeEntrada()}
            />
            <ul className="mt-3 space-y-2">
              {isLoading && <li className="text-sm text-slate-500">Carregando o plantel…</li>}
              {opcoes.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-borda-suave px-3 py-2.5 hover:bg-[#f8fafd]">
                  <span>
                    <b className="text-marinho tabular-nums">
                      <span aria-hidden className={p.sexo === 'M' ? 'text-macho' : p.sexo === 'F' ? 'text-femea' : 'text-slate-400'}>
                        {p.sexo === 'M' ? '♂' : p.sexo === 'F' ? '♀' : '?'}
                      </span>{' '}
                      {p.anilha}
                    </b>
                    <span className="block text-[13px] text-slate-600">
                      {p.sexo === 'M' ? 'Macho' : p.sexo === 'F' ? 'Fêmea' : 'Sexo desconhecido'} · {p.cor || '—'}
                    </span>
                  </span>
                  <Botao
                    variante="escura"
                    pequeno
                    carregando={preencher.isPending && preencher.variables?.dados && 'genitor_id' in preencher.variables.dados && preencher.variables.dados.genitor_id === p.id}
                    textoCarregando="Ligando…"
                    disabled={preencher.isPending}
                    onClick={() => ligar({ papel: alvo.papel, genitor_id: p.id }, p.anilha)}
                    aria-label={`Escolher ${p.anilha} como ${rotulo}`}
                  >
                    Escolher
                  </Botao>
                </li>
              ))}
              {!isLoading && opcoes.length === 0 && (
                <li className="py-6 text-center text-slate-600">
                  {busca ? (
                    <>
                      Nenhum pombo com <b>{busca}</b>.
                    </>
                  ) : (
                    `Nenhum pombo que possa ser ${rotulo} no plantel.`
                  )}
                  <div className="mt-2.5">
                    <Botao pequeno onClick={() => trocarAba('novo')}>
                      Cadastrar {busca && /^[0-9/]+$/.test(busca) ? busca : 'novo'}
                    </Botao>
                  </div>
                </li>
              )}
            </ul>
          </div>
        ) : (
          <form
            role="tabpanel"
            aria-label="Cadastrar novo"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              if (!novo.anilha.trim()) {
                setErros({ anilha: 'Anilha: obrigatória' })
                anilhaNovo.current?.focus()
                return
              }
              setErros({})
              ligar({ papel: alvo.papel, novo: { anilha: novo.anilha, cor: novo.cor.trim() || null } }, novo.anilha)
            }}
            className="space-y-4"
          >
            <Campo rotulo="Anilha" obrigatorio erro={erros.anilha}>
              {(c) => (
                <div className="flex gap-2">
                  <input
                    {...c}
                    ref={anilhaNovo}
                    autoFocus
                    inputMode="numeric"
                    value={novo.anilha}
                    onChange={(e) => {
                      setNovo((n) => ({ ...n, anilha: limparAnilha(e.target.value) }))
                      setErros((x) => ({ ...x, anilha: undefined }))
                    }}
                    className={`${classeEntrada(!!erros.anilha)} tabular-nums`}
                  />
                  <BotaoBarra aoInserir={() => setNovo((n) => ({ ...n, anilha: limparAnilha(n.anilha + '/') }))} />
                </div>
              )}
            </Campo>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-slate-700">Sexo</p>
              <p className="flex h-11 items-center rounded-[7px] border border-borda bg-fundo px-3 text-slate-700">
                {pai ? '♂ Macho' : '♀ Fêmea'} <span className="ml-1 text-sm text-slate-500">(definido pelo papel)</span>
              </p>
            </div>
            <Campo rotulo="Cor" erro={erros.cor}>
              {(c) => (
                <input {...c} list="cores-plantel-arvore" value={novo.cor} onChange={(e) => setNovo((n) => ({ ...n, cor: capitalizarPrimeira(e.target.value) }))} className={classeEntrada(!!erros.cor)} />
              )}
            </Campo>
            <datalist id="cores-plantel-arvore">
              {[...new Set((pombos ?? []).map((p) => p.cor).filter(Boolean))].map((cor) => (
                <option key={cor!} value={cor!} />
              ))}
            </datalist>
            <Botao type="submit" variante="primaria" className="w-full" carregando={preencher.isPending} textoCarregando="Cadastrando…">
              Cadastrar e ligar
            </Botao>
          </form>
        )}
      </div>
    </>
  )
}
