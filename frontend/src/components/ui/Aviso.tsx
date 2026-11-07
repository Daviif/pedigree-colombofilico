import type { ReactNode } from 'react'

type Tom = 'sucesso' | 'erro' | 'alerta' | 'info'

const TONS: Record<Tom, string> = {
  sucesso: 'bg-green-50 border-green-200 text-green-800',
  erro: 'bg-red-50 border-red-200 text-red-700',
  alerta: 'bg-amber-50 border-amber-300 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

/** Mensagem em bloco. Erro é anunciado na hora (role=alert); os outros, com calma (role=status). */
export function Aviso({ tom = 'info', titulo, children, className = '' }: { tom?: Tom; titulo?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div role={tom === 'erro' ? 'alert' : 'status'} className={`rounded-[10px] border px-4 py-3 text-sm ${TONS[tom]} ${className}`}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children}
    </div>
  )
}
