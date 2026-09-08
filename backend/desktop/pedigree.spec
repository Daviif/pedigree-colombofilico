# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

ROOT = Path(SPECPATH).resolve().parent  # backend/
DESKTOP = ROOT / "desktop"
FRONTEND_DIST = ROOT.parent / "frontend" / "dist"

a = Analysis(
    [str(DESKTOP / "desktop_main.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=[
        (str(FRONTEND_DIST), "frontend_dist"),
        (str(DESKTOP / "pedigree-inicial.db"), "."),
        (str(ROOT / "app" / "pdf" / "templates"), "app/pdf/templates"),
    ],
    hiddenimports=[],
    hookspath=[],
    runtime_hooks=[],
    excludes=["weasyprint"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="PedigreeColombofilico",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
)
