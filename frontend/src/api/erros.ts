import { isAxiosError } from 'axios'

import { mensagemDeErro } from './hooks'

export type ErrosFormulario<C extends string> = { campos: Partial<Record<C, string>>; geral: string | null }

/** Palavras da mensagem do servidor (400/409) que indicam o campo (RG-xx, RV-xx). */
const PISTAS: [RegExp, string][] = [
  [/\banilha\b/i, 'anilha'],
  [/\bm[ãa]e\b/i, 'mae_id'],
  [/\bpai\b/i, 'pai_id'],
  [/propriet[áa]rio/i, 'proprietario_id'],
  [/\bsexo\b|n[ãa]o pode ser (f[êe]mea|macho)/i, 'sexo'],
  // US-01: formulário de usuário
  [/\blogin\b/i, 'login'],
  [/\bsenha\b/i, 'senha'],
  [/\bnome\b/i, 'nome'],
]

/**
 * CA-02: separa o erro do servidor em erros de campo (aparecem embaixo do campo) e um erro
 * geral (no topo). 422: usa o `loc` do FastAPI. 400/409: reconhece o campo pela mensagem.
 * Só devolve campos que o formulário tem; o resto vira erro geral.
 */
export function separarErros<C extends string>(erro: unknown, campos: readonly C[], padrao: string): ErrosFormulario<C> {
  const resultado: ErrosFormulario<C> = { campos: {}, geral: null }
  const temCampo = (c: string): c is C => (campos as readonly string[]).includes(c)
  const detalhe = isAxiosError(erro) ? erro.response?.data?.detail : undefined

  if (Array.isArray(detalhe)) {
    const gerais: string[] = []
    for (const d of detalhe) {
      const campo = [...(d?.loc ?? [])].reverse().find((p: unknown) => typeof p === 'string' && p !== 'body')
      const msg = String(d?.msg ?? '').replace(/^Value error, /, '')
      if (campo && temCampo(campo) && !resultado.campos[campo]) resultado.campos[campo] = msg
      else gerais.push(msg)
    }
    resultado.geral = gerais.length ? gerais.join(' · ') : null
    return resultado
  }

  const msg = mensagemDeErro(erro, padrao)
  // RG-06 fala de "pai/mãe" mas o problema é o sexo: verifica sexo antes.
  const pistas = /n[ãa]o pode ser (f[êe]mea|macho)/i.test(msg) ? [[/./, 'sexo'] as [RegExp, string]] : PISTAS
  const achado = pistas.find(([re, c]) => re.test(msg) && temCampo(c))
  if (achado) resultado.campos[achado[1] as C] = msg
  else resultado.geral = msg
  return resultado
}
