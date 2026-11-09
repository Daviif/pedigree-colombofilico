"""Testes do backup no PC (RO-04..06). Rodar: backend/.venv/bin/python -m pytest backup-pc/"""

import subprocess
from datetime import datetime, timedelta

import pytest

import puxar_backups as pb

HOJE = datetime(2026, 11, 7, 12, 0)


def _nome(d: datetime) -> str:
    return f"pedigree-{d:%Y-%m-%d-%H%M}.sql.gz.age"


def _diarios(dias: int, hora: int = 3) -> list[str]:
    return [_nome(HOJE.replace(hour=hora, minute=0) - timedelta(days=i)) for i in range(dias)]


# RO-05
def test_rotacao_guarda_14_dias_8_semanas_12_meses():
    nomes = _diarios(500)
    ficam = pb.manter(nomes)
    datas = sorted(pb.data_do_arquivo(n) for n in ficam)
    # os 14 dias mais recentes inteiros
    assert set(_diarios(14)) <= ficam
    # pelo menos 8 semanas e exatamente 12 meses distintos representados
    assert len({d.isocalendar()[:2] for d in datas}) >= 8
    assert len({(d.year, d.month) for d in datas}) == 12
    # nada além de 14 + 8 + 12 e nada mais velho que ~12 meses
    assert len(ficam) <= 14 + 8 + 12
    assert datas[0] >= HOJE - timedelta(days=366)


def test_rotacao_fica_com_o_mais_recente_de_cada_dia():
    manha, noite = HOJE.replace(hour=3, minute=0), HOJE.replace(hour=17, minute=25)
    ficam = pb.manter([_nome(manha), _nome(noite)])
    assert ficam == {_nome(noite)}


def test_rotacao_nunca_apaga_nome_fora_do_padrao():
    estranhos = ["leia-me.txt", "pedigree-2026-13-40-0300.sql.gz.age"]
    assert set(estranhos) <= pb.manter(_diarios(100) + estranhos)


def test_rotacao_com_poucos_backups_nao_apaga_nada():
    assert pb.manter(_diarios(5)) == set(_diarios(5))


# RO-04
@pytest.fixture
def ambiente(tmp_path, monkeypatch):
    vps = tmp_path / "vps"
    vps.mkdir()
    monkeypatch.setattr(pb, "ORIGEM", f"{vps}/")
    monkeypatch.setattr(pb, "BASE", tmp_path / "pc")
    avisos = []
    monkeypatch.setattr(pb, "avisar", lambda t, x: avisos.append((t, x)))
    monkeypatch.setattr(pb.time, "sleep", lambda s: None)  # novas tentativas sem esperar de verdade
    return vps, tmp_path / "pc", avisos


def _criar(pasta, d, conteudo=b"cifrado"):
    (pasta / _nome(d)).write_bytes(conteudo)


def test_puxa_importa_e_nao_reimporta_o_que_a_rotacao_apagou(ambiente):
    vps, pc, avisos = ambiente
    for i in range(30):  # a VPS guarda 30 dias
        _criar(vps, HOJE.replace(hour=3) - timedelta(days=i))
    assert pb.main(agora=HOJE) == 0
    guardados = {p.name for p in (pc / "arquivo").iterdir()}
    assert len(guardados) < 30  # a rotação já agiu
    assert set(_diarios(14)) <= guardados

    pb.main(agora=HOJE)  # de novo: o que foi apagado não volta
    assert {p.name for p in (pc / "arquivo").iterdir()} == guardados
    assert avisos == []


def test_vps_apagando_tudo_nao_afeta_o_arquivo_do_pc(ambiente):
    vps, pc, _ = ambiente
    _criar(vps, HOJE.replace(hour=3))
    pb.main(agora=HOJE)
    for p in vps.iterdir():
        p.unlink()
    pb.main(agora=HOJE)
    assert len(list((pc / "arquivo").iterdir())) == 1
    assert list((pc / "espelho").iterdir()) == []


def test_arquivo_vazio_nao_e_importado(ambiente):
    vps, pc, _ = ambiente
    _criar(vps, HOJE.replace(hour=3), b"")
    pb.main(agora=HOJE)
    assert list((pc / "arquivo").iterdir()) == []


# RO-06
def test_avisa_quando_a_copia_mais_recente_passa_de_48h(ambiente):
    vps, pc, avisos = ambiente
    _criar(vps, HOJE - timedelta(hours=47))
    assert pb.main(agora=HOJE) == 0 and avisos == []
    assert pb.main(agora=HOJE + timedelta(hours=2)) == 1
    assert "48 h" in avisos[-1][1]


def test_avisa_quando_nao_ha_nenhum_backup(ambiente):
    _, _, avisos = ambiente
    assert pb.main(agora=HOJE) == 1
    assert "não há nenhuma" in avisos[-1][1]


def test_falha_do_rsync_aparece_no_aviso(ambiente, monkeypatch):
    _, _, avisos = ambiente
    monkeypatch.setattr(pb, "ORIGEM", "/nao/existe/")
    assert pb.main(agora=HOJE) == 1
    assert "Falha ao buscar na VPS" in avisos[-1][1]


# RO-04: novas tentativas (PC voltando da suspensão sem rede)
def _rsync_que_falha(vezes, chamadas):
    real = subprocess.run

    def falso(cmd, *a, **k):
        chamadas.append(cmd[0])
        if cmd[0] == "rsync" and len(chamadas) <= vezes:
            raise subprocess.CalledProcessError(255, cmd)
        return real(cmd, *a, **k)

    return falso


def test_rsync_tenta_de_novo_e_importa_na_terceira(ambiente, monkeypatch):
    vps, pc, avisos = ambiente
    _criar(vps, HOJE - timedelta(hours=3))
    chamadas, esperas = [], []
    monkeypatch.setattr(pb.subprocess, "run", _rsync_que_falha(2, chamadas))
    monkeypatch.setattr(pb.time, "sleep", esperas.append)
    assert pb.main(agora=HOJE) == 0
    assert chamadas.count("rsync") == 3
    assert esperas == [60, 60]
    assert (pc / "arquivo" / _nome(HOJE - timedelta(hours=3))).exists()
    assert avisos == []


def test_rsync_desiste_depois_de_3_tentativas(ambiente, monkeypatch):
    _, _, avisos = ambiente
    chamadas, esperas = [], []
    monkeypatch.setattr(pb.subprocess, "run", _rsync_que_falha(99, chamadas))
    monkeypatch.setattr(pb.time, "sleep", esperas.append)
    assert pb.main(agora=HOJE) == 1  # sem nenhum backup no PC: avisa
    assert chamadas.count("rsync") == 3
    assert esperas == [60, 60]
    assert "Falha ao buscar na VPS" in avisos[-1][1]
