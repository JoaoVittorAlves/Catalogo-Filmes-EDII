class NoSplay:
    def __init__(self, chave, valor):
        self.chave = chave
        self.valor = valor
        self.esquerda = None
        self.direita = None


class SplayTree:
    """
    Árvore Afunilada (Splay Tree).

    Uma busca bem-sucedida reorganiza a árvore para colocar
    o elemento acessado na raiz.
    """

    def __init__(self):
        self.raiz = None

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

        if chave < raiz.chave:
            if raiz.esquerda is None:
                return raiz

            if chave < raiz.esquerda.chave:
                raiz.esquerda.esquerda = self._splay(
                    raiz.esquerda.esquerda, chave
                )
                raiz = self._rotacao_direita(raiz)

            elif chave > raiz.esquerda.chave:
                raiz.esquerda.direita = self._splay(
                    raiz.esquerda.direita, chave
                )

                if raiz.esquerda.direita is not None:
                    raiz.esquerda = self._rotacao_esquerda(raiz.esquerda)

            if raiz.esquerda is None:
                return raiz

            return self._rotacao_direita(raiz)

        else:
            if raiz.direita is None:
                return raiz

            if chave > raiz.direita.chave:
                raiz.direita.direita = self._splay(
                    raiz.direita.direita, chave
                )
                raiz = self._rotacao_esquerda(raiz)

            elif chave < raiz.direita.chave:
                raiz.direita.esquerda = self._splay(
                    raiz.direita.esquerda, chave
                )

                if raiz.direita.esquerda is not None:
                    raiz.direita = self._rotacao_direita(raiz.direita)

            if raiz.direita is None:
                return raiz

            return self._rotacao_esquerda(raiz)

    def inserir(self, chave, valor):
        if self.raiz is None:
            self.raiz = NoSplay(chave, valor)
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

    def buscar(self, chave):
        if self.raiz is None:
            return None

        self.raiz = self._splay(self.raiz, chave)

        if self.raiz.chave == chave:
            return self.raiz.valor

        return None

    def _para_dict(self, no):
        if no is None:
            return None

        return {
            "chave": no.chave,
            "nome": getattr(no.valor, "nome", str(no.valor)),
            "esquerda": self._para_dict(no.esquerda),
            "direita": self._para_dict(no.direita),
        }

    def estrutura(self):
        return self._para_dict(self.raiz)
