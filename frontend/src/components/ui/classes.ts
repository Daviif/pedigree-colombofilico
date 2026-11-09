// Classes e textos compartilhados pelos componentes do sistema visual.
// Ficam fora dos .tsx para o Fast Refresh do Vite funcionar (só componentes nos .tsx).
import type { Sexo } from '../../api/types'

export type VarianteBotao = 'primaria' | 'escura' | 'secundaria' | 'fantasma' | 'fantasmaPerigo' | 'perigo' | 'vidro'

const VARIANTES: Record<VarianteBotao, string> = {
  // ação principal: dourado com texto marinho (8,2:1)
  primaria: 'bg-dourado border-dourado-2 text-marinho hover:bg-dourado-2',
  escura: 'bg-marinho border-marinho text-white hover:bg-marinho-2',
  secundaria: 'bg-white border-borda text-slate-800 hover:bg-fundo',
  fantasma: 'bg-transparent border-transparent text-slate-600 hover:bg-fundo hover:text-slate-900',
  // ação destrutiva discreta (Excluir na linha); a cor vem da variante, não de className,
  // porque text-red-700 por fora perde para o text-slate-600 da fantasma na ordem do CSS
  fantasmaPerigo: 'bg-transparent border-transparent text-red-700 hover:bg-red-50 hover:text-red-800',
  perigo: 'bg-red-700 border-red-700 text-white hover:bg-red-800',
  // sobre fundo marinho (faixa do pombo)
  vidro: 'bg-white/10 border-white/25 text-white hover:bg-white/20',
}

export function classeBotao(variante: VarianteBotao = 'secundaria', pequeno = false) {
  return [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[9px] border font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-55',
    pequeno ? 'h-11 px-3 text-sm sm:h-[34px]' : 'h-11 px-4 sm:h-10',
    VARIANTES[variante],
  ].join(' ')
}

export function classeEntrada(invalido = false) {
  return [
    'h-11 w-full rounded-[7px] border bg-white px-3 sm:h-[42px]',
    'focus:outline-none focus:ring-3',
    invalido
      ? 'border-red-700 focus:ring-red-100'
      : 'border-borda focus:border-link focus:ring-blue-100',
  ].join(' ')
}

export const NOME_SEXO: Record<Sexo, string> = { M: 'Macho', F: 'Fêmea', DESCONHECIDO: 'Desconhecido' }
