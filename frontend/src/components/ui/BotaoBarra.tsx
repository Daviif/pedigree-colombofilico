/** Botão "/" para campos de anilha: o teclado numérico do celular não tem a barra. */
export function BotaoBarra({ aoInserir }: { aoInserir: () => void }) {
  return (
    <button
      type="button"
      // onMouseDown/preventDefault mantém o foco (e o teclado) no campo
      onMouseDown={(e) => e.preventDefault()}
      onClick={aoInserir}
      aria-label="Inserir barra (/)"
      className="h-11 w-11 shrink-0 rounded-[7px] border border-borda bg-white text-lg font-semibold text-slate-700 active:bg-slate-100 sm:hidden"
    >
      /
    </button>
  )
}
