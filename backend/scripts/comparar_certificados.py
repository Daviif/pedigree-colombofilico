"""SG-02: teste visual do certificado antes de trocar WeasyPrint, Python ou Debian.

Baixa os mesmos certificados de dois backends (o atual e o novo, cada um rodando numa porta)
e compara página por página: número de páginas, tamanho e pixels diferentes.

Uso (precisa de `pdftoppm`/`pdfinfo` do poppler e de Pillow):
    PEDIGREE_LOGIN=... PEDIGREE_SENHA=... python3 scripts/comparar_certificados.py \\
        http://localhost:8013 http://localhost:8012 15 12 57 45 9

Aprovado = mesmo número de páginas e 0,00% em todas, exceto a linha "gerado em ... HH:MM",
que muda se os dois PDFs forem gerados em minutos diferentes (confira na imagem *-diferenca.png).
Um certificado diferente de verdade dá alguns % (o teste já foi conferido assim).
"""
import http.cookiejar
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import urllib.request

from PIL import Image, ImageChops

GERACOES = (2, 4, 6)
LIMIAR = 40  # diferença de tom (0-255) que conta como pixel diferente; abaixo disso é suavização


def baixar(base: str, pombos: list[str], pasta: pathlib.Path) -> None:
    cookies = urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
    nav = urllib.request.build_opener(cookies)
    corpo = json.dumps({"login": os.environ["PEDIGREE_LOGIN"], "senha": os.environ["PEDIGREE_SENHA"]}).encode()
    nav.open(urllib.request.Request(f"{base}/api/auth/login", data=corpo, headers={"Content-Type": "application/json"}))
    for pid in pombos:
        for g in GERACOES:
            (pasta / f"p{pid}-g{g}.pdf").write_bytes(nav.open(f"{base}/api/pombos/{pid}/certificado?geracoes={g}").read())


def paginas(pdf: pathlib.Path, prefixo: pathlib.Path) -> list[Image.Image]:
    subprocess.run(["pdftoppm", "-r", "60", "-png", str(pdf), str(prefixo)], check=True)
    return [Image.open(p).convert("L") for p in sorted(prefixo.parent.glob(f"{prefixo.name}-*.png"))]


def main() -> int:
    base_a, base_b, *pombos = sys.argv[1:]
    raiz = pathlib.Path(tempfile.mkdtemp(prefix="certificados-"))
    a, b = raiz / "atual", raiz / "novo"
    a.mkdir(), b.mkdir()
    baixar(base_a, pombos, a)
    baixar(base_b, pombos, b)
    aprovado = True
    for pdf in sorted(a.glob("*.pdf")):
        pa, pb = paginas(pdf, a / pdf.stem), paginas(b / pdf.name, b / pdf.stem)
        if len(pa) != len(pb):
            print(f"{pdf.name}: REPROVADO — {len(pa)} página(s) no atual, {len(pb)} no novo")
            aprovado = False
            continue
        notas = []
        for i, (ia, ib) in enumerate(zip(pa, pb), 1):
            if ia.size != ib.size:
                notas.append(f"pág. {i}: tamanho diferente")
                aprovado = False
                continue
            dif = ImageChops.difference(ia, ib).point(lambda v: 255 if v > LIMIAR else 0)
            n = sum(1 for v in dif.getdata() if v)
            notas.append(f"pág. {i}: {100 * n / (ia.size[0] * ia.size[1]):.2f}%")
            if n:
                dif.save(raiz / f"{pdf.stem}-{i}-diferenca.png")
        print(f"{pdf.name}: {len(pa)} página(s) | " + " | ".join(notas))
    print(f"\nArquivos e imagens das diferenças: {raiz}")
    print("Mesmo número de páginas em todos." if aprovado else "REPROVADO: veja acima.")
    return 0 if aprovado else 1


if __name__ == "__main__":
    sys.exit(main())
