import random


class NoSkipList:
    def __init__(self, chave, valor, nivel):
        self.chave = chave
        self.valor = valor
        self.forward = [None] * (nivel + 1)


class SkipList:
    """
    Skip List ordenada pela chave.

    A aplicação usa os níveis para controlar a quantidade de
    locais apresentada durante a exploração.
    """

    def __init__(self, max_nivel=4, probabilidade=0.5):
        self.max_nivel = max_nivel
        self.probabilidade = probabilidade
        self.nivel_atual = 0
        self.cabeca = NoSkipList(None, None, max_nivel)

    def _gerar_nivel(self):
        nivel = 0

        while (
            random.random() < self.probabilidade
            and nivel < self.max_nivel
        ):
            nivel += 1

        return nivel

    def inserir(self, chave, valor):
        anterior = [None] * (self.max_nivel + 1)
        atual = self.cabeca

        for i in range(self.nivel_atual, -1, -1):
            while (
                atual.forward[i] is not None
                and atual.forward[i].chave < chave
            ):
                atual = atual.forward[i]

            anterior[i] = atual

        atual = atual.forward[0]

        if atual is not None and atual.chave == chave:
            atual.valor = valor
            return

        novo_nivel = self._gerar_nivel()

        if novo_nivel > self.nivel_atual:
            for i in range(self.nivel_atual + 1, novo_nivel + 1):
                anterior[i] = self.cabeca

            self.nivel_atual = novo_nivel

        novo = NoSkipList(chave, valor, novo_nivel)

        for i in range(novo_nivel + 1):
            novo.forward[i] = anterior[i].forward[i]
            anterior[i].forward[i] = novo

    def buscar(self, chave):
        atual = self.cabeca

        for i in range(self.nivel_atual, -1, -1):
            while (
                atual.forward[i] is not None
                and atual.forward[i].chave < chave
            ):
                atual = atual.forward[i]

        atual = atual.forward[0]

        if atual is not None and atual.chave == chave:
            return atual.valor

        return None

    def listar_nivel(self, nivel=0):
        """
        Retorna os valores que possuem ponteiro no nível solicitado.
        Nível 0 contém todos os elementos.
        """
        nivel = max(0, min(nivel, self.nivel_atual))

        resultado = []
        atual = self.cabeca.forward[nivel]

        while atual:
            resultado.append(atual.valor)
            atual = atual.forward[nivel]

        return resultado

    def estrutura(self):
        """Representação útil para a interface/apresentação."""
        niveis = []

        for nivel in range(self.nivel_atual, -1, -1):
            elementos = []
            atual = self.cabeca.forward[nivel]

            while atual:
                elementos.append({
                    "chave": atual.chave,
                    "nome": getattr(atual.valor, "nome", str(atual.valor)),
                })
                atual = atual.forward[nivel]

            niveis.append({
                "nivel": nivel,
                "elementos": elementos,
            })

        return niveis
