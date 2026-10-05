class NoSplay:
    def __init__(self, chave, valor):
        self.chave = chave
        self.valor = valor
        self.esquerda = None
        self.direita = None
        self.acessos = 1


class SplayTree:
    """
    Árvore Afunilada (Splay Tree) usada como histórico de locais acessados.

    Modificações em relação à versão clássica:
    1. A árvore começa vazia. acessar() busca o local e, se ele não
       estiver na árvore, o insere. Nos dois casos o local termina na
       raiz, e cada nó guarda quantas vezes foi acessado.
    2. A árvore tem capacidade limitada. Ao passar do limite, a folha
       mais profunda é removida: como o splay sobe os nós usados e
       empurra os pouco usados para baixo, essa folha aproxima o
       "menos recentemente usado".
    3. Os passos do último splay (zig, zig-zig, zig-zag) ficam
       registrados para a visualização.
    """

    def __init__(self, capacidade=None):
        self.raiz = None
        self.capacidade = capacidade
        self.tamanho = 0
        self.ultimas_rotacoes = []
        self.ultimo_removido = None

    def _rotacao_direita(self, x):
        y = x.esquerda
        x.esquerda = y.direita
        y.direita = x
        return y

    def _rotacao_esquerda(self, x):
        y = x.direita
        x.direita = y.esquerda
        y.esquerda = x
        return y

    def _splay(self, raiz, chave):
        if raiz is None or raiz.chave == chave:
            return raiz

        # Tipo do passo atual; vira zig-zig/zig-zag se houver rotação dupla.
        passo = "zig"

        if chave < raiz.chave:
            if raiz.esquerda is None:
                return raiz

            if chave < raiz.esquerda.chave:
                raiz.esquerda.esquerda = self._splay(
                    raiz.esquerda.esquerda, chave
                )
                raiz = self._rotacao_direita(raiz)
                passo = "zig-zig"

            elif chave > raiz.esquerda.chave:
                raiz.esquerda.direita = self._splay(
                    raiz.esquerda.direita, chave
                )

                if raiz.esquerda.direita is not None:
                    raiz.esquerda = self._rotacao_esquerda(raiz.esquerda)
                    passo = "zig-zag"

            if raiz.esquerda is None:
                # A segunda rotação não aconteceu: foi só uma (zig).
                self.ultimas_rotacoes.append("zig")
                return raiz

            self.ultimas_rotacoes.append(passo)
            return self._rotacao_direita(raiz)

        else:
            if raiz.direita is None:
                return raiz

            if chave > raiz.direita.chave:
                raiz.direita.direita = self._splay(
                    raiz.direita.direita, chave
                )
                raiz = self._rotacao_esquerda(raiz)
                passo = "zig-zig"

            elif chave < raiz.direita.chave:
                raiz.direita.esquerda = self._splay(
                    raiz.direita.esquerda, chave
                )

                if raiz.direita.esquerda is not None:
                    raiz.direita = self._rotacao_direita(raiz.direita)
                    passo = "zig-zag"

            if raiz.direita is None:
                self.ultimas_rotacoes.append("zig")
                return raiz

            self.ultimas_rotacoes.append(passo)
            return self._rotacao_esquerda(raiz)

    def inserir(self, chave, valor):
        self.ultimas_rotacoes = []

        if self.raiz is None:
            self.raiz = NoSplay(chave, valor)
            self.tamanho = 1
            return

        self.raiz = self._splay(self.raiz, chave)

        if self.raiz.chave == chave:
            self.raiz.valor = valor
            return

        novo = NoSplay(chave, valor)

        if chave < self.raiz.chave:
            novo.direita = self.raiz
            novo.esquerda = self.raiz.esquerda
            self.raiz.esquerda = None
        else:
            novo.esquerda = self.raiz
            novo.direita = self.raiz.direita
            self.raiz.direita = None

        self.raiz = novo
        self.tamanho += 1

    def buscar(self, chave):
        self.ultimas_rotacoes = []

        if self.raiz is None:
            return None

        self.raiz = self._splay(self.raiz, chave)

        if self.raiz.chave == chave:
            return self.raiz.valor

        return None

    def acessar(self, chave, valor):
        """
        MODIFICAÇÃO: registra o acesso a um local.

        - Se o local já está na árvore: splay + incrementa o contador.
        - Se não está: insere (a inserção também deixa o nó na raiz).
        - Se passar da capacidade: remove a folha mais profunda.
        """
        self.ultimo_removido = None

        if self.buscar(chave) is not None:
            self.raiz.acessos += 1
            return self.raiz.valor

        rotacoes_busca = self.ultimas_rotacoes
        self.inserir(chave, valor)
        self.ultimas_rotacoes = rotacoes_busca + self.ultimas_rotacoes

        if self.capacidade is not None and self.tamanho > self.capacidade:
            self._remover_folha_mais_profunda()

        return self.raiz.valor

    def _remover_folha_mais_profunda(self):
        """
        MODIFICAÇÃO: descarte do nó com menor chance de ser reacessado.

        Percorre a árvore guardando a folha de maior profundidade e o pai
        dela, e então desliga essa folha do pai. A raiz (recém-acessada)
        nunca é removida, pois há pelo menos dois nós quando isto é chamado.
        """
        mais_funda = None
        pai_mais_funda = None
        maior_profundidade = -1

        pilha = [(self.raiz, None, 0)]

        while pilha:
            no, pai, profundidade = pilha.pop()

            if no.esquerda is None and no.direita is None:
                if profundidade > maior_profundidade:
                    maior_profundidade = profundidade
                    mais_funda = no
                    pai_mais_funda = pai
                continue

            if no.direita is not None:
                pilha.append((no.direita, no, profundidade + 1))
            if no.esquerda is not None:
                pilha.append((no.esquerda, no, profundidade + 1))

        if pai_mais_funda is None:
            return

        if pai_mais_funda.esquerda is mais_funda:
            pai_mais_funda.esquerda = None
        else:
            pai_mais_funda.direita = None

        self.tamanho -= 1
        self.ultimo_removido = mais_funda.valor

    def em_ordem(self):
        """Chaves em ordem crescente (usado nos testes)."""
        chaves = []

        def percorrer(no):
            if no is None:
                return
            percorrer(no.esquerda)
            chaves.append(no.chave)
            percorrer(no.direita)

        percorrer(self.raiz)
        return chaves

    def _para_dict(self, no):
        if no is None:
            return None

        return {
            "chave": no.chave,
            "nome": getattr(no.valor, "nome", str(no.valor)),
            "acessos": no.acessos,
            "esquerda": self._para_dict(no.esquerda),
            "direita": self._para_dict(no.direita),
        }

    def estrutura(self):
        return self._para_dict(self.raiz)
