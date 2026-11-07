import type { ReactNode } from 'react'

import { LogoPomba } from './Logo'

/** Estado vazio: o que aconteceu + o que fazer ("Nenhum pombo ainda. + Cadastrar o primeiro"). */
export function Vazio({ titulo, children, acao }: { titulo: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="px-5 py-12 text-center text-slate-600">
      <LogoPomba className="mx-auto mb-2 h-12 w-14 text-slate-300" />
      <p className="text-base font-semibold text-marinho">{titulo}</p>
      {children && <div className="mx-auto mt-1 max-w-md">{children}</div>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}
