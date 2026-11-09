"""Medição "depois" (7.8) dos cenários do adendo G, com a MESMA contagem da linha de base
(cenarios.py): ações = cliques + campos preenchidos + opções escolhidas, a partir da tela
inicial. Campo comum preenchido = 1 ação; seletor de pai/mãe = clicar + digitar + escolher
(3), como na linha de base. Mede o tempo de máquina (não é tempo humano).

Pré-requisito (igual ao "antes"): usuário `auditoria` que vê o plantel do admin (id 1) por
compartilhamento e copiou os pombos 15, 44 e 39 (com ancestrais).
Uso: python3 cenarios_depois.py <pasta-de-fotos>
"""
import re, sys, time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5180"
OUT = sys.argv[1]
res = []


class Contador:
    def __init__(s, page): s.page, s.n, s.passos = page, 0, []
    def clicar(s, loc, desc): loc.click(); s.n += 1; s.passos.append(f"clicar {desc}")
    def digitar(s, loc, txt, desc): loc.fill(txt); s.n += 1; s.passos.append(f"digitar {desc}")
    def tecla(s, tecla, desc): s.page.keyboard.press(tecla); s.n += 1; s.passos.append(f"tecla {desc}")


def entrar(page):
    page.goto(BASE); page.locator("input").nth(0).fill("auditoria")
    page.locator("input[type=password]").fill("auditoria-ux-2026")
    page.get_by_role("button", name="Entrar").click()
    page.locator("input[type=password]").wait_for(state="detached")


def cenario(nome, disp, fn, page):
    page.goto(BASE + "/"); page.wait_for_load_state("networkidle")
    c = Contador(page); t = time.time(); ok, obs = True, ""
    try:
        obs = fn(c, page) or ""
    except Exception as e:
        ok, obs = False, f"{type(e).__name__}: {str(e)[:200]}"
    page.wait_for_timeout(300)
    page.screenshot(path=f"{OUT}/cenario-{disp}-{nome.split()[0]}.png", full_page=True)
    res.append((nome, disp, ok, c.n, round(time.time() - t, 1), " → ".join(c.passos), obs))
    print(f"{nome} | {disp} | {'OK' if ok else 'FALHOU'} | ações={c.n} | {obs}", flush=True)


def buscar_e_abrir(c, page, anilha):
    """Busca grande do Início (visível no desktop e no celular) → Enter abre o primeiro."""
    campo = page.get_by_placeholder("Digite a anilha (ex.: 4272402)")
    c.digitar(campo, anilha, "busca")
    page.get_by_role("listbox", name="Resultados da busca").wait_for()
    c.tecla("Enter", "Enter")
    page.wait_for_url(re.compile(r"/pombos/\d+$"))
    page.get_by_role("heading", level=1, name=re.compile(re.escape(anilha))).wait_for(); page.wait_for_load_state("networkidle")


def no_formulario_novo(c, page):
    c.clicar(page.get_by_role("link", name=re.compile("Cadastrar agora")), "Cadastrar agora")
    page.wait_for_url(re.compile(r"/pombos/novo")); page.get_by_role("textbox", name=re.compile("Anilha")).wait_for()


def s1(c, page):  # cadastrar um pombo
    no_formulario_novo(c, page)
    c.digitar(page.get_by_role("textbox", name=re.compile("Anilha")), "900001/26", "anilha")
    c.clicar(page.locator("label").filter(has=page.get_by_role("radio", name=re.compile("Macho"))), "sexo Macho")
    c.digitar(page.get_by_label("Cor", exact=True), "Azul", "cor")
    c.clicar(page.get_by_role("button", name="Salvar", exact=True), "Salvar")
    page.wait_for_url(re.compile(r"/pombos/\d+$")); return f"terminou em {page.url.replace(BASE, '')} (detalhe do pombo novo)"


def s1_serie(c, page):  # cadastro em série: quanto custa cada pombo seguinte
    no_formulario_novo(c, page)
    anilha = page.get_by_role("textbox", name=re.compile("Anilha"))
    c.digitar(anilha, "900010/26", "anilha 1")
    c.clicar(page.locator("label").filter(has=page.get_by_role("radio", name=re.compile("Macho"))), "sexo 1")
    c.digitar(page.get_by_label("Cor", exact=True), "Azul", "cor (só no 1º)")
    c.clicar(page.get_by_role("button", name="Salvar e cadastrar outro"), "Salvar e cadastrar outro")
    page.get_by_text("900010/26 salvo").wait_for()
    antes = c.n
    c.digitar(anilha, "900011/26", "anilha 2")
    c.clicar(page.locator("label").filter(has=page.get_by_role("radio", name=re.compile("Fêmea"))), "sexo 2")
    c.clicar(page.get_by_role("button", name="Salvar e cadastrar outro"), "Salvar e cadastrar outro")
    page.get_by_text("900011/26 salvo").wait_for()
    cor_mantida = page.get_by_label("Cor", exact=True).input_value()
    return f"+{c.n - antes} ações por pombo seguinte; cor mantida: {cor_mantida!r}"


def s2(c, page):  # com pai e mãe existentes
    no_formulario_novo(c, page)
    c.digitar(page.get_by_role("textbox", name=re.compile("Anilha")), "900002/26", "anilha")
    for papel, anilha in (("pai", "1356642/22"), ("mãe", "440013/16")):
        campo = page.get_by_placeholder(f"Buscar {papel} por anilha…")
        c.clicar(campo, f"campo {papel}"); c.digitar(campo, anilha[:5], f"busca {papel}")
        c.clicar(page.get_by_role("option").filter(has_text=anilha).first, f"opção {anilha}")
    c.clicar(page.get_by_role("button", name="Salvar", exact=True), "Salvar")
    page.wait_for_url(re.compile(r"/pombos/\d+$")); return ""


def s3(c, page):  # encontrar pela anilha
    buscar_e_abrir(c, page, "900001")
    return f"abriu {page.get_by_role('heading', level=1).inner_text()} pela busca do Início"


def s3_teclado(c, page):  # só teclado: / foca a busca do topo (desktop)
    if page.viewport_size["width"] < 640:
        return "n/a no celular (a busca do topo abre pela lupa)"
    page.locator("main").click(position={"x": 5, "y": 5})  # tira o foco de qualquer campo
    c.tecla("/", "/"); page.keyboard.type("900001"); c.n += 1; c.passos.append("digitar busca")
    page.get_by_role("listbox", name="Resultados da busca").wait_for(); c.tecla("Enter", "Enter")
    page.wait_for_url(re.compile(r"/pombos/\d+$")); return "sem mouse"


def s4(c, page):  # corrigir um dado
    buscar_e_abrir(c, page, "900001")
    c.clicar(page.get_by_role("link", name="Editar", exact=True), "Editar")
    c.digitar(page.get_by_label("Cor", exact=True), "Vermelho", "cor")
    c.clicar(page.get_by_role("button", name="Salvar", exact=True), "Salvar")
    page.wait_for_url(re.compile(r"/pombos/\d+$")); page.get_by_text("Vermelho").first.wait_for(); return ""


def vista(page):
    return page.locator('[data-vista="celular"]' if page.viewport_size["width"] < 640 else '[data-vista="colunas"]')


def s5(c, page):  # adicionar ancestral desconhecido: pai do 900001/26 (novo, como no "antes")
    buscar_e_abrir(c, page, "900001")
    url = page.url
    c.clicar(vista(page).get_by_role("button", name="Adicionar pai de 900001/26"), "vaga + Pai")
    painel = page.get_by_role("dialog")
    c.clicar(painel.get_by_role("tab", name="Cadastrar novo"), "aba Cadastrar novo")
    c.digitar(painel.get_by_role("textbox", name=re.compile("Anilha")), "900003/24", "anilha do pai")
    c.clicar(painel.get_by_role("button", name="Cadastrar e ligar"), "Cadastrar e ligar")
    page.get_by_text("900003/24 ligado como pai de 900001/26").wait_for()
    return f"ficou na mesma página: {page.url == url}; da árvore: {c.n - 2} ações"


def s5_avo(c, page):  # o avô (pai do pai), continuando na árvore
    buscar_e_abrir(c, page, "900001")
    v = vista(page)
    if page.viewport_size["width"] < 640:  # celular: sobe para o pai e completa
        c.clicar(v.get_by_role("button", name=re.compile("^Subir para Pai")), "tocar no Pai")
    c.clicar(v.get_by_role("button", name="Adicionar pai de 900003/24"), "vaga + Pai do pai")
    painel = page.get_by_role("dialog")
    c.clicar(painel.get_by_role("tab", name="Cadastrar novo"), "aba Cadastrar novo")
    c.digitar(painel.get_by_role("textbox", name=re.compile("Anilha")), "900004/22", "anilha do avô")
    c.clicar(painel.get_by_role("button", name="Cadastrar e ligar"), "Cadastrar e ligar")
    page.get_by_text("900004/22 ligado como pai de 900003/24").wait_for()
    return f"da árvore: {c.n - 2} ações, sem sair da página"


def s6(c, page):  # gerar PDF
    buscar_e_abrir(c, page, "4272402")
    c.clicar(page.get_by_role("button", name=re.compile("Certificado PDF")), "Certificado PDF")
    with page.expect_download() as d:
        c.clicar(page.get_by_role("link", name=re.compile(r"Baixar PDF \(4 gerações\)")), "Baixar PDF (4 gerações)")
    so_leitura = page.get_by_text("Só leitura").count() > 0
    return f"PDF baixado ({d.value.suggested_filename}); a janela diz as gerações; abriu {'o do admin (só leitura)' if so_leitura else 'o do próprio plantel'}"


def s7_arvore_celular(c, page):  # S7: a árvore é legível no celular?
    if page.viewport_size["width"] >= 640:
        return "n/a no desktop"
    buscar_e_abrir(c, page, "4272402")
    v = vista(page); v.wait_for()
    largura = page.evaluate("document.documentElement.scrollWidth")
    principal = v.locator("[aria-label^='Pombo principal']")
    larg_caixa = principal.bounding_box()["width"]
    fonte = page.evaluate("e => parseFloat(getComputedStyle(e).fontSize)", v.locator(".font-bold").nth(1).element_handle())
    menor_fonte = fonte
    c.clicar(v.get_by_role("button", name=re.compile("^Subir para Pai")), "tocar no Pai")
    c.clicar(v.get_by_role("button", name=re.compile("^Subir para Avô paterno")), "tocar no Avô")
    trilha = v.get_by_role("navigation").inner_text().replace("\n", " ")
    return f"largura da página {largura}px (tela 390); caixa {larg_caixa:.0f}px; anilha {menor_fonte:.0f}px; trilha '{trilha}'"


def limpar(page):
    # filhos antes dos pais (RG-09)
    for a in ("900002/26", "900011/26", "900010/26", "900001/26", "900003/24", "900004/22"):
        for pb in page.request.get(BASE + "/api/pombos", params={"anilha": a}).json():
            if pb["anilha"] == a and pb["dono"]["nome"].startswith("Auditoria"):
                page.request.delete(f"{BASE}/api/pombos/{pb['id']}")


def preparar(page):
    """Igual ao "antes": copia 15, 44 e 39 (com ancestrais) do plantel do admin, se ainda não copiou."""
    meus = [x for x in page.request.get(BASE + "/api/pombos").json() if x["dono"]["nome"].startswith("Auditoria")]
    if not meus:
        for pid in (15, 44, 39):
            r = page.request.post(f"{BASE}/api/pombos/{pid}/copiar")
            print(f"copiar {pid}: {r.status}", "" if r.ok else r.text()[:160])


with sync_playwright() as p:
    nav = p.chromium.launch()
    for disp, tam in (("desktop", {"width": 1366, "height": 800}), ("celular", {"width": 390, "height": 844})):
        ctx = nav.new_context(viewport=tam, is_mobile=disp == "celular", has_touch=disp == "celular", accept_downloads=True)
        page = ctx.new_page(); page.set_default_timeout(30000); entrar(page); preparar(page); limpar(page)
        for nome, fn in (("S1 cadastrar pombo", s1), ("S1s cadastro em série", s1_serie), ("S2 cadastrar com pai e mãe", s2),
                         ("S3 achar pela anilha", s3), ("S3t achar só com teclado", s3_teclado), ("S4 corrigir um dado", s4),
                         ("S5 adicionar ancestral desconhecido", s5), ("S5a adicionar o avô", s5_avo), ("S6 gerar PDF", s6),
                         ("S7 árvore no celular", s7_arvore_celular)):
            cenario(nome, disp, fn, page)
        limpar(page)
        ctx.close()
    nav.close()
for r in res:
    print(f"{r[0]} | {r[1]} | {'OK' if r[2] else 'FALHOU'} | ações={r[3]} | {r[4]}s | {r[5]} | {r[6]}")
