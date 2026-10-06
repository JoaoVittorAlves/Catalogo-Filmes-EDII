import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from estruturas.lista_mov_inicio import ListaMovimentacaoInicio
from estruturas.skip_list import SkipList
from estruturas.splay_tree import NoSplay, SplayTree


class TestListaMovimentacaoInicio(unittest.TestCase):
    def setUp(self):
        self.lista = ListaMovimentacaoInicio()
        for valor in ["A", "B", "C", "D"]:
            self.lista.inserir(valor)
        # Inserção no início: D, C, B, A

    def test_insercao_sem_duplicatas(self):
        self.assertFalse(self.lista.inserir("A"))
        self.assertEqual(len(self.lista), 4)

    def test_acesso_move_para_inicio(self):
        self.lista.acessar("B")
        self.assertEqual(self.lista.listar(), ["B", "D", "C", "A"])

    def test_ordem_dos_demais_se_mantem(self):
        self.lista.acessar("A")
        self.lista.acessar("C")
        self.assertEqual(self.lista.listar(), ["C", "A", "D", "B"])

    def test_contador_de_acessos(self):
        self.lista.acessar("C")
        self.lista.acessar("C")
        self.lista.acessar("A")
        contadores = {i["valor"]: i["acessos"] for i in self.lista.estrutura()}
        self.assertEqual(contadores, {"A": 1, "B": 0, "C": 2, "D": 0})

    def test_acessar_inexistente(self):
        self.assertIsNone(self.lista.acessar("Z"))


class TestSkipList(unittest.TestCase):
    def setUp(self):
        random.seed(42)
        self.skip = SkipList(max_nivel=4)
        self.chaves = [(round(random.uniform(0, 500), 2), i) for i in range(300)]
        for chave in self.chaves:
            self.skip.inserir(chave, chave)

    def test_nivel_zero_ordenado_e_completo(self):
        nivel0 = self.skip.listar_nivel(0)
        self.assertEqual(nivel0, sorted(self.chaves))
        self.assertEqual(self.skip.tamanho, len(self.chaves))

    def test_cada_nivel_e_subconjunto_do_anterior(self):
        for nivel in range(1, self.skip.nivel_atual + 1):
            acima = set(self.skip.listar_nivel(nivel))
            abaixo = set(self.skip.listar_nivel(nivel - 1))
            self.assertTrue(acima <= abaixo)

    def test_buscar(self):
        for chave in self.chaves[:50]:
            self.assertEqual(self.skip.buscar(chave), chave)
        self.assertIsNone(self.skip.buscar((-1, -1)))

    def test_nivel_fixo(self):
        skip = SkipList(max_nivel=4)
        skip.inserir((1, 1), "a", nivel=3)
        skip.inserir((2, 2), "b", nivel=0)
        self.assertEqual(skip.listar_nivel(3), ["a"])
        self.assertEqual(skip.listar_nivel(0), ["a", "b"])

    def test_buscar_intervalo_igual_forca_bruta(self):
        for nivel in range(self.skip.nivel_atual + 1):
            do_nivel = self.skip.listar_nivel(nivel)
            for minimo, maximo in [(0, 50), (100, 250), (499, 1000), (0, 0)]:
                esperado = [c for c in do_nivel if minimo <= c[0] <= maximo]
                obtido, _ = self.skip.buscar_intervalo(minimo, maximo, nivel)
                self.assertEqual(obtido, esperado)


def base(chave):
    """Base de teste: todo local existe e vale "local <chave>"."""
    return f"local {chave}"


class TestSplayTree(unittest.TestCase):
    def test_acessado_vai_para_raiz(self):
        arvore = SplayTree()
        for chave in [50, 30, 70, 20, 40, 60, 80]:
            arvore.acessar(chave, base)
        for chave in [20, 80, 40, 50]:
            arvore.acessar(chave, base)
            self.assertEqual(arvore.raiz.chave, chave)

    def test_propriedade_de_arvore_de_busca(self):
        random.seed(7)
        arvore = SplayTree()
        for _ in range(200):
            arvore.acessar(random.randint(1, 60), base)
        chaves = arvore.em_ordem()
        self.assertEqual(chaves, sorted(set(chaves)))

    def test_capacidade_respeitada(self):
        random.seed(3)
        arvore = SplayTree(capacidade=10)
        for _ in range(300):
            chave = random.randint(1, 100)
            arvore.acessar(chave, base)
            self.assertLessEqual(arvore.tamanho, 10)
            self.assertEqual(len(arvore.em_ordem()), arvore.tamanho)
            self.assertEqual(arvore.raiz.chave, chave)

    def test_contador_de_acessos(self):
        arvore = SplayTree()
        for chave in [1, 2, 1, 1]:
            arvore.acessar(chave, base)
        self.assertEqual(arvore.raiz.chave, 1)
        self.assertEqual(arvore.raiz.acessos, 3)

    def test_cache_so_consulta_a_base_na_falha(self):
        consultas = []

        def base_contada(chave):
            consultas.append(chave)
            return f"local {chave}"

        arvore = SplayTree()
        arvore.acessar(5, base_contada)
        self.assertEqual(arvore.ultima_origem, "base")
        arvore.acessar(8, base_contada)
        arvore.acessar(5, base_contada)
        self.assertEqual(arvore.ultima_origem, "cache")
        # A base foi consultada só nos dois primeiros acessos.
        self.assertEqual(consultas, [5, 8])

    def test_local_inexistente_nao_entra_na_arvore(self):
        arvore = SplayTree()
        arvore.acessar(1, base)
        self.assertIsNone(arvore.acessar(99, lambda chave: None))
        self.assertEqual(arvore.em_ordem(), [1])

    def test_registro_zig_zig(self):
        arvore = SplayTree()
        for chave in [1, 2, 3]:
            arvore.acessar(chave, base)
        # Árvore em "linha": 3 -> 2 -> 1. Um único passo zig-zig.
        arvore.acessar(1, base)
        self.assertEqual(arvore.ultimas_rotacoes, ["zig-zig"])

    def test_registro_zig_e_zig_zag(self):
        # Árvore montada à mão:   3
        #                        /
        #                       1
        #                        \
        #                         2
        arvore = SplayTree()
        arvore.raiz = NoSplay(3, "c")
        arvore.raiz.esquerda = NoSplay(1, "a")
        arvore.raiz.esquerda.direita = NoSplay(2, "b")
        arvore.tamanho = 3

        # 2 e o pai (1) estão em lados opostos: um único zig-zag.
        arvore.buscar(2)
        self.assertEqual(arvore.ultimas_rotacoes, ["zig-zag"])
        self.assertEqual(arvore.raiz.chave, 2)

        # Agora 1 é filho da raiz: um único zig.
        arvore.buscar(1)
        self.assertEqual(arvore.ultimas_rotacoes, ["zig"])


if __name__ == "__main__":
    unittest.main()
