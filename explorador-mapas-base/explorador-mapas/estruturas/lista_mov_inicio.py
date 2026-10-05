class NoLista:
    def __init__(self, valor):
        self.valor = valor
        self.proximo = None
        self.acessos = 0


class ListaMovimentacaoInicio:
    """
    Lista encadeada com movimentação ao início.

    Quando um elemento existente é acessado, ele é removido
    de sua posição atual e colocado no início da lista.
    Cada nó também conta quantas vezes foi acessado.
    """

    def __init__(self):
        self.inicio = None

    def inserir(self, valor):
        if self.buscar(valor) is not None:
            return False

        novo = NoLista(valor)
        novo.proximo = self.inicio
        self.inicio = novo
        return True

    def buscar(self, valor):
        atual = self.inicio

        while atual:
            if atual.valor == valor:
                return atual.valor
            atual = atual.proximo

        return None

    def acessar(self, valor):
        """Busca, incrementa o contador e move o elemento para o início."""
        anterior = None
        atual = self.inicio

        while atual:
            if atual.valor == valor:
                atual.acessos += 1

                if anterior is not None:
                    anterior.proximo = atual.proximo
                    atual.proximo = self.inicio
                    self.inicio = atual

                return atual.valor

            anterior = atual
            atual = atual.proximo

        return None

    def listar(self):
        valores = []
        atual = self.inicio

        while atual:
            valores.append(atual.valor)
            atual = atual.proximo

        return valores

    def estrutura(self):
        """Valores e contadores, na ordem atual da lista."""
        itens = []
        atual = self.inicio

        while atual:
            itens.append({"valor": atual.valor, "acessos": atual.acessos})
            atual = atual.proximo

        return itens

    def __len__(self):
        contador = 0
        atual = self.inicio

        while atual:
            contador += 1
            atual = atual.proximo

        return contador
