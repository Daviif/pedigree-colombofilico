export type Sexo = 'M' | 'F' | 'DESCONHECIDO'

export type StatusPombo = 'ATIVO' | 'REPRODUTOR' | 'VENDIDO' | 'FALECIDO'

export interface Proprietario {
  id: number
  nome: string
  colombodromo?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
  observacoes?: string | null
}

export type ProprietarioInput = Omit<Proprietario, 'id'>

export interface PomboSummary {
  id: number
  anilha: string
  sexo: Sexo
  cor?: string | null
}

export interface Pombo {
  id: number
  anilha: string
  sexo: Sexo
  cor?: string | null
  status: StatusPombo
  observacoes?: string | null
  origem?: string | null
  proprietario_id?: number | null
  pai_id?: number | null
  mae_id?: number | null
  proprietario?: Proprietario | null
  pai?: PomboSummary | null
  mae?: PomboSummary | null
}

export interface Resultado {
  id: number
  pombo_id: number
  ano?: number | null
  competicao: string
  distancia_km?: number | null
  colocacao?: string | null
  premio?: string | null
  observacao?: string | null
}

export type ResultadoInput = Omit<Resultado, 'id' | 'pombo_id'>

export interface PomboDetail extends Pombo {
  resultados: Resultado[]
}

export type PomboInput = Omit<
  Pombo,
  'id' | 'proprietario' | 'pai' | 'mae'
>

export interface ArvoreResultado {
  ano?: number | null
  competicao: string
  distancia_km?: number | null
  colocacao?: string | null
  premio?: string | null
  observacao?: string | null
}

export interface ArvoreNo {
  id?: number | null
  anilha?: string | null
  sexo?: Sexo | null
  cor?: string | null
  origem?: string | null
  proprietario_nome?: string | null
  duplicado: boolean
  grau_parentesco?: string | null
  resultados: ArvoreResultado[]
  pai?: ArvoreNo | null
  mae?: ArvoreNo | null
}

export interface IrmaosResponse {
  completos: PomboSummary[]
  meios_paternos: PomboSummary[]
  meios_maternos: PomboSummary[]
}

export interface PombosFiltro {
  anilha?: string
  cor?: string
  sexo?: Sexo
  status?: StatusPombo
  proprietario_id?: number
}
