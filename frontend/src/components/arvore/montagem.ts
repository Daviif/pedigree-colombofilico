import type { ArvoreNo } from '../../api/types'

export type Papel = 'pai' | 'mae'

/** Uma posição da árvore: um pombo, uma vaga para adicionar (AR-03) ou um espaço vazio. */
export type Posicao =
  | { tipo: 'no'; no: ArvoreNo; papeis: Papel[] }
  | { tipo: 'vaga'; papel: Papel; filho: ArvoreNo; papeis: Papel[] }
  | { tipo: 'vazio' }

const NOMES: Record<number, [string, string]> = {
  2: ['Avô', 'Avó'],
  3: ['Bisavô', 'Bisavó'],
  4: ['Tataravô', 'Tataravó'],
}

/** "Pai", "Avó paterna", "Bisavô materno"… pelo caminho de papéis desde o pombo principal. */
export function rotuloParentesco(papeis: Papel[]): string {
  const nivel = papeis.length
  if (nivel === 0) return 'Pombo principal'
  const macho = papeis[nivel - 1] === 'pai'
  if (nivel === 1) return macho ? 'Pai' : 'Mãe'
  const nomes = NOMES[nivel]
  if (!nomes) return `Ascendente (${nivel}ª geração)`
  const lado = papeis[0] === 'pai' ? (macho ? 'paterno' : 'paterna') : macho ? 'materno' : 'materna'
  return `${nomes[macho ? 0 : 1]} ${lado}`
}

/**
 * Colunas da árvore (AR-01): coluna 0 = pombo principal, coluna n = n-ésima geração de
 * ancestrais, sempre com 2^n posições para manter cada ancestral alinhado com o filho.
 * Onde o filho existe e falta pai/mãe: vaga. Acima de uma vaga ou de um vazio: vazio.
 */
export function montarColunas(raiz: ArvoreNo, geracoes: number): Posicao[][] {
  const colunas: Posicao[][] = [[{ tipo: 'no', no: raiz, papeis: [] }]]
  for (let n = 1; n <= geracoes; n++) {
    const anterior = colunas[n - 1]
    const atual: Posicao[] = []
    for (const pos of anterior) {
      for (const papel of ['pai', 'mae'] as Papel[]) {
        if (pos.tipo !== 'no') {
          atual.push({ tipo: 'vazio' })
          continue
        }
        const genitor = pos.no[papel]
        atual.push(
          genitor
            ? { tipo: 'no', no: genitor, papeis: [...pos.papeis, papel] }
            : { tipo: 'vaga', papel, filho: pos.no, papeis: [...pos.papeis, papel] },
        )
      }
    }
    colunas.push(atual)
  }
  return colunas
}

/** Segue o caminho de papéis a partir da raiz (árvore do celular, AR-02). */
export function noNoCaminho(raiz: ArvoreNo, caminho: Papel[]): ArvoreNo | null {
  let atual: ArvoreNo | null | undefined = raiz
  for (const papel of caminho) atual = atual?.[papel]
  return atual ?? null
}

/** Altura em px da caixa numa coluna (pombo principal, normal ou compacta) + espaço entre caixas. */
export function alturaCaixa(coluna: number): number {
  return coluna === 0 ? 96 : coluna >= 4 ? 33 : 70
}
const ESPACO = 8

/**
 * Altura de cada posição (AR-01): cada caixa ocupa a altura dos ancestrais dela, e os dois
 * pais somam exatamente a altura do filho — o alinhamento se mantém e os espaços vazios
 * (acima de uma vaga) não ocupam lugar. Assim, 6 gerações não viram uma página enorme.
 */
export function alturasDasPosicoes(colunas: Posicao[][]): number[][] {
  const ultima = colunas.length - 1
  const precisa = colunas.map((c) => c.map(() => 0))
  for (let n = ultima; n >= 0; n--) {
    colunas[n].forEach((pos, i) => {
      if (pos.tipo === 'vazio') return
      const propria = alturaCaixa(n) + ESPACO
      const pais = pos.tipo === 'no' && n < ultima ? precisa[n + 1][2 * i] + precisa[n + 1][2 * i + 1] : 0
      precisa[n][i] = Math.max(propria, pais)
    })
  }
  const alturas = colunas.map((c) => c.map(() => 0))
  alturas[0][0] = precisa[0][0]
  for (let n = 0; n < ultima; n++) {
    alturas[n].forEach((h, i) => {
      const a = precisa[n + 1][2 * i]
      const b = precisa[n + 1][2 * i + 1]
      if (a + b === 0) return
      alturas[n + 1][2 * i] = (h * a) / (a + b)
      alturas[n + 1][2 * i + 1] = (h * b) / (a + b)
    })
  }
  return alturas
}
