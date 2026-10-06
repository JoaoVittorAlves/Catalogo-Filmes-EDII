"""
Captura as telas da demonstração usadas na apresentação.

Uso (com a aplicação rodando em http://127.0.0.1:5000, servidor recém-iniciado):
    python apresentacao/capturar_demo.py apresentacao/demo

Requer: pip install playwright (usa o Microsoft Edge já instalado).
"""

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

SAIDA = Path(sys.argv[1])
SAIDA.mkdir(parents=True, exist_ok=True)
URL = "http://127.0.0.1:5000"


def esperar(page, ms=1500):
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(ms)


def slider(page, seletor, valor):
    page.eval_on_selector(
        seletor,
        "(el, v) => { el.value = v; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); }",
        str(valor),
    )


def total(page, etapa):
    print(f"{etapa}: {page.inner_text('#total-locais')} locais exibidos")


with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge")
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
    page.goto(URL)
    esperar(page, 3000)

    # 1. Tela inicial: nível 0, até 500 km de João Pessoa.
    total(page, "inicio")
    page.locator("#mapa").screenshot(path=SAIDA / "01-inicio.png")

    # 2. Nível 4 da Skip List: só os locais mais relevantes.
    slider(page, "#nivel", 4)
    esperar(page, 2500)
    total(page, "nivel 4")
    page.locator("#mapa").screenshot(path=SAIDA / "02-nivel4.png")
    slider(page, "#nivel", 0)
    esperar(page)

    # 3. Categorias: Praias, Igrejas e Praias (Lista MTF).
    page.click("#categorias button:has-text('Praias')")
    esperar(page)
    page.click("#categorias button:has-text('Igrejas')")
    esperar(page)
    page.click("#categorias button:has-text('Praias')")
    esperar(page, 2500)
    total(page, "praias")
    page.locator(".painel").screenshot(path=SAIDA / "03-categorias.png")
    page.locator("#mapa").screenshot(path=SAIDA / "03b-praias-mapa.png")
    page.click("#categorias button:has-text('Todas')")
    esperar(page)

    # 4. Busca por intervalo: de 100 a 200 km de João Pessoa.
    slider(page, "#raio-min", 100)
    slider(page, "#raio", 200)
    page.evaluate("void mapa.setView([-7.3, -35.6], 7)")
    esperar(page, 2500)
    total(page, "100-200 km")
    page.locator("#mapa").screenshot(path=SAIDA / "04-intervalo-mapa.png")
    page.locator(".estrutura-card").first.screenshot(path=SAIDA / "05-skiplist.png")
    slider(page, "#raio-min", 0)
    slider(page, "#raio", 500)
    esperar(page)

    # 5. Splay Tree: seis locais novos (falhas no cache) e o Farol de novo
    #    (acerto no cache).
    for local_id in [1691, 1684, 1693, 1682, 1719, 1751]:
        page.evaluate(f"selecionarLocal({local_id})")
        page.wait_for_timeout(700)
    esperar(page, 1500)
    page.locator(".estrutura-card").nth(1).screenshot(path=SAIDA / "07a-splay-falha.png")
    page.evaluate("selecionarLocal(1691)")
    esperar(page, 2500)
    print("splay:", page.inner_text("#splay-info"))
    page.locator(".detalhes").screenshot(path=SAIDA / "06-detalhes.png")
    page.locator(".estrutura-card").nth(1).screenshot(path=SAIDA / "07-splay.png")

    # 6. Novo ponto de referência: Salvador, raio de 30 km.
    page.evaluate("void mapa.setView([-12.97, -38.5], 9)")
    esperar(page, 1500)
    page.eval_on_selector("#raio", "el => { el.value = 30; }")
    page.evaluate("void mapa.fire('click', { latlng: L.latLng(-12.97, -38.5) })")
    esperar(page, 3000)
    total(page, "salvador 30 km")
    page.locator("#mapa").screenshot(path=SAIDA / "08-referencia-salvador.png")

    browser.close()

print("ok")
