#!/usr/bin/env python3
"""Puxa os backups cifrados da VPS para este PC (RO-04..06 em docs/requisitos.md).

Pastas (em ~/backups-pedigree/externos/, ou PEDIGREE_BACKUP_DIR):
- espelho/   cópia exata de backups/externo da VPS (rsync --delete). Se a VPS apagar ou
             trocar arquivos, isso só afeta o espelho.
- arquivo/   o que fica guardado no PC, com a rotação 14 diários + 8 semanais + 12 mensais.
             Nunca é apagado pelo lado da VPS.
- importados.txt  nomes já trazidos para o arquivo; um arquivo apagado pela rotação não
                  volta na próxima execução.

Sem argumentos: puxa, importa, aplica a rotação e confere a idade da cópia mais recente
(notificação na área de trabalho se passar de 48 h). Só usa a biblioteca padrão.
"""

import os
import re
import shutil
import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ORIGEM = os.environ.get("PEDIGREE_BACKUP_ORIGEM", "pedigree-backup:")  # alias do ~/.ssh/config
BASE = Path(os.environ.get("PEDIGREE_BACKUP_DIR", Path.home() / "backups-pedigree" / "externos"))
DIARIOS, SEMANAIS, MENSAIS = 14, 8, 12  # RO-05
LIMITE_SEM_COPIA = timedelta(hours=48)  # RO-06
NOME = re.compile(r"^pedigree-(\d{4}-\d{2}-\d{2})-(\d{4})\.sql\.gz\.age$")


def data_do_arquivo(nome: str) -> datetime | None:
    m = NOME.match(nome)
    if not m:
        return None
    try:
        return datetime.strptime(f"{m.group(1)} {m.group(2)}", "%Y-%m-%d %H%M")
    except ValueError:
        return None


def manter(nomes: list[str]) -> set[str]:
    """RO-05: dos nomes de backup, quais ficam. Para cada um dos 14 dias, 8 semanas (ISO) e
    12 meses mais recentes que têm backup, fica o arquivo mais recente daquele período.
    Nome fora do padrão nunca é apagado."""
    datados = sorted(
        ((d, n) for n in nomes if (d := data_do_arquivo(n)) is not None), reverse=True
    )
    ficam = {n for n in nomes if data_do_arquivo(n) is None}
    for chave, limite in (
        (lambda d: d.date(), DIARIOS),
        (lambda d: d.isocalendar()[:2], SEMANAIS),
        (lambda d: (d.year, d.month), MENSAIS),
    ):
        periodos: set = set()
        for d, n in datados:  # do mais recente para o mais antigo
            p = chave(d)
            if p in periodos:
                continue
            if len(periodos) == limite:
                break
            periodos.add(p)
            ficam.add(n)
    return ficam


def puxar(espelho: Path) -> None:
    espelho.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["rsync", "-rt", "--delete", "--timeout=60", "--include=pedigree-*.sql.gz.age",
         "--exclude=*", ORIGEM, f"{espelho}/"],
        check=True,
    )


def importar(espelho: Path, arquivo: Path, registro: Path) -> list[str]:
    arquivo.mkdir(parents=True, exist_ok=True)
    vistos = set(registro.read_text().split()) if registro.exists() else set()
    novos = []
    for origem in sorted(espelho.glob("pedigree-*.sql.gz.age")):
        if origem.name in vistos or data_do_arquivo(origem.name) is None:
            continue
        if origem.stat().st_size == 0:
            continue
        shutil.copy2(origem, arquivo / origem.name)
        novos.append(origem.name)
    if novos:
        with registro.open("a") as f:
            f.writelines(n + "\n" for n in novos)
    return novos


def rotacionar(arquivo: Path) -> list[str]:
    nomes = [p.name for p in arquivo.glob("pedigree-*")]
    ficam = manter(nomes)
    apagados = sorted(set(nomes) - ficam)
    for n in apagados:
        (arquivo / n).unlink()
    return apagados


def mais_recente(arquivo: Path) -> datetime | None:
    datas = [d for p in arquivo.glob("pedigree-*") if (d := data_do_arquivo(p.name))]
    return max(datas, default=None)


def avisar(titulo: str, texto: str) -> None:
    print(f"AVISO: {titulo}: {texto}", file=sys.stderr)
    if shutil.which("notify-send"):
        subprocess.run(["notify-send", "-u", "critical", "-a", "Backup do pedigree", titulo, texto],
                       check=False)


def main(agora: datetime | None = None) -> int:
    agora = agora or datetime.now()
    espelho, arquivo, registro = BASE / "espelho", BASE / "arquivo", BASE / "importados.txt"
    falha_rsync = None
    try:
        puxar(espelho)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        falha_rsync = str(e)
    novos = importar(espelho, arquivo, registro)
    apagados = rotacionar(arquivo)
    ultimo = mais_recente(arquivo)
    print(f"{agora:%F %T} novos={len(novos)} apagados_pela_rotacao={len(apagados)} "
          f"mais_recente={ultimo:%F %H:%M}" if ultimo else f"{agora:%F %T} nenhum backup no PC")

    if ultimo is None or agora - ultimo > LIMITE_SEM_COPIA:
        quando = f"a mais recente é de {ultimo:%d/%m %H:%M}" if ultimo else "não há nenhuma"
        motivo = f" Falha ao buscar na VPS: {falha_rsync}" if falha_rsync else ""
        avisar("Backup do pedigree atrasado", f"Nenhuma cópia nova há mais de 48 h ({quando}).{motivo}")
        return 1
    if falha_rsync:
        print(f"Falha ao buscar na VPS (a cópia mais recente ainda está no prazo): {falha_rsync}",
              file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
