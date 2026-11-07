/** Esqueleto de linhas no lugar do "Carregando..." solto (UX-14). */
export function Carregando({ linhas = 5, rotulo = 'Carregando…' }: { linhas?: number; rotulo?: string }) {
  const larguras = [72, 88, 64, 80, 70, 90, 76]
  return (
    <div role="status" aria-live="polite" className="py-2">
      <span className="sr-only">{rotulo}</span>
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="my-3.5 h-3.5 rounded bg-[linear-gradient(90deg,#e3e8f0_25%,#f1f4f8_50%,#e3e8f0_75%)] bg-[length:200%_100%] [animation:brilho_1.2s_infinite]"
          style={{ width: `${larguras[i % larguras.length]}%` }}
        />
      ))}
    </div>
  )
}
