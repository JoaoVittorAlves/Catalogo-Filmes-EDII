"""
Gera dados/locais.json a partir do Wikidata (https://www.wikidata.org).

Para cada estado do Nordeste, consulta o serviço SPARQL do Wikidata em
busca de locais de certos tipos (praias, museus, igrejas, ...) que tenham
coordenadas. O número de sitelinks (quantas Wikipédias têm artigo sobre o
local) é guardado como "relevancia" e define o nível do local na Skip List.

Uso (a partir da pasta explorador-mapas):
    python scripts/baixar_dados.py

Dados do Wikidata: licença CC0. Imagens: Wikimedia Commons (cada imagem
tem a sua licença, indicada na página do arquivo no Commons).
"""

import json
import ssl
import time
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path


URL_SPARQL = "https://query.wikidata.org/sparql"
USER_AGENT = "ExploradorMapas/1.0 (trabalho academico de Estrutura de Dados II)"

SAIDA = Path(__file__).resolve().parent.parent / "dados" / "locais.json"

ESTADOS = {
    "Q38088": "PB",
    "Q40942": "PE",
    "Q40430": "BA",
    "Q40123": "CE",
    "Q43255": "RN",
    "Q40885": "AL",
    "Q43783": "SE",
    "Q42722": "PI",
    "Q42362": "MA",
}

# Tipo no Wikidata (P31) -> categoria usada na aplicação.
TIPOS = {
    "Q40080": "Praias",                 # praia
    "Q33506": "Museus e cultura",       # museu
    "Q207694": "Museus e cultura",      # museu de arte
    "Q24354": "Museus e cultura",       # teatro (edifício)
    "Q22698": "Parques",                # parque
    "Q46169": "Parques",                # parque nacional
    "Q174782": "Praças",                # praça
    "Q4989906": "Monumentos históricos",  # monumento
    "Q1785071": "Monumentos históricos",  # forte
    "Q57821": "Monumentos históricos",    # fortificação
    "Q16970": "Igrejas",                # igreja (edifício)
    "Q2977": "Igrejas",                 # catedral
    "Q108325": "Igrejas",               # capela
    "Q39715": "Pontos turísticos",      # farol
    "Q570116": "Pontos turísticos",     # atração turística
    "Q34038": "Natureza",               # cachoeira
    "Q23442": "Natureza",               # ilha
    "Q23397": "Natureza",               # lago
    "Q187223": "Natureza",              # laguna
}

CONSULTA = """
SELECT ?item ?itemLabel ?itemDescription ?tipo ?coord ?cidadeLabel ?img ?links
WHERE {
  VALUES ?tipo { %(tipos)s }
  ?item wdt:P31 ?tipo ;
        wdt:P625 ?coord ;
        wdt:P131* wd:%(estado)s ;
        wikibase:sitelinks ?links .
  OPTIONAL { ?item wdt:P131 ?cidade . }
  OPTIONAL { ?item wdt:P18 ?img . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}
"""


def contexto_ssl():
    # Usa os certificados do pacote certifi, se instalado. Evita erros
    # quando o repositório de certificados do sistema está desatualizado.
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def consultar(estado_qid):
    tipos = " ".join(f"wd:{qid}" for qid in TIPOS)
    consulta = CONSULTA % {"tipos": tipos, "estado": estado_qid}

    url = URL_SPARQL + "?" + urllib.parse.urlencode({
        "query": consulta,
        "format": "json",
    })
    requisicao = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    with urllib.request.urlopen(
        requisicao, timeout=120, context=contexto_ssl()
    ) as resposta:
        return json.load(resposta)["results"]["bindings"]


def valor(linha, campo, padrao=""):
    return linha.get(campo, {}).get("value", padrao)


def converter_coordenada(texto):
    # Formato do Wikidata: "Point(longitude latitude)"
    longitude, latitude = texto.replace("Point(", "").rstrip(")").split()
    return float(latitude), float(longitude)


def montar_local(linha, uf):
    qid = valor(linha, "item").rsplit("/", 1)[-1]
    nome = valor(linha, "itemLabel")

    # Sem rótulo em pt/en o serviço devolve o próprio QID: descartamos.
    if not nome or nome == qid:
        return None

    latitude, longitude = converter_coordenada(valor(linha, "coord"))
    categoria = TIPOS[valor(linha, "tipo").rsplit("/", 1)[-1]]
    cidade = valor(linha, "cidadeLabel")
    descricao = valor(linha, "itemDescription") or f"{categoria} em {cidade} - {uf}."

    imagem = valor(linha, "img")
    if imagem:
        imagem = imagem.replace("http://", "https://") + "?width=600"

    return {
        "wikidata": qid,
        "nome": nome,
        "categoria": categoria,
        "cidade": cidade,
        "estado": uf,
        "latitude": round(latitude, 5),
        "longitude": round(longitude, 5),
        "descricao": descricao[:1].upper() + descricao[1:],
        "imagem": imagem,
        "relevancia": int(valor(linha, "links", "0")),
    }


def main():
    locais = {}

    for estado_qid, uf in ESTADOS.items():
        print(f"Consultando {uf}...", end=" ", flush=True)
        linhas = consultar(estado_qid)
        novos = 0

        for linha in linhas:
            local = montar_local(linha, uf)

            # A consulta repete o item quando ele tem mais de uma cidade,
            # imagem ou tipo: ficamos com a primeira ocorrência.
            if local is None or local["wikidata"] in locais:
                continue

            locais[local["wikidata"]] = local
            novos += 1

        print(f"{novos} locais")
        time.sleep(1)  # Evita sobrecarregar o serviço público.

    resultado = sorted(locais.values(), key=lambda l: (l["estado"], l["nome"]))

    for indice, local in enumerate(resultado, start=1):
        local["id"] = indice
        del local["wikidata"]

    with open(SAIDA, "w", encoding="utf-8") as arquivo:
        json.dump(resultado, arquivo, ensure_ascii=False, indent=1)

    print(f"\nTotal: {len(resultado)} locais salvos em {SAIDA}")
    print("Por estado:", dict(Counter(l["estado"] for l in resultado)))
    print("Por categoria:", dict(Counter(l["categoria"] for l in resultado)))


if __name__ == "__main__":
    main()
