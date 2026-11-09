// Anilha aceita apenas dígitos e "/" (ex: 12345/2024).
export function limparAnilha(valor: string) {
  return valor.replace(/[^0-9/]/g, '')
}

export function capitalizarPrimeira(valor: string) {
  return valor.charAt(0).toUpperCase() + valor.slice(1)
}

/** "Davi Fonseca" → "DF" (avatar). */
export function iniciais(nome?: string) {
  return (nome ?? '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** LI-04: anilha em ordem numérica ("9/24" antes de "10/24"). */
export const ordemAnilha = new Intl.Collator('pt-BR', { numeric: true })

/** PR-01: "Bons Amigos" → "Pombal Bons Amigos"; "Pombal Teste" fica como está (sem "Pombal Pombal"). */
export function rotuloPombal(nome: string) {
  return /^pombal\b/i.test(nome.trim()) ? nome.trim() : `Pombal ${nome.trim()}`
}
