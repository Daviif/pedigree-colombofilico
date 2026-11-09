/** Regras AR-01 e AR-03 (README, "Detalhe do pombo e árvore"): montagem das colunas. */
import { describe, expect, it } from 'vitest'

import type { ArvoreNo } from '../../api/types'
import { alturaCaixa, alturasDasPosicoes, montarColunas, noNoCaminho, rotuloParentesco } from './montagem'

function no(id: number, anilha: string, extra: Partial<ArvoreNo> = {}): ArvoreNo {
  return { id, anilha, sexo: 'M', duplicado: false, alerta_sexo: false, resultados: [], pai: null, mae: null, ...extra }
}

describe('rotuloParentesco', () => {
  it('nomeia pelo caminho e pelo lado', () => {
    expect(rotuloParentesco([])).toBe('Pombo principal')
    expect(rotuloParentesco(['pai'])).toBe('Pai')
    expect(rotuloParentesco(['mae'])).toBe('Mãe')
    expect(rotuloParentesco(['pai', 'mae'])).toBe('Avó paterna')
    expect(rotuloParentesco(['mae', 'pai'])).toBe('Avô materno')
    expect(rotuloParentesco(['mae', 'pai', 'mae'])).toBe('Bisavó materna')
    expect(rotuloParentesco(['pai', 'pai', 'pai', 'pai'])).toBe('Tataravô paterno')
    expect(rotuloParentesco(['pai', 'pai', 'pai', 'pai', 'mae'])).toBe('Ascendente (5ª geração)')
  })
})

describe('AR-01 / AR-03 montarColunas', () => {
  const avo = no(4, '40/10')
  const pai = no(2, '20/15', { pai: avo })
  const raiz = no(1, '10/20', { pai })

  it('coluna n tem 2^n posições', () => {
    const colunas = montarColunas(raiz, 4)
    expect(colunas.map((c) => c.length)).toEqual([1, 2, 4, 8, 16])
  })

  it('vaga onde o filho existe e falta o genitor; vazio acima da vaga', () => {
    const [, c1, c2, c3] = montarColunas(raiz, 3)
    expect(c1.map((p) => p.tipo)).toEqual(['no', 'vaga']) // pai, mãe faltando
    expect(c2.map((p) => p.tipo)).toEqual(['no', 'vaga', 'vazio', 'vazio']) // avô, avó faltando, acima da vaga da mãe
    expect(c3.slice(0, 4).map((p) => p.tipo)).toEqual(['vaga', 'vaga', 'vazio', 'vazio'])
    expect(c3.slice(4).every((p) => p.tipo === 'vazio')).toBe(true)
    const vagaMae = c1[1]
    expect(vagaMae.tipo === 'vaga' && vagaMae.papel === 'mae' && vagaMae.filho.id === 1).toBe(true)
  })

  it('cada ancestral fica com o caminho de papéis (alinhado com o filho)', () => {
    const c2 = montarColunas(raiz, 2)[2]
    expect(c2[0].tipo === 'no' && c2[0].papeis).toEqual(['pai', 'pai'])
  })

  it('noNoCaminho segue os papéis e devolve null se faltar alguém', () => {
    expect(noNoCaminho(raiz, ['pai', 'pai'])?.anilha).toBe('40/10')
    expect(noNoCaminho(raiz, ['mae'])).toBeNull()
  })
})

describe('AR-01 alturasDasPosicoes', () => {
  const completa = (id: number, nivel: number): ArvoreNo =>
    no(id, `${id}/20`, nivel === 0 ? {} : { pai: completa(id * 2, nivel - 1), mae: completa(id * 2 + 1, nivel - 1) })

  it('os dois pais somam a altura do filho; vazio não ocupa lugar', () => {
    const raiz = no(1, '10/20', { pai: no(2, '20/15', { pai: no(4, '40/10') }) })
    const colunas = montarColunas(raiz, 6)
    const h = alturasDasPosicoes(colunas)
    for (let n = 0; n < colunas.length - 1; n++)
      colunas[n].forEach((pos, i) => {
        if (pos.tipo === 'no') expect(h[n + 1][2 * i] + h[n + 1][2 * i + 1]).toBeCloseTo(h[n][i])
        if (pos.tipo === 'vazio') expect(h[n][i]).toBe(0)
      })
    // só 3 pombos e 4 vagas: bem menor que 64 posições da 6ª geração
    expect(h[0][0]).toBeLessThan(600)
  })

  it('cada caixa tem pelo menos a própria altura', () => {
    const colunas = montarColunas(completa(1, 6), 6)
    const h = alturasDasPosicoes(colunas)
    h.forEach((col, n) => col.forEach((v) => expect(v).toBeGreaterThanOrEqual(alturaCaixa(n))))
    expect(h[6]).toHaveLength(64)
  })
})
