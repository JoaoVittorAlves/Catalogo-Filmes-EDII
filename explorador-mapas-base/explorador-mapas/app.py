from pathlib import Path
import json

from flask import Flask, jsonify, render_template, request

from modelos.local import Local
from estruturas.lista_mov_inicio import ListaMovimentacaoInicio
from estruturas.skip_list import SkipList
from estruturas.splay_tree import SplayTree


BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)


def carregar_locais():
    caminho = BASE_DIR / "dados" / "locais.json"

    with open(caminho, "r", encoding="utf-8") as arquivo:
        dados = json.load(arquivo)

    return [Local(**item) for item in dados]


LOCAIS = carregar_locais()

# Estrutura linear: categorias exploradas pelo usuário.
categorias = ListaMovimentacaoInicio()

# Estrutura de exploração: locais ordenados por uma chave.
skip_list = SkipList(max_nivel=4)

# Estrutura hierárquica: locais acessados.
splay_tree = SplayTree()

for local in LOCAIS:
    if categorias.buscar(local.categoria) is None:
        categorias.inserir(local.categoria)

    skip_list.inserir(local.id, local)

    # A árvore começa com todos os locais.
    splay_tree.inserir(local.id, local)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/locais")
def api_locais():
    nivel = request.args.get("nivel", default=0, type=int)

    locais = skip_list.listar_nivel(nivel)

    return jsonify({
        "nivel": nivel,
        "locais": [local.to_dict() for local in locais],
    })


@app.route("/api/categorias")
def api_categorias():
    return jsonify({
        "categorias": categorias.listar()
    })


@app.route("/api/categoria/<categoria>")
def api_categoria(categoria):
    resultado = categorias.acessar(categoria)

    if resultado is None:
        return jsonify({"erro": "Categoria não encontrada"}), 404

    locais = [
        local for local in LOCAIS
        if local.categoria == categoria
    ]

    return jsonify({
        "categoria": categoria,
        "categorias": categorias.listar(),
        "locais": [local.to_dict() for local in locais],
    })


@app.route("/api/local/<int:local_id>")
def api_local(local_id):
    local = next(
        (item for item in LOCAIS if item.id == local_id),
        None,
    )

    if local is None:
        return jsonify({"erro": "Local não encontrado"}), 404

    # Acesso à Splay Tree:
    # o local acessado é levado para a raiz.
    resultado = splay_tree.buscar(local_id)

    return jsonify({
        "local": resultado.to_dict(),
        "splay": splay_tree.estrutura(),
    })


@app.route("/api/splay")
def api_splay():
    return jsonify({
        "splay": splay_tree.estrutura()
    })


@app.route("/api/skip-list")
def api_skip_list():
    return jsonify({
        "niveis": skip_list.estrutura(),
        "nivel_atual": skip_list.nivel_atual,
    })


if __name__ == "__main__":
    app.run(debug=True)
