class Local:
    """Representa um ponto de interesse geográfico."""

    def __init__(
        self,
        id,
        nome,
        categoria,
        cidade,
        estado,
        latitude,
        longitude,
        descricao,
        imagem="",
    ):
        self.id = int(id)
        self.nome = nome
        self.categoria = categoria
        self.cidade = cidade
        self.estado = estado
        self.latitude = float(latitude)
        self.longitude = float(longitude)
        self.descricao = descricao
        self.imagem = imagem

    def distancia_chave(self):
        """Chave inicial usada pela Skip List."""
        # A distância real poderá ser calculada futuramente a partir
        # de um ponto de referência escolhido pelo usuário.
        return self.id

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "categoria": self.categoria,
            "cidade": self.cidade,
            "estado": self.estado,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "descricao": self.descricao,
            "imagem": self.imagem,
        }

    def __repr__(self):
        return f"Local({self.id}, {self.nome!r})"
