"""Linha de base (antes) dos 7 cenários do adendo G. Conta ações do usuário: clique,
campo preenchido, opção escolhida. Mede o tempo de máquina (não é tempo humano)."""
import os, re, sys, time
from playwright.sync_api import sync_playwright

BASE = os.environ.get("UX_BASE", "http://localhost:5180")
OUT = sys.argv[1]
res = []

class Contador:
    def __init__(s, page): s.page, s.n, s.passos = page, 0, []
    def clicar(s, loc, desc): loc.click(); s.n += 1; s.passos.append(f"clicar {desc}")
    def digitar(s, loc, txt, desc): loc.fill(txt); s.n += 1; s.passos.append(f"digitar {desc}")
    def escolher(s, loc, val, desc): loc.select_option(val); s.n += 1; s.passos.append(f"escolher {desc}")

def entrar(page):
    page.goto(BASE); page.locator("input").nth(0).fill("auditoria")
    page.locator("input[type=password]").fill(os.environ["UX_SENHA"])
    page.get_by_role("button", name="Entrar").click()
    page.locator("input[type=password]").wait_for(state="detached")

def cenario(nome, disp, fn, page):
    page.goto(BASE + "/"); page.wait_for_load_state("networkidle")
    c = Contador(page); t = time.time(); ok, obs = True, ""
    try:
        obs = fn(c, page) or ""
    except Exception as e:
        ok, obs = False, f"{type(e).__name__}: {str(e)[:160]}"
    page.screenshot(path=f"{OUT}/cenario-{disp}-{nome[:2]}.png", full_page=True)
    res.append((nome, disp, ok, c.n, round(time.time() - t, 1), " → ".join(c.passos), obs))

def menu(c, page, item):
    if page.viewport_size["width"] < 640:
        c.clicar(page.get_by_label("Abrir menu"), "menu ☰")
        c.clicar(page.locator("nav").last.get_by_role("link", name=item), f"menu {item}")
    else:
        c.clicar(page.get_by_role("link", name=item).first, f"menu {item}")

def s1(c, page):  # cadastrar um pombo
    menu(c, page, "Pombos"); c.clicar(page.get_by_role("link", name="+ Novo pombo"), "+ Novo pombo")
    c.digitar(page.locator("input").first, "900001/26", "anilha")
    c.escolher(page.locator("select").first, "M", "sexo")
    c.digitar(page.get_by_text("Cor / característica").locator("..").locator("input"), "Azul", "cor")
    c.clicar(page.get_by_role("button", name="Salvar"), "Salvar")
    page.wait_for_url(re.compile(r"/pombos/\d+$")); return f"terminou em {page.url.replace(BASE,'')} (detalhe do pombo novo)"

def s2(c, page):  # com pai e mãe existentes
    menu(c, page, "Pombos"); c.clicar(page.get_by_role("link", name="+ Novo pombo"), "+ Novo pombo")
    c.digitar(page.locator("input").first, "900002/26", "anilha")
    for papel, anilha in (("pai", "1356642/22"), ("mãe", "440013/16")):
        busca = page.get_by_placeholder(f"Buscar {papel} por anilha...")
        c.clicar(busca, f"campo {papel}"); c.digitar(busca, anilha[:5], f"busca {papel}")
        c.clicar(page.get_by_role("button", name=anilha).or_(page.get_by_text(anilha, exact=False)).first, f"opção {anilha}")
    c.clicar(page.get_by_role("button", name="Salvar"), "Salvar")
    page.wait_for_url(re.compile(r"/pombos/\d+$")); return ""

def s3(c, page):  # encontrar pela anilha
    menu(c, page, "Pombos"); c.digitar(page.get_by_placeholder("Anilha"), "440013", "filtro anilha")
    c.clicar(page.get_by_role("link", name="440013/16").first, "resultado")
    page.wait_for_url(re.compile(r"/pombos/\d+$")); return "sem busca global: só pela tela Pombos"

def s4(c, page):  # corrigir um dado
    menu(c, page, "Pombos"); c.digitar(page.get_by_placeholder("Anilha"), "900001", "filtro anilha")
    c.clicar(page.get_by_role("link", name="900001/26").first, "resultado")
    c.clicar(page.get_by_role("link", name="Editar").or_(page.get_by_role("button", name="Editar")).first, "Editar")
    c.digitar(page.get_by_text("Cor / característica").locator("..").locator("input"), "Vermelho", "cor")
    c.clicar(page.get_by_role("button", name="Salvar"), "Salvar"); page.wait_for_url(re.compile(r"/pombos/\d+$"))
    return ""

def s5(c, page):  # adicionar ancestral desconhecido: pai do 900001/26
    menu(c, page, "Pombos"); c.digitar(page.get_by_placeholder("Anilha"), "900001", "filtro anilha")
    c.clicar(page.get_by_role("link", name="900001/26").first, "resultado")
    arvore_tem_vaga = page.get_by_text("Desconhecido").count()
    c.clicar(page.get_by_role("link", name="Editar").or_(page.get_by_role("button", name="Editar")).first, "Editar")
    busca = page.get_by_placeholder("Buscar pai por anilha...")
    c.clicar(busca, "campo pai")
    c.clicar(page.get_by_text("+ Cadastrar pai agora"), "+ Cadastrar pai agora")
    c.digitar(page.get_by_placeholder("Anilha *"), "900003/24", "anilha do pai")
    c.clicar(page.get_by_role("button", name="Cadastrar e vincular"), "Cadastrar e vincular")
    c.clicar(page.get_by_role("button", name="Salvar"), "Salvar"); page.wait_for_url(re.compile(r"/pombos/\d+$"))
    return f"vagas 'Desconhecido' visíveis na árvore antes: {arvore_tem_vaga}; nenhum botão de adicionar na árvore"

def s6(c, page):  # gerar PDF
    menu(c, page, "Pombos"); c.digitar(page.get_by_placeholder("Anilha"), "4272402", "filtro anilha")
    c.clicar(page.get_by_role("link", name="4272402/24").first, "resultado")
    with page.expect_download() as d:
        c.clicar(page.get_by_role("link", name="Gerar certificado PDF").or_(page.get_by_role("button", name="Gerar certificado PDF")).first, "Gerar certificado PDF")
    t = time.time(); arq = d.value.path(); return f"PDF baixado ({d.value.suggested_filename})"

def limpar(page):
    for a in ("900002/26", "900001/26", "900003/24"):  # filhos antes dos pais (RG-09)
        for pb in page.request.get(BASE + "/api/pombos", params={"anilha": a}).json():
            if pb["anilha"] == a and pb["dono"]["nome"].startswith("Auditoria"):
                page.request.delete(f"{BASE}/api/pombos/{pb['id']}")

with sync_playwright() as p:
    nav = p.chromium.launch()
    for disp, tam in (("desktop", {"width": 1366, "height": 800}), ("celular", {"width": 390, "height": 844})):
        ctx = nav.new_context(viewport=tam, is_mobile=disp == "celular", has_touch=disp == "celular", accept_downloads=True)
        page = ctx.new_page(); entrar(page); limpar(page)
        for nome, fn in (("S1 cadastrar pombo", s1), ("S2 cadastrar com pai e mãe", s2), ("S3 achar pela anilha", s3),
                         ("S4 corrigir um dado", s4), ("S5 adicionar ancestral desconhecido", s5), ("S6 gerar PDF", s6)):
            cenario(nome, disp, fn, page)
        ctx.close()
    nav.close()
for r in res:
    print(f"{r[0]} | {r[1]} | {'OK' if r[2] else 'FALHOU'} | ações={r[3]} | {r[4]}s | {r[5]} | {r[6]}")
