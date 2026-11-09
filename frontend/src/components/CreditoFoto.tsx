/** Crédito exigido pela licença da foto de pombo-correio (CC BY-SA 2.0). Usado no Início e no login. */
export function CreditoFoto({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[11.5px] ${className}`}>
      Foto:{' '}
      <a href="https://commons.wikimedia.org/wiki/File:Racing_pigeon_rataedl.jpg" target="_blank" rel="noopener noreferrer" className="underline">
        “Racing pigeon”, RATAEDL
      </a>
      ,{' '}
      <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noopener noreferrer" className="underline">
        CC BY-SA 2.0
      </a>
      , recortada.
    </p>
  )
}
