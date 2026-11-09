import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'

import { separarErros } from './erros'

const CAMPOS = ['anilha', 'sexo', 'cor', 'pai_id', 'mae_id', 'proprietario_id', 'observacoes'] as const

function erroApi(status: number, detail: unknown) {
  const e = new AxiosError('falhou')
  e.response = { status, data: { detail } } as AxiosResponse
  return e
}

describe('separarErros (CA-02)', () => {
  it('422 vai para o campo do loc; o que não é campo do formulário vai para o topo', () => {
    const r = separarErros(erroApi(422, [
      { loc: ['body', 'cor'], msg: 'Cor: no máximo 100 caracteres' },
      { loc: ['body', 'outra'], msg: 'Value error, coisa' },
    ]), CAMPOS, 'x')
    expect(r.campos.cor).toBe('Cor: no máximo 100 caracteres')
    expect(r.geral).toBe('coisa')
  })

  it.each([
    ['Já existe um pombo com essa anilha', 'anilha'],
    ['O pai precisa ser macho ou de sexo desconhecido (1/24 está cadastrado como fêmea)', 'pai_id'],
    ['A mãe precisa ser fêmea ou de sexo desconhecido', 'mae_id'],
    ['Mãe informada não existe', 'mae_id'],
    ['Proprietário informado não existe', 'proprietario_id'],
    ['Este pombo é pai de 2 pombo(s); não pode ser fêmea', 'sexo'],
  ])('400 "%s" → %s', (msg, campo) => {
    const r = separarErros(erroApi(400, msg), CAMPOS, 'x')
    expect(r.campos[campo as (typeof CAMPOS)[number]]).toBe(msg)
    expect(r.geral).toBeNull()
  })

  it('ciclo (RG-02) não diz se é o pai ou a mãe: vai para o topo', () => {
    const msg = 'Esse vínculo faria do pombo 1/24 ancestral de si mesmo: 2/24 descende de 1/24'
    const r = separarErros(erroApi(400, msg), CAMPOS, 'x')
    expect(r.geral).toBe(msg)
    expect(r.campos).toEqual({})
  })

  it('sem pista de campo, vai para o topo', () => {
    expect(separarErros(erroApi(500, 'erro estranho'), CAMPOS, 'x').geral).toBe('erro estranho')
    expect(separarErros(new Error('rede'), CAMPOS, 'Erro ao salvar o pombo.').geral).toBe('Erro ao salvar o pombo.')
  })

  it('US-01: no formulário de usuário, login e senha vão para o campo; pombo não ganha esses campos', () => {
    const USU = ['nome', 'login', 'senha'] as const
    expect(separarErros(erroApi(409, 'Já existe um usuário com esse login'), USU, 'x').campos.login).toBe('Já existe um usuário com esse login')
    expect(separarErros(erroApi(400, 'A senha precisa ter pelo menos 8 caracteres'), USU, 'x').campos.senha).toBeDefined()
    // formulário de pombo não tem "login": a mensagem vai para o topo
    expect(separarErros(erroApi(409, 'Já existe um usuário com esse login'), CAMPOS, 'x').geral).toBe('Já existe um usuário com esse login')
  })
})
