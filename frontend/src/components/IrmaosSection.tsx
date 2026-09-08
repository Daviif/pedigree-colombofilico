import { Link } from 'react-router-dom'

import { useIrmaos } from '../api/hooks'
import type { PomboSummary } from '../api/types'

function Grupo({ titulo, lista }: { titulo: string; lista: PomboSummary[] }) {
  if (lista.length === 0) return null
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</div>
      <ul className="mt-1 divide-y divide-slate-100">
        {lista.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-1.5 text-sm">
            <Link to={`/pombos/${p.id}`} className="font-medium text-blue-700 hover:underline">
              {p.anilha}
            </Link>
            <span className="text-slate-500">
              {p.sexo} {p.cor ? `— ${p.cor}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function IrmaosSection({ pomboId }: { pomboId: number }) {
  const { data: irmaos } = useIrmaos(pomboId)

  if (!irmaos) return null

  const total = irmaos.completos.length + irmaos.meios_paternos.length + irmaos.meios_maternos.length
  if (total === 0) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-medium text-slate-800">Irmãos</h2>
      <div className="space-y-4">
        <Grupo titulo="Irmãos completos (mesmo pai e mãe)" lista={irmaos.completos} />
        <Grupo titulo="Meios-irmãos (mesmo pai)" lista={irmaos.meios_paternos} />
        <Grupo titulo="Meios-irmãos (mesma mãe)" lista={irmaos.meios_maternos} />
      </div>
    </div>
  )
}
