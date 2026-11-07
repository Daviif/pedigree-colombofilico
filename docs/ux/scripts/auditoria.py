import os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("UX_BASE", "http://localhost:5180")
OUT = sys.argv[1]
TAMANHOS = {"desktop": {"width": 1366, "height": 800}, "celular": {"width": 390, "height": 844}}
log = []

def foto(page, nome):
    page.wait_for_timeout(600)
    page.screenshot(path=f"{OUT}/{nome}.png", full_page=True)
    log.append(nome)

def entrar(page):
    page.goto(BASE)
    page.locator("input").nth(0).fill("auditoria")
    page.locator("input[type=password]").fill(os.environ["UX_SENHA"])
    page.get_by_role("button", name="Entrar").click()
    page.locator("input[type=password]").wait_for(state="detached")
    page.wait_for_timeout(500)

with sync_playwright() as p:
    nav = p.chromium.launch()
    for disp, tam in [(d, t) for d, t in TAMANHOS.items() if d in sys.argv[2:] or len(sys.argv) == 2]:
        ctx = nav.new_context(viewport=tam, device_scale_factor=1, is_mobile=disp == "celular", has_touch=disp == "celular")
        page = ctx.new_page()
        page.goto(BASE); foto(page, f"{disp}-00-login")
        entrar(page)
        if disp == "desktop":
            # estados vazios (plantel próprio ainda vazio)
            for rota, nome in [("/", "01-painel-vazio"), ("/pombos", "02-pombos-vazio"), ("/reprodutores", "03-reprodutores-vazio"),
                               ("/proprietarios", "04-proprietarios-vazio"), ("/compartilhar", "05-compartilhar"), ("/pombos/novo", "06-novo-pombo")]:
                page.goto(BASE + rota); foto(page, f"{disp}-{nome}")
            # plantel compartilhado, só leitura
            page.goto(BASE + "/pombos?plantel=1"); foto(page, f"{disp}-07-pombos-compartilhado")
            page.goto(BASE + "/pombos/15"); foto(page, f"{disp}-08-detalhe-compartilhado")
            # copia dois pombos para ter dados próprios
            for pid in (15, 44, 39):
                r = page.request.post(f"{BASE}/api/pombos/{pid}/copiar")
                log.append(f"copiar {pid}: {r.status}")
        meus = page.request.get(f"{BASE}/api/pombos").json()
        meu = next(p for p in meus if p["anilha"] == "4272402/24" and p["usuario_id"] != 1)
        page.goto(BASE + "/"); foto(page, f"{disp}-10-painel")
        page.goto(BASE + "/pombos"); foto(page, f"{disp}-11-pombos")
        page.goto(BASE + f"/pombos/{meu['id']}"); foto(page, f"{disp}-12-detalhe")
        page.goto(BASE + f"/pombos/{meu['id']}/editar"); foto(page, f"{disp}-13-editar")
        page.goto(BASE + "/reprodutores"); foto(page, f"{disp}-14-reprodutores")
        page.goto(BASE + "/proprietarios"); foto(page, f"{disp}-15-proprietarios")
        page.goto(BASE + "/pombos/999999"); foto(page, f"{disp}-16-nao-encontrado")
        page.route("**/api/pombos?**", lambda r: r.abort()); page.route("**/api/pombos", lambda r: r.abort())
        page.goto(BASE + "/pombos"); page.wait_for_timeout(4000); foto(page, f"{disp}-17-pombos-erro-rede")
        page.unroute("**/api/pombos?**"); page.unroute("**/api/pombos")
        if disp == "celular":
            page.goto(BASE + "/"); page.get_by_label("Abrir menu").click(); foto(page, f"{disp}-18-menu-aberto")
        ctx.close()
    nav.close()
print("\n".join(log))
