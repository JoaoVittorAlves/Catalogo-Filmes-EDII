#!/usr/bin/env python3
"""
Gera a BASE GRANDE do Explorador de Mapas a partir do Wikidata.

Para cada categoria, consulta o serviço SPARQL público do Wikidata e baixa
locais do Brasil com coordenadas, descrição em português, município, estado,
uma imagem do Wikimedia Commons e o número de artigos na Wikipédia
(sitelinks), usado para calcular a RELEVÂNCIA (que define a altura do nó
na Skip List).

Uso:
    python3 scripts/gerar_base_wikidata.py                # limite padrão por categoria
    python3 scripts/gerar_base_wikidata.py --limite 3000  # mais locais
    python3 scripts/gerar_base_wikidata.py --so-com-imagem

Saída:
    dados/locais.js    (carregado automaticamente pelo index.html)
    dados/locais.json  (mesmo conteúdo, para inspeção ou outros usos)

Requer apenas a biblioteca padrão do Python 3.8+ e acesso à internet.
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ENDPOINT = "https://query.wikidata.org/sparql"
AGENTE = "ExploradorDeMapas/1.0 (projeto academico de estruturas de dados)"

# categoria da aplicação -> classe do Wikidata (instance of / subclass of)
CATEGORIAS = {
    "cidade":    "Q3184121",  # município do Brasil
    "praia":     "Q40080",    # praia
    "museu":     "Q33506",    # museu
    "parque":    "Q22698",    # parque
    "monumento": "Q4989906",  # monumento
    "igreja":    "Q16970",    # edifício de igreja
    "cachoeira": "Q34038",    # cachoeira
    "teatro":    "Q24354",    # teatro (edifício)
    "forte":     "Q57821",    # fortificação
    "ilha":      "Q23442",    # ilha
}

# Estados brasileiros: rótulo -> sigla
UF = {
    "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM", "Bahia": "BA",
    "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES", "Goiás": "GO",
    "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Minas Gerais": "MG",
    "Pará": "PA", "Paraíba": "PB", "Paraná": "PR", "Pernambuco": "PE", "Piauí": "PI",
    "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS",
    "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC", "São Paulo": "SP",
    "Sergipe": "SE", "Tocantins": "TO",
}

CONSULTA = """
SELECT ?item ?itemLabel ?itemDescription ?coord ?imagem ?municipioLabel ?estadoLabel ?sitelinks WHERE {
  ?item wdt:P31/wdt:P279* wd:%(classe)s ;
        wdt:P17 wd:Q155 ;
        wdt:P625 ?coord ;
        wikibase:sitelinks ?sitelinks .
  %(filtro_imagem)s
  OPTIONAL { ?item wdt:P131 ?municipio . }
  OPTIONAL {
    { ?item wdt:P131 ?estado . } UNION { ?item wdt:P131/wdt:P131 ?estado . }
    ?estado wdt:P31 wd:Q485258 .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". }
}
ORDER BY DESC(?sitelinks)
LIMIT %(limite)d
"""


def consultar(sparql, tentativas=4):
    url = ENDPOINT + "?" + urllib.parse.urlencode({"query": sparql, "format": "json"})
    requisicao = urllib.request.Request(url, headers={"User-Agent": AGENTE, "Accept": "application/sparql-results+json"})
    for tentativa in range(1, tentativas + 1):
        try:
            with urllib.request.urlopen(requisicao, timeout=90) as resposta:
                return json.load(resposta)["results"]["bindings"]
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as erro:
            espera = 5 * tentativa
            print(f"    tentativa {tentativa} falhou ({erro}); nova tentativa em {espera}s", file=sys.stderr)
            time.sleep(espera)
    return []


def valor(linha, campo):
    return linha.get(campo, {}).get("value")


def converter_coordenada(texto):
    # formato do Wikidata: "Point(longitude latitude)"
    lon, lat = texto.replace("Point(", "").replace(")", "").split()
    return float(lat), float(lon)


def miniatura(url_imagem, largura=640):
    if not url_imagem:
        return None
    url = url_imagem.replace("http://", "https://")
    return f"{url}?width={largura}"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limite", type=int, default=1500, help="máximo de locais por categoria (padrão 1500)")
    parser.add_argument("--so-com-imagem", action="store_true", help="manter apenas locais que têm foto")
    parser.add_argument("--saida", default=os.path.join(os.path.dirname(__file__), "..", "dados"))
    args = parser.parse_args()

    filtro_imagem = "?item wdt:P18 ?imagem ." if args.so_com_imagem else "OPTIONAL { ?item wdt:P18 ?imagem . }"
    locais = {}

    for categoria, classe in CATEGORIAS.items():
        print(f"Consultando {categoria} ({classe})…")
        linhas = consultar(CONSULTA % {"classe": classe, "limite": args.limite, "filtro_imagem": filtro_imagem})
        novos = 0
        for linha in linhas:
            qid = valor(linha, "item").rsplit("/", 1)[-1]
            if qid in locais:
                continue  # várias linhas por item (várias imagens/municípios) ou já em outra categoria
            nome = valor(linha, "itemLabel")
            if not nome or nome == qid:
                continue  # sem rótulo em português/inglês
            lat, lon = converter_coordenada(valor(linha, "coord"))
            estado = valor(linha, "estadoLabel") or ""
            municipio = valor(linha, "municipioLabel") or ""
            if categoria == "cidade":
                municipio = nome
            locais[qid] = {
                "nome": nome,
                "categoria": categoria,
                "cidade": "" if municipio in UF else municipio,
                "uf": UF.get(estado, ""),
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "sitelinks": int(valor(linha, "sitelinks") or 0),
                "descricao": valor(linha, "itemDescription") or "",
                "imagem": miniatura(valor(linha, "imagem")),
                "fonte": f"https://www.wikidata.org/wiki/{qid}",
            }
            novos += 1
        print(f"  {novos} locais novos")
        time.sleep(2)  # gentileza com o servidor público

    if not locais:
        print("Nenhum dado obtido. Verifique a conexão e tente novamente.", file=sys.stderr)
        sys.exit(1)

    # Relevância em [0, 1]: log(1 + sitelinks) normalizado pelo máximo da base
    maximo = max(math.log1p(l["sitelinks"]) for l in locais.values()) or 1
    registros = []
    for l in locais.values():
        l["relevancia"] = round(math.log1p(l.pop("sitelinks")) / maximo, 4)
        registros.append(l)

    os.makedirs(args.saida, exist_ok=True)
    caminho_json = os.path.join(args.saida, "locais.json")
    caminho_js = os.path.join(args.saida, "locais.js")
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False)
    with open(caminho_js, "w", encoding="utf-8") as f:
        f.write("// Arquivo gerado por scripts/gerar_base_wikidata.py — não editar à mão.\n")
        f.write("// Dados: Wikidata (CC0). Imagens: Wikimedia Commons (licenças individuais).\n")
        f.write("self.LOCAIS_WIKIDATA = ")
        json.dump(registros, f, ensure_ascii=False)
        f.write(";\n")
    com_imagem = sum(1 for r in registros if r["imagem"])
    print(f"\n{len(registros)} locais gravados ({com_imagem} com imagem).")
    print(f"  {os.path.normpath(caminho_js)}\n  {os.path.normpath(caminho_json)}")


if __name__ == "__main__":
    main()
