import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { ContextoNotificacao, type Notificar } from './notificar'

/** Mensagem rápida de sucesso ("4272402/24 salvo") no rodapé, que some sozinha. */
export function ProvedorNotificacao({ children, duracao = 2600 }: { children: ReactNode; duracao?: number }) {
  const [mensagem, setMensagem] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const notificar = useCallback<Notificar>(
    (m) => {
      setMensagem(m)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setMensagem(null), duracao)
    },
    [duracao],
  )
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <ContextoNotificacao.Provider value={notificar}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-3">
        {mensagem && (
          <span className="flex items-center gap-2 rounded-full bg-marinho px-5 py-2.5 font-medium text-white shadow-2xl">
            <span aria-hidden className="text-dourado">
              ✓
            </span>
            {mensagem}
          </span>
        )}
      </div>
    </ContextoNotificacao.Provider>
  )
}
