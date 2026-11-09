import { isAxiosError } from 'axios'
import { useRef, useState } from 'react'

import { mensagemDeErro, useLogin } from '../api/hooks'
import fotoPombo from '../assets/pombo-correio.webp'
import { CreditoFoto } from '../components/CreditoFoto'
import { Aviso, Botao, Campo, LogoPomba, classeEntrada } from '../components/ui'

/** Tela de login (LG-01..06). */
export function Login() {
  const login = useLogin()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erros, setErros] = useState<{ usuario?: string; senha?: string }>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const campoUsuario = useRef<HTMLInputElement>(null)
  const campoSenha = useRef<HTMLInputElement>(null)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    if (login.isPending) return // LG-05
    setErroGeral(null)
    const faltando = { usuario: usuario.trim() ? undefined : 'Usuário: obrigatório', senha: senha ? undefined : 'Senha: obrigatória' }
    if (faltando.usuario || faltando.senha) {
      setErros(faltando)
      ;(faltando.usuario ? campoUsuario : campoSenha).current?.focus() // LG-03
      return
    }
    try {
      await login.mutateAsync({ login: usuario.trim(), senha })
    } catch (err) {
      // LG-04: 401 (RA-05), 429 (RA-01) ou sem conexão; o usuário fica, a senha sai
      setErroGeral(isAxiosError(err) && !err.response ? 'Sem conexão com o servidor. Confira a internet.' : mensagemDeErro(err, 'Não foi possível entrar. Tente de novo.'))
      setSenha('')
      campoSenha.current?.focus()
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-fundo lg:flex-row">
      {/* LG-01: faixa da marca */}
      <section className="relative overflow-hidden bg-marinho px-6 pb-16 pt-9 text-white lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-[center_22%] opacity-30 lg:bg-[center_12%] lg:opacity-80"
          style={{ backgroundImage: `url(${fotoPombo})` }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,var(--color-marinho)_35%,transparent_100%)] lg:bg-[linear-gradient(180deg,var(--color-marinho)_0%,rgba(15,31,61,0.55)_22%,rgba(15,31,61,0.15)_50%,rgba(15,31,61,0.75)_78%,var(--color-marinho)_100%)]" />
        <div className="relative flex items-center gap-3">
          <LogoPomba className="h-11 w-12 lg:h-14 lg:w-[62px]" />
          <div className="leading-tight">
            <p className="text-xl font-bold lg:text-2xl">Pedigree</p>
            <p className="text-sm text-[#dbe4f3]">Colombófilo</p>
          </div>
        </div>
        <div className="relative mt-6 lg:mt-0">
          <p className="max-w-sm text-[15px] text-[#dbe4f3] lg:text-lg">
            Plantel, árvore genealógica e certificado de pedigree, <span className="text-dourado">sempre à mão</span>.
          </p>
          <CreditoFoto className="mt-6 hidden text-[#a9b6cc] lg:block" />
        </div>
      </section>

      {/* Formulário */}
      <main className="flex flex-1 items-start justify-center px-4 lg:items-center lg:px-10">
        <div className="relative z-10 -mt-10 w-full max-w-[400px] lg:mt-0">
          <form onSubmit={entrar} noValidate aria-labelledby="titulo-login" className="space-y-4 rounded-[14px] border border-borda-suave bg-white p-6 shadow-lg sm:p-7">
            <div>
              <h1 id="titulo-login" className="text-[22px] font-bold text-marinho">
                Entrar
              </h1>
              <p className="text-sm text-slate-600">Use o usuário e a senha que o administrador passou.</p>
            </div>

            {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}

            <Campo rotulo="Usuário" erro={erros.usuario}>
              {(c) => (
                <input
                  {...c}
                  ref={campoUsuario}
                  autoFocus
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={usuario}
                  onChange={(e) => {
                    setUsuario(e.target.value)
                    setErros((x) => ({ ...x, usuario: undefined }))
                  }}
                  className={classeEntrada(!!erros.usuario)}
                />
              )}
            </Campo>

            <Campo rotulo="Senha" erro={erros.senha}>
              {(c) => (
                <div className="relative">
                  <input
                    {...c}
                    ref={campoSenha}
                    type={verSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value)
                      setErros((x) => ({ ...x, senha: undefined }))
                    }}
                    className={`${classeEntrada(!!erros.senha)} pr-24`}
                  />
                  <button
                    type="button"
                    onClick={() => setVerSenha((v) => !v)}
                    className="absolute inset-y-0 right-1 my-auto h-9 rounded-md px-3 text-sm font-semibold text-link hover:bg-fundo"
                  >
                    {verSenha ? 'Ocultar' : 'Mostrar'}{' '}
                    <span className="sr-only">senha</span>
                  </button>
                </div>
              )}
            </Campo>

            <Botao type="submit" variante="primaria" className="w-full" carregando={login.isPending} textoCarregando="Entrando…">
              Entrar
            </Botao>

            <p className="text-center text-[13px] text-slate-600">Esqueceu a senha? Peça ao administrador do sistema.</p>
          </form>
          <CreditoFoto className="mt-4 text-center text-slate-500 lg:hidden" />
        </div>
      </main>
    </div>
  )
}
