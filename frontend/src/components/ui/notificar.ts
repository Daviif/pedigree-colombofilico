import { createContext, useContext } from 'react'

export type Notificar = (mensagem: string) => void
export const ContextoNotificacao = createContext<Notificar>(() => {})

/** notificar("4272402/24 salvo") — precisa do ProvedorNotificacao acima na árvore. */
export function useNotificar() {
  return useContext(ContextoNotificacao)
}
