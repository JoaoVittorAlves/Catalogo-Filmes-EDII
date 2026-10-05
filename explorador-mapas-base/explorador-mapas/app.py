from pathlib import Path
import json

from flask import Flask, jsonify, render_template, request

from modelos.local import Local
from estruturas.lista_mov_inicio import ListaMovimentacaoInicio
from estruturas.skip_list import SkipList
from estruturas.splay_tree import SplayTree


BASE_DIR = Path(__file__).resolve().parent

MAX_NIVEL = 4
CAPACIDADE_SPLAY = 15

# Ponto de referência inicial: centro de João Pessoa.
REFERENCIA_PADRAO = (-7.115, -34.863)

app = Flask(__name__)


def carregar_locais():
    caminho = BASE_DIR / "dados" / "locais.json"

    with open(caminho, "r", encoding="utf-8") as arquivo:
        dados = json.load(arquivo)

    return [Local(**item) for item in dados]


def definir_niveis_por_relevancia(locais):
    """
    MODIFICAÇÃO DA SKIP LIST: o nível de cada local vem da relevância.

    Os locais são ordenados do mais relevante para o menos relevante.
    Mantemos a mesma proporção da Skip List clássica com p = 1/2:
    metade dos locais chega ao nível 1, um quarto ao nível 2, um oitavo
    ao nível 3 e um dezesseis avos ao nível 4. A diferença é que os que
    sobem são os mais relevantes, e não os sorteados.
    """
    ordenados = sorted(locais, key=lambda l: (-l.relevancia, l.id))
    total = len(ordenados)

    for posicao, local in enumerate(ordenados):
        nivel = 0
        limite = total / 2

        while posicao < limite and nivel < MAX_NIVEL:
            nivel += 1
            limite /= 2

        local.nivel_skip = nivel


def construir_skip_list(latitude, longitude):
    """
    Cria a Skip List com chave (distância até a referência, id).
    É chamada novamente sempre que o usuário muda o ponto de referência.
    """
    nova = SkipList(max_nivel=MAX_NIVEL)

    for local in LOCAIS:
        distancia = round(local.distancia_km(latitude, longitude), 2)
        nova.inserir((distancia, local.id), local, nivel=local.nivel_skip)

    return nova


LOCAIS = carregar_locais()
definir_niveis_por_relevancia(LOCAIS)

# Estrutura linear: categorias exploradas pelo usuário.
categorias = ListaMovimentacaoInicio()

for local in LOCAIS:
    categorias.inserir(local.categoria)

# Estrutura de exploração: locais ordenados pela distância à referência.
referencia = REFERENCIA_PADRAO
skip_list = construir_skip_list(*referencia)

# Estrutura hierárquica: histórico dos locais acessados (começa vazia).
splay_tree = SplayTree(capacidade=CAPACIDADE_SPLAY)


def local_com_distancia(local):
    dados = local.to_dict()
    dados["distancia"] = round(local.distancia_km(*referencia), 1)
    return dados


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/locais")
def api_locais():
    nivel = request.args.get("nivel", default=0, type=int)
    raio_min = request.args.get("raio_min", default=0, type=float)
    raio = request.args.get("raio", default=10000, type=float)
    categoria = request.args.get("categoria", default="")
    busca = request.args.get("busca", default="").strip().lower()

    # Busca por intervalo de distância no nível escolhido.
    locais, caminho = skip_list.buscar_intervalo(raio_min, raio, nivel)

    if categoria:
        locais = [l for l in locais if l.categoria == categoria]

    if busca:
        locais = [l for l in locais if busca in l.nome.lower()]

    return jsonify({
        "nivel": min(nivel, skip_list.nivel_atual),
        "total": len(locais),
        "caminho": [list(chave) for chave in caminho],
        "locais": [local_com_distancia(l) for l in locais],
    })


@app.route("/api/referencia", methods=["POST"])
def api_referencia():
    global referencia, skip_list

    dados = request.get_json()
    referencia = (float(dados["lat"]), float(dados["lon"]))
    skip_list = construir_skip_list(*referencia)

    return jsonify({"referencia": referencia})


@app.route("/api/categorias")
def api_categorias():
    return jsonify({
        "categorias": categorias.estrutura()
    })


@app.route("/api/categoria/<categoria>")
def api_categoria(categoria):
    resultado = categorias.acessar(categoria)

    if resultado is None:
        return jsonify({"erro": "Categoria não encontrada"}), 404

    return jsonify({
        "categoria": categoria,
        "categorias": categorias.estrutura(),
    })


@app.route("/api/local/<int:local_id>")
def api_local(local_id):
    local = next(
        (item for item in LOCAIS if item.id == local_id),
        None,
    )

    if local is None:
        return jsonify({"erro": "Local não encontrado"}), 404

    # Acesso à Splay Tree: o local é buscado (ou inserido) e vai para a raiz.
    splay_tree.acessar(local.id, local)
    removido = splay_tree.ultimo_removido

    return jsonify({
        "local": local_com_distancia(local),
        "splay": splay_tree.estrutura(),
        "rotacoes": splay_tree.ultimas_rotacoes,
        "removido": removido.nome if removido else None,
    })


@app.route("/api/splay")
def api_splay():
    return jsonify({
        "splay": splay_tree.estrutura()
    })


@app.route("/api/skip-list")
def api_skip_list():
    return jsonify({
        "niveis": skip_list.estrutura(limite=30),
        "nivel_atual": skip_list.nivel_atual,
        "referencia": referencia,
    })


if __name__ == "__main__":
    app.run(debug=True)
