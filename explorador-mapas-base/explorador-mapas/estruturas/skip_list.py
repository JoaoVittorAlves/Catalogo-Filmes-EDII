import random


class NoSkipList:
    def __init__(self, chave, valor, nivel):
        self.chave = chave
        self.valor = valor
        self.forward = [None] * (nivel + 1)


class SkipList:
    """
    Skip List ordenada pela chave.

    Na aplicação, a chave é (distância até o ponto de referência, id).

    Modificações em relação à versão clássica:
    1. inserir() aceita um nível fixo. A aplicação usa isso para definir o
       nível pela relevância do local (e não por sorteio), de modo que os
       níveis superiores funcionem como um "zoom" com os locais mais
       importantes.
    2. buscar_intervalo() devolve os elementos com chave entre dois limites,
       percorrendo apenas o nível escolhido pelo usuário, e registra o
       caminho percorrido para a visualização.
    """

    def __init__(self, max_nivel=4, probabilidade=0.5):
        self.max_nivel = max_nivel
        self.probabilidade = probabilidade
        self.nivel_atual = 0
        self.tamanho = 0
        self.cabeca = NoSkipList(None, None, max_nivel)

    def _gerar_nivel(self):
        nivel = 0

        while (
            random.random() < self.probabilidade
            and nivel < self.max_nivel
        ):
            nivel += 1

        return nivel

    def inserir(self, chave, valor, nivel=None):
        """
        Insere o par (chave, valor).

        MODIFICAÇÃO: se `nivel` for informado, ele é usado no lugar do
        sorteio. Sem `nivel`, o comportamento é o clássico.
        """
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

        if nivel is None:
            novo_nivel = self._gerar_nivel()
        else:
            novo_nivel = max(0, min(nivel, self.max_nivel))

        if novo_nivel > self.nivel_atual:
            for i in range(self.nivel_atual + 1, novo_nivel + 1):
                anterior[i] = self.cabeca

            self.nivel_atual = novo_nivel

        novo = NoSkipList(chave, valor, novo_nivel)

        for i in range(novo_nivel + 1):
            novo.forward[i] = anterior[i].forward[i]
            anterior[i].forward[i] = novo

        self.tamanho += 1

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

    def buscar_intervalo(self, minimo, maximo, nivel=0):
        """
        MODIFICAÇÃO: busca por intervalo no nível escolhido.

        1. Desce pelos níveis (do mais alto até `nivel`) procurando o
           último nó com chave < minimo, como na busca clássica: O(log n).
        2. A partir daí, percorre apenas o nível `nivel` enquanto a chave
           for <= maximo.

        `minimo` e `maximo` são comparados com o primeiro campo da chave
        (a distância). Retorna (valores, caminho), onde caminho é a lista
        de chaves visitadas durante a descida.
        """
        nivel = max(0, min(nivel, self.nivel_atual))
        caminho = []
        atual = self.cabeca

        for i in range(self.nivel_atual, nivel - 1, -1):
            while (
                atual.forward[i] is not None
                and atual.forward[i].chave[0] < minimo
            ):
                atual = atual.forward[i]
                caminho.append(atual.chave)

        resultado = []
        atual = atual.forward[nivel]

        while atual is not None and atual.chave[0] <= maximo:
            resultado.append(atual.valor)
            atual = atual.forward[nivel]

        return resultado, caminho

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

    def estrutura(self, limite=None):
        """
        Representação útil para a interface/apresentação.

        Se `limite` for informado, cada nível traz no máximo esse número de
        elementos, além do total do nível.
        """
        niveis = []

        for nivel in range(self.nivel_atual, -1, -1):
            elementos = []
            total = 0
            atual = self.cabeca.forward[nivel]

            while atual:
                if limite is None or total < limite:
                    elementos.append({
                        "chave": list(atual.chave)
                        if isinstance(atual.chave, tuple)
                        else atual.chave,
                        "nome": getattr(atual.valor, "nome", str(atual.valor)),
                    })
                total += 1
                atual = atual.forward[nivel]

            niveis.append({
                "nivel": nivel,
                "total": total,
                "elementos": elementos,
            })

        return niveis
