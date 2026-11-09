"""Fotos "depois" (7.8) das mesmas telas de docs/ux/antes, mais os estados (erro de rede,
não encontrado, só leitura) e a árvore no celular. Mesmo usuário `auditoria` dos cenários.
Uso: python3 fotos_depois.py <pasta>"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5180"; OUT = sys.argv[1]; log = []


def entrar(page):
    page.goto(BASE); page.locator("input").nth(0).fill("auditoria")
    page.locator("input[type=password]").fill("auditoria-ux-2026")
    page.get_by_role("button", name="Entrar").click(); page.locator("input[type=password]").wait_for(state="detached")


def foto(page, nome, rota=None, esperar=None):
    if rota:
        page.goto(BASE + rota); page.wait_for_load_state("networkidle")
    if esperar:
        page.locator(esperar).first.wait_for()
    page.wait_for_timeout(300)
    page.screenshot(path=f"{OUT}/{nome}.png", full_page=True)
    log.append(f"{nome}: largura {page.evaluate('document.documentElement.scrollWidth')}px")


with sync_playwright() as p:
    nav = p.chromium.launch()
    for disp, tam in (("desktop", {"width": 1366, "height": 800}), ("celular", {"width": 390, "height": 844})):
        ctx = nav.new_context(viewport=tam, is_mobile=disp == "celular", has_touch=disp == "celular")
        page = ctx.new_page(); page.set_default_timeout(30000); entrar(page)
        meu = next(x for x in page.request.get(BASE + "/api/pombos", params={"anilha": "4272402/24"}).json() if x["dono"]["nome"].startswith("Auditoria"))
        foto(page, f"{disp}-06-novo-pombo", "/pombos/novo")
        foto(page, f"{disp}-11-pombos", "/pombos", "main a[href^='/pombos/'] >> visible=true")
        foto(page, f"{disp}-12-detalhe", f"/pombos/{meu['id']}", "[data-vista] >> visible=true")
        foto(page, f"{disp}-08-detalhe-compartilhado", "/pombos/15", "[data-vista] >> visible=true")
        foto(page, f"{disp}-16-nao-encontrado", "/pombos/999999", "text=Pombo não encontrado")
        page.route("**/api/pombos?**", lambda r: r.abort()); page.route("**/api/pombos", lambda r: r.abort())
        page.goto(BASE + "/pombos"); page.get_by_role("button", name="Tentar de novo").wait_for(); foto(page, f"{disp}-17-pombos-erro-rede")
        page.unroute("**/api/pombos?**"); page.unroute("**/api/pombos")
        ctx.close()
    nav.close()
print("\n".join(log))
