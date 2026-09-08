"""Ponto de entrada do app desktop (empacotado com PyInstaller).

Sobe o mesmo backend FastAPI numa thread local, servindo também os arquivos
estáticos do front-end (build do Vite), e abre uma janela nativa com
`pywebview` apontando para ele. Sem Electron, sem servidor de banco externo:
o banco é um arquivo SQLite dentro da pasta de dados do usuário.
"""

import os
import shutil
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

PORTA = 8734


def caminho_recurso(relativo: str) -> Path:
    """Resolve um caminho tanto rodando via `python desktop_main.py` quanto
    dentro do executável congelado pelo PyInstaller (`sys._MEIPASS`)."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base / relativo


def pasta_dados_usuario() -> Path:
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", Path.home()))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path.home() / ".local" / "share"
    pasta = base / "PedigreeColombofilico"
    pasta.mkdir(parents=True, exist_ok=True)
    return pasta


def preparar_banco() -> Path:
    caminho_banco = pasta_dados_usuario() / "pedigree.db"
    if not caminho_banco.exists():
        semente = caminho_recurso("pedigree-inicial.db")
        if semente.exists():
            shutil.copy(semente, caminho_banco)
    return caminho_banco


def main() -> None:
    os.environ["DATABASE_URL"] = f"sqlite:///{preparar_banco()}"

    # Importados só agora: precisam ler DATABASE_URL já setado acima.
    import uvicorn
    from fastapi.responses import FileResponse

    from app.database import Base, engine
    from app.main import app

    Base.metadata.create_all(bind=engine)

    frontend_dist = caminho_recurso("frontend_dist")

    @app.get("/{caminho_completo:path}")
    async def servir_frontend(caminho_completo: str):
        arquivo = frontend_dist / caminho_completo
        if arquivo.is_file():
            return FileResponse(arquivo)
        return FileResponse(frontend_dist / "index.html")

    def rodar_servidor() -> None:
        uvicorn.run(app, host="127.0.0.1", port=PORTA, log_level="warning")

    threading.Thread(target=rodar_servidor, daemon=True).start()

    url = f"http://127.0.0.1:{PORTA}/"
    for _ in range(100):
        try:
            urllib.request.urlopen(f"{url}api/health", timeout=0.5)
            break
        except (urllib.error.URLError, ConnectionError):
            time.sleep(0.1)

    import webview

    webview.create_window("Pedigree Colombófilo", url, width=1300, height=860, min_size=(900, 600))
    webview.start()


if __name__ == "__main__":
    main()
