// Anilha aceita apenas dígitos e "/" (ex: 12345/2024).
export function limparAnilha(valor: string) {
  return valor.replace(/[^0-9/]/g, '')
}

export function capitalizarPrimeira(valor: string) {
  return valor.charAt(0).toUpperCase() + valor.slice(1)
}
