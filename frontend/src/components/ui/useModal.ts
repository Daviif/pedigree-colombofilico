import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focaveis(raiz: HTMLElement): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>(FOCAVEIS)]
}

/**
 * Comportamento comum de janelas modais (Dialogo, PainelLateral), conforme
 * docs/ux/sistema-visual.md §6:
 * - foco IMEDIATO ao abrir (sem setTimeout: um foco atrasado rouba o que já está sendo
 *   digitado em outro campo — ver o aprendizado do protótipo);
 * - Tab e Shift+Tab ficam presos dentro da janela;
 * - Esc fecha;
 * - ao fechar, o foco volta para quem abriu.
 */
export function useModal(
  aberto: boolean,
  aoFechar: () => void,
  focoInicial?: RefObject<HTMLElement | null>,
) {
  const ref = useRef<HTMLDivElement>(null)
  const origem = useRef<HTMLElement | null>(null)
  // Último elemento focado ANTES de abrir: um autoFocus de dentro da janela já roubaria o
  // activeElement no momento da abertura, e o foco não teria para onde voltar.
  const ultimoFora = useRef<HTMLElement | null>(null)
  const fechar = useRef(aoFechar)
  useLayoutEffect(() => {
    fechar.current = aoFechar
  })

  useEffect(() => {
    if (aberto) return
    ultimoFora.current = document.activeElement as HTMLElement | null
    const guardar = (e: FocusEvent) => {
      const alvo = e.target as HTMLElement
      // o autoFocus do campo da própria janela dispara antes de este efeito ser desligado
      if (alvo.closest?.('[aria-modal="true"]')) return
      ultimoFora.current = alvo
    }
    document.addEventListener('focusin', guardar)
    return () => document.removeEventListener('focusin', guardar)
  }, [aberto])

  // useLayoutEffect: roda antes da pintura, então o foco chega junto com a janela.
  useLayoutEffect(() => {
    if (!aberto || !ref.current) return
    const ativo = document.activeElement as HTMLElement | null
    origem.current = ativo && !ref.current.contains(ativo) ? ativo : ultimoFora.current
    // Um campo de dentro já pegou o foco (autoFocus)? Respeita: não joga o foco no "✕".
    if (!ref.current.contains(document.activeElement)) {
      const alvo = focoInicial?.current ?? focaveis(ref.current)[0] ?? ref.current
      alvo.focus()
    }
    return () => {
      const voltar = origem.current
      if (voltar && document.contains(voltar)) voltar.focus()
    }
  }, [aberto, focoInicial])

  useEffect(() => {
    if (!aberto) return
    function tecla(e: KeyboardEvent) {
      if (!ref.current) return
      if (e.key === 'Escape') {
        e.preventDefault()
        fechar.current()
        return
      }
      if (e.key !== 'Tab') return
      const lista = focaveis(ref.current)
      if (lista.length === 0) {
        e.preventDefault()
        return
      }
      const primeiro = lista[0]
      const ultimo = lista[lista.length - 1]
      const ativo = document.activeElement
      if (e.shiftKey && (ativo === primeiro || !ref.current.contains(ativo))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (ativo === ultimo || !ref.current.contains(ativo))) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [aberto])

  return ref
}
