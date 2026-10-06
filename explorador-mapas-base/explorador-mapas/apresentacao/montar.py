"""
Monta as apresentações a partir dos modelos em apresentacao/modelos/.

- v1.html: versão completa (22 slides).
- v2.html: versão enxuta com respostas preparadas. Reaproveita o estilo e
  alguns slides da v1 através dos marcadores {{ESTILO_V1}} e {{SLIDE_V1:n}}.

As imagens {{IMG:arquivo.png}} vêm de apresentacao/demo/ e são embutidas
no HTML, então cada arquivo final funciona sozinho, inclusive offline.

Uso (a partir da pasta explorador-mapas):
    python apresentacao/montar.py
"""

import base64
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
MODELOS = RAIZ / "modelos"
DEMO = RAIZ / "demo"


def embutir_imagens(html):
    def trocar(m):
        dados = (DEMO / m.group(1)).read_bytes()
        return "data:image/png;base64," + base64.b64encode(dados).decode()

    return re.sub(r"\{\{IMG:([^}]+)\}\}", trocar, html)


def slides_por_numero(html):
    """Lê os slides marcados com <!-- n. Título -->."""
    padrao = re.compile(r"<!-- (\d+)\. .*?-->\s*(<section.*?</section>)", re.S)
    return {int(m.group(1)): m.group(2) for m in padrao.finditer(html)}


def numerar_rodapes(html):
    """Troca o número no rodapé de cada slide pela posição real no deck."""
    posicao = 0

    def numerar(m):
        nonlocal posicao
        posicao += 1
        return re.sub(
            r'(<div class="footer"[^>]*>.*?)<span>\d+</span></div>',
            lambda f: f.group(1) + f"<span>{posicao:02d}</span></div>",
            m.group(0),
            flags=re.S,
        )

    return re.sub(r"<section.*?</section>", numerar, html, flags=re.S)


def main():
    v1 = (MODELOS / "v1.html").read_text(encoding="utf-8")
    v2 = (MODELOS / "v2.html").read_text(encoding="utf-8")

    estilo = re.search(r"<style>(.*?)</style>", v1, re.S).group(1)
    slides_v1 = slides_por_numero(v1)

    v2 = v2.replace("{{ESTILO_V1}}", estilo)
    v2 = re.sub(r"\{\{SLIDE_V1:(\d+)\}\}", lambda m: slides_v1[int(m.group(1))], v2)

    for nome, html in [("apresentacao.html", v1), ("apresentacao-v2.html", v2)]:
        final = embutir_imagens(numerar_rodapes(html))
        (RAIZ / nome).write_text(final, encoding="utf-8")
        total = final.count('<section class="slide')
        print(f"{nome}: {total} slides, {len(final.encode()) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
