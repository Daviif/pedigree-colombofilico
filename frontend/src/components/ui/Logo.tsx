/** Pomba branca de asas abertas, vetorizada (potrace) da referência do responsável
 * (docs/ux/prototipos/img/logo-pomba.svg). A cor vem do texto (currentColor).
 * O viewBox recorta só a área desenhada (x 135–399, y 71–305 do original 400×340). */
export function LogoPomba({ className = 'h-[34px] w-[38px]' }: { className?: string }) {
  return (
    <svg viewBox="128 64 278 248" className={className} aria-hidden focusable="false">
      <g transform="translate(0,340) scale(0.1,-0.1)" fill="currentColor">
        <path d="M3664 2648 c-26 -24 -84 -88 -130 -144 -90 -110 -175 -183 -298 -259 -164 -100 -246 -187 -337 -354 -100 -185 -122 -208 -184 -197 -27 5 -62 33 -148 114 -115 111 -262 225 -332 259 -22 11 -122 55 -221 97 -100 42 -207 92 -238 111 -80 48 -175 134 -242 218 -92 117 -107 125 -149 82 -32 -32 -34 -111 -4 -193 14 -37 23 -95 28 -167 7 -109 7 -111 59 -201 29 -52 56 -114 63 -145 22 -112 30 -130 85 -192 37 -40 73 -97 105 -164 43 -90 57 -109 107 -148 75 -59 170 -108 255 -130 117 -30 147 -78 91 -145 -36 -42 -157 -123 -252 -168 -75 -36 -80 -37 -202 -39 -69 -1 -133 -2 -142 -2 -28 -1 -58 -38 -58 -69 0 -42 49 -112 111 -158 194 -145 245 -174 352 -200 87 -22 142 -13 209 34 119 82 252 162 270 162 24 0 23 -26 -3 -85 -36 -81 -12 -152 63 -191 46 -24 144 -18 238 16 47 16 105 30 130 30 141 1 201 88 97 142 -34 18 -60 22 -135 22 -108 1 -128 14 -118 75 11 68 51 93 237 146 237 68 408 197 499 374 38 75 51 132 59 262 6 82 14 137 25 157 10 19 46 51 88 79 87 58 110 90 133 185 9 40 38 117 62 172 35 74 48 116 53 170 7 73 22 110 71 183 16 23 29 48 29 56 0 20 -61 72 -120 102 -38 19 -56 37 -83 82 -43 75 -62 78 -123 21z" />
      </g>
    </svg>
  )
}

/** Logo completo: pomba + "Pedigree / Colombófilo". */
export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 text-white">
      <LogoPomba className={compacto ? 'h-7 w-[31px]' : 'h-[34px] w-[38px]'} />
      <span className="leading-tight">
        <b className="block text-[15px]">Pedigree</b>
        {!compacto && <small className="text-xs text-[#dbe4f3]">Colombófilo</small>}
      </span>
    </span>
  )
}
