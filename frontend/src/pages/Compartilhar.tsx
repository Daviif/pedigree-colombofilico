import { useState } from 'react'
import { Link } from 'react-router-dom'

import { mensagemDeErro, useCompartilhamentos, useCompartilhar, useRemoverCompartilhamento } from '../api/hooks'
import type { UsuarioComLogin } from '../api/types'
import { FalhaAoCarregar } from '../components/FalhaAoCarregar'
import { Aviso, Botao, Campo, Carregando, DialogoConfirmacao, Migalhas, classeBotao, classeEntrada, useNotificar } from '../components/ui'
import { iniciais } from '../formatadores'

type Remocao = { tipo: 'concedidos' | 'recebidos'; pessoa: UsuarioComLogin }

/** CP-01 / CP-02: mostrar o plantel a outro criador, só para leitura. */
export function Compartilhar() {
  const { data, isLoading, isError, error, refetch } = useCompartilhamentos()
  const compartilhar = useCompartilhar()
  const remover = useRemoverCompartilhamento()
  const notificar = useNotificar()
  const [login, setLogin] = useState('')
  const [erroLogin, setErroLogin] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<Remocao | null>(null)
  const [erroRemocao, setErroRemocao] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const alvo = login.trim().toLowerCase()
    if (!alvo) {
      setErroLogin('Login: obrigatório')
      return
    }
    setErroLogin(null)
    try {
      const novo = await compartilhar.mutateAsync(alvo)
      const pessoa = novo.concedidos.find((u) => u.login === alvo)
      notificar(`Plantel compartilhado com ${pessoa ? `${pessoa.nome} (${pessoa.login})` : alvo}`)
      setLogin('')
    } catch (err) {
      setErroLogin(mensagemDeErro(err, 'Não foi possível compartilhar.'))
    }
  }

  async function confirmarRemocao() {
    if (!removendo) return
    setErroRemocao(null)
    try {
      await remover.mutateAsync({ tipo: removendo.tipo, usuarioId: removendo.pessoa.id })
      notificar(removendo.tipo === 'concedidos' ? `${removendo.pessoa.nome} não vê mais o seu plantel` : `Você não vê mais o plantel de ${removendo.pessoa.nome}`)
      setRemovendo(null)
    } catch (err) {
      setErroRemocao(mensagemDeErro(err, 'Não foi possível concluir.'))
    }
  }

  const cartao = 'rounded-[10px] border border-borda-suave bg-white p-4 shadow-sm sm:p-5'

  return (
    <div className="space-y-4">
      <div>
        <Migalhas itens={[{ rotulo: 'Início', para: '/' }, { rotulo: 'Compartilhar' }]} />
        <h1 className="text-[26px] font-bold text-marinho">Compartilhar</h1>
        <p className="text-sm text-slate-600">Mostre o seu plantel a outro criador, só para leitura.</p>
      </div>

      {isError && <FalhaAoCarregar erro={error} oQue="os compartilhamentos" onTentar={refetch} />}

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <section aria-labelledby="titulo-concedidos" className={cartao}>
          <h2 id="titulo-concedidos" className="text-[17px] font-semibold text-marinho">
            Quem vê o meu plantel
          </h2>
          <p className="mb-3.5 mt-1 text-sm text-slate-600">
            A pessoa vê todos os seus pombos, inclusive os cadastrados depois, mas não altera nada. Ela pode copiar um pombo, com os ancestrais, para o plantel dela.
          </p>
          <form onSubmit={enviar} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Campo rotulo="Login do criador" erro={erroLogin} className="flex-1">
              {(c) => (
                <input
                  {...c}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ex.: joao.lima"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value)
                    setErroLogin(null)
                  }}
                  className={classeEntrada(!!erroLogin)}
                />
              )}
            </Campo>
            <Botao type="submit" variante="escura" carregando={compartilhar.isPending} className="sm:mt-[26px]">
              Compartilhar
            </Botao>
          </form>
          <div className="mt-3">
            {isLoading ? (
              <Carregando linhas={2} />
            ) : data?.concedidos.length ? (
              <ul className="divide-y divide-borda-suave">
                {data.concedidos.map((u) => (
                  <Pessoa key={u.id} pessoa={u}>
                    <Botao pequeno variante="fantasmaPerigo" onClick={() => { setErroRemocao(null); setRemovendo({ tipo: 'concedidos', pessoa: u }) }}>
                      Parar de compartilhar
                    </Botao>
                  </Pessoa>
                ))}
              </ul>
            ) : (
              data && <p className="text-sm text-slate-600">Seu plantel não está compartilhado com ninguém.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="titulo-recebidos" className={cartao}>
          <h2 id="titulo-recebidos" className="mb-2 text-[17px] font-semibold text-marinho">
            Plantéis compartilhados comigo
          </h2>
          {isLoading ? (
            <Carregando linhas={2} />
          ) : data?.recebidos.length ? (
            <ul className="divide-y divide-borda-suave">
              {data.recebidos.map((u) => (
                <Pessoa key={u.id} pessoa={u}>
                  <Link to={`/pombos?plantel=${u.id}`} className={classeBotao('secundaria', true)} aria-label={`Ver pombos de ${u.nome}`}>
                    Ver pombos
                  </Link>
                  <Botao pequeno variante="fantasma" onClick={() => { setErroRemocao(null); setRemovendo({ tipo: 'recebidos', pessoa: u }) }}>
                    Deixar de ver
                  </Botao>
                </Pessoa>
              ))}
            </ul>
          ) : (
            data && <p className="text-sm text-slate-600">Ninguém compartilhou o plantel com você ainda.</p>
          )}
        </section>
      </div>

      <DialogoConfirmacao
        aberto={removendo !== null}
        aoFechar={() => setRemovendo(null)}
        aoConfirmar={confirmarRemocao}
        titulo={removendo?.tipo === 'concedidos' ? `Parar de compartilhar com ${removendo.pessoa.nome}?` : `Deixar de ver o plantel de ${removendo?.pessoa.nome ?? ''}?`}
        textoConfirmar={removendo?.tipo === 'concedidos' ? 'Parar de compartilhar' : 'Deixar de ver'}
        perigo
        carregando={remover.isPending}
      >
        {erroRemocao ? (
          <Aviso tom="erro">{erroRemocao}</Aviso>
        ) : removendo?.tipo === 'concedidos' ? (
          <p>
            {removendo.pessoa.nome} ({removendo.pessoa.login}) deixa de ver os seus pombos na hora. As cópias que ele(a) já fez continuam no plantel dele(a).
          </p>
        ) : (
          <p>Os pombos de {removendo?.pessoa.nome} somem da sua lista. Para voltar a ver, a pessoa precisa compartilhar de novo.</p>
        )}
      </DialogoConfirmacao>
    </div>
  )
}

function Pessoa({ pessoa, children }: { pessoa: UsuarioComLogin; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#e8edf5] text-[13px] font-bold text-marinho">
          {iniciais(pessoa.nome)}
        </span>
        <div className="min-w-0">
          <b className="block truncate text-slate-900">{pessoa.nome}</b>
          <span className="text-[13px] text-slate-600">{pessoa.login}</span>
        </div>
      </div>
      <div className="flex gap-1.5">{children}</div>
    </li>
  )
}
