class NoSplay:
    def __init__(self, chave, valor):
        self.chave = chave
        self.valor = valor
        self.esquerda = None
        self.direita = None
        self.acessos = 1


class SplayTree:
    """
    Árvore Afunilada (Splay Tree) utilizada como cache e histórico
    adaptativo dos locais acessados pelo usuário.

    Adaptações para o Explorador de Mapas:

    1. A árvore começa vazia.
    2. Quando um local é acessado:
       - se já estiver na árvore (acerto no cache), é realizado o
         Splay, ele vai para a raiz e a base não é consultada;
       - se ainda não estiver, ele é buscado na base, inserido e
         fica na raiz.
    3. Cada local registra a quantidade de acessos.
    4. A árvore possui uma capacidade máxima.
    5. Quando a capacidade é ultrapassada, uma folha mais profunda
       é removida como heurística de descarte.
    6. Os passos do Splay são registrados para visualização.
    """

    def __init__(self, capacidade=None):
        self.raiz = None
        self.capacidade = capacidade
        self.tamanho = 0

        # Passos realizados no último acesso.
        self.ultimas_rotacoes = []

        # Local removido quando a capacidade é excedida.
        self.ultimo_removido = None

        # De onde veio o último local acessado: "cache" ou "base".
        self.ultima_origem = None

    # ============================================================
    # ROTAÇÕES
    # ============================================================

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

    # ============================================================
    # SPLAY
    # ============================================================

    def _splay(self, raiz, chave):
        """
        Cada chamada faz UM passo do Splay e registra UM nome:

        - "zig-zig": duas rotações, nó e pai do mesmo lado;
        - "zig-zag": duas rotações, nó e pai em lados opostos;
        - "zig": uma rotação só.

        A segunda rotação de um zig-zig/zig-zag faz parte do mesmo
        passo, por isso não é registrada separadamente como "zig".
        """
        if raiz is None or raiz.chave == chave:
            return raiz

        # Nome do passo atual. Vira zig-zig ou zig-zag se houver
        # rotação dupla.
        passo = "zig"

        # --------------------------------------------------------
        # CHAVE ESTÁ NA SUBÁRVORE ESQUERDA
        # --------------------------------------------------------

        if chave < raiz.chave:

            if raiz.esquerda is None:
                return raiz

            # -----------------------------
            # ZIG-ZIG
            # -----------------------------

            if chave < raiz.esquerda.chave:

                raiz.esquerda.esquerda = self._splay(
                    raiz.esquerda.esquerda,
                    chave,
                )

                raiz = self._rotacao_direita(raiz)

                passo = "zig-zig"

            # -----------------------------
            # ZIG-ZAG
            # -----------------------------

            elif chave > raiz.esquerda.chave:

                raiz.esquerda.direita = self._splay(
                    raiz.esquerda.direita,
                    chave,
                )

                if raiz.esquerda.direita is not None:
                    raiz.esquerda = self._rotacao_esquerda(
                        raiz.esquerda
                    )

                    passo = "zig-zag"

            # -----------------------------
            # SEGUNDA ROTAÇÃO (OU ZIG)
            # -----------------------------

            if raiz.esquerda is None:
                # Só a primeira rotação aconteceu: conta como zig.
                self.ultimas_rotacoes.append("zig")
                return raiz

            self.ultimas_rotacoes.append(passo)

            return self._rotacao_direita(raiz)

        # --------------------------------------------------------
        # CHAVE ESTÁ NA SUBÁRVORE DIREITA
        # --------------------------------------------------------

        else:

            if raiz.direita is None:
                return raiz

            # -----------------------------
            # ZIG-ZIG
            # -----------------------------

            if chave > raiz.direita.chave:

                raiz.direita.direita = self._splay(
                    raiz.direita.direita,
                    chave,
                )

                raiz = self._rotacao_esquerda(raiz)

                passo = "zig-zig"

            # -----------------------------
            # ZIG-ZAG
            # -----------------------------

            elif chave < raiz.direita.chave:

                raiz.direita.esquerda = self._splay(
                    raiz.direita.esquerda,
                    chave,
                )

                if raiz.direita.esquerda is not None:
                    raiz.direita = self._rotacao_direita(
                        raiz.direita
                    )

                    passo = "zig-zag"

            # -----------------------------
            # SEGUNDA ROTAÇÃO (OU ZIG)
            # -----------------------------

            if raiz.direita is None:
                # Só a primeira rotação aconteceu: conta como zig.
                self.ultimas_rotacoes.append("zig")
                return raiz

            self.ultimas_rotacoes.append(passo)

            return self._rotacao_esquerda(raiz)

    # ============================================================
    # INSERÇÃO
    # ============================================================

    def inserir(self, chave, valor):
        """
        Insere um novo elemento.

        A inserção utiliza o Splay clássico:
        antes de inserir, a árvore é reorganizada em torno da chave.
        """

        self.ultimas_rotacoes = []

        if self.raiz is None:
            self.raiz = NoSplay(chave, valor)
            self.tamanho = 1
            return

        self.raiz = self._splay(self.raiz, chave)

        # Elemento já existe.
        if self.raiz.chave == chave:
            self.raiz.valor = valor
            return

        novo = NoSplay(chave, valor)

        if chave < self.raiz.chave:

            novo.esquerda = self.raiz.esquerda
            novo.direita = self.raiz

            self.raiz.esquerda = None

        else:

            novo.direita = self.raiz.direita
            novo.esquerda = self.raiz

            self.raiz.direita = None

        self.raiz = novo
        self.tamanho += 1

    # ============================================================
    # BUSCA
    # ============================================================

    def buscar(self, chave):
        """
        Procura uma chave e realiza o Splay.

        A busca não altera o contador de acessos.
        O contador é responsabilidade de acessar().
        """

        self.ultimas_rotacoes = []

        if self.raiz is None:
            return None

        self.raiz = self._splay(self.raiz, chave)

        if self.raiz.chave == chave:
            return self.raiz.valor

        return None

    # ============================================================
    # ACESSO
    # ============================================================

    def acessar(self, chave, carregar):
        """
        Operação principal da Splay Tree no projeto: a árvore funciona
        como CACHE dos locais acessados recentemente.

        `carregar` é uma função que busca o local na base completa.
        Ela só é chamada quando o local não está na árvore.

        Se o local já estiver na árvore (acerto no cache):
            - realiza o Splay;
            - coloca o local na raiz;
            - incrementa o número de acessos;
            - a base NÃO é consultada.

        Se ainda não estiver (falha no cache):
            - busca o local na base com carregar(chave);
            - insere o local, que fica na raiz.

        Se a capacidade for excedida:
            - remove uma folha mais profunda.

        Retorna o local, ou None se ele não existir na base.
        `ultima_origem` diz de onde ele veio: "cache" ou "base".
        """

        self.ultimas_rotacoes = []
        self.ultimo_removido = None
        self.ultima_origem = None

        # --------------------------------------------------------
        # 1. PROCURAR NO CACHE (A PRÓPRIA ÁRVORE)
        # --------------------------------------------------------

        encontrado = self.buscar(chave)

        if encontrado is not None:
            # O buscar() já realizou o Splay.
            self.raiz.acessos += 1
            self.ultima_origem = "cache"

            return self.raiz.valor

        # Guardamos os passos da busca antes da inserção.
        rotacoes_busca = list(self.ultimas_rotacoes)

        # --------------------------------------------------------
        # 2. FALHA NO CACHE: BUSCAR NA BASE
        # --------------------------------------------------------

        valor = carregar(chave)

        if valor is None:
            return None

        self.ultima_origem = "base"

        # --------------------------------------------------------
        # 3. PRIMEIRO ACESSO: INSERIR NA ÁRVORE
        # --------------------------------------------------------

        self.inserir(chave, valor)

        rotacoes_insercao = list(self.ultimas_rotacoes)

        self.ultimas_rotacoes = (
            rotacoes_busca + rotacoes_insercao
        )

        # --------------------------------------------------------
        # CONTROLE DE CAPACIDADE
        # --------------------------------------------------------

        if (
            self.capacidade is not None
            and self.tamanho > self.capacidade
        ):
            self._remover_folha_mais_profunda()

        return self.raiz.valor

    # ============================================================
    # REMOÇÃO ADAPTADA
    # ============================================================

    def _remover_folha_mais_profunda(self):
        """
        Remove uma folha de maior profundidade.

        Essa é uma heurística específica da aplicação.

        A ideia é que a Splay coloca elementos acessados
        recentemente próximos da raiz. Portanto, uma folha
        muito profunda é um candidato ao descarte quando o
        histórico ultrapassa a capacidade.

        Importante:
        profundidade NÃO significa necessariamente "menos acessado".
        É apenas o critério de descarte adotado pela aplicação.
        """

        if self.raiz is None:
            return

        mais_funda = None
        pai_mais_funda = None
        maior_profundidade = -1

        pilha = [
            (self.raiz, None, 0)
        ]

        while pilha:

            no, pai, profundidade = pilha.pop()

            # Encontramos uma folha.
            if (
                no.esquerda is None
                and no.direita is None
            ):

                if profundidade > maior_profundidade:
                    maior_profundidade = profundidade
                    mais_funda = no
                    pai_mais_funda = pai

                continue

            if no.direita is not None:
                pilha.append(
                    (
                        no.direita,
                        no,
                        profundidade + 1,
                    )
                )

            if no.esquerda is not None:
                pilha.append(
                    (
                        no.esquerda,
                        no,
                        profundidade + 1,
                    )
                )

        # A raiz não pode ser removida.
        if pai_mais_funda is None:
            return

        if pai_mais_funda.esquerda is mais_funda:
            pai_mais_funda.esquerda = None
        else:
            pai_mais_funda.direita = None

        self.tamanho -= 1
        self.ultimo_removido = mais_funda.valor

    # ============================================================
    # HISTÓRICO
    # ============================================================

    def historico(self):
        """
        Retorna os locais atualmente presentes na Splay Tree,
        ordenados pelo número de acessos decrescente.

        Essa informação é usada para mostrar o histórico na
        interface.
        """

        locais = []

        def percorrer(no):
            if no is None:
                return

            locais.append({
                "chave": no.chave,
                "nome": getattr(
                    no.valor,
                    "nome",
                    str(no.valor),
                ),
                "acessos": no.acessos,
            })

            percorrer(no.esquerda)
            percorrer(no.direita)

        percorrer(self.raiz)

        locais.sort(
            key=lambda item: item["acessos"],
            reverse=True,
        )

        return locais

    # ============================================================
    # PERCURSO EM ORDEM
    # ============================================================

    def em_ordem(self):
        """
        Retorna as chaves em ordem crescente.

        Útil para testes e para verificar se a propriedade
        da árvore binária de busca foi preservada.
        """

        chaves = []

        def percorrer(no):
            if no is None:
                return

            percorrer(no.esquerda)
            chaves.append(no.chave)
            percorrer(no.direita)

        percorrer(self.raiz)

        return chaves

    # ============================================================
    # REPRESENTAÇÃO PARA A INTERFACE
    # ============================================================

    def _para_dict(self, no):
        if no is None:
            return None

        return {
            "chave": no.chave,
            "nome": getattr(
                no.valor,
                "nome",
                str(no.valor),
            ),
            "acessos": no.acessos,
            "esquerda": self._para_dict(no.esquerda),
            "direita": self._para_dict(no.direita),
        }

    def estrutura(self):
        return self._para_dict(self.raiz)