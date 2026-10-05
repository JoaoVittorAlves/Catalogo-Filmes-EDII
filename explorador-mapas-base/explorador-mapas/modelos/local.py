import math


RAIO_TERRA_KM = 6371.0


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
        relevancia=0,
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
        # Número de Wikipédias com artigo sobre o local (sitelinks do Wikidata).
        self.relevancia = int(relevancia)
        # Nível do local na Skip List (definido pela relevância em app.py).
        self.nivel_skip = 0

    def distancia_km(self, latitude, longitude):
        """
        Distância em km até o ponto (latitude, longitude),
        calculada pela fórmula de Haversine.
        """
        lat1 = math.radians(self.latitude)
        lat2 = math.radians(latitude)
        dlat = lat2 - lat1
        dlon = math.radians(longitude - self.longitude)

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        )

        return 2 * RAIO_TERRA_KM * math.asin(math.sqrt(a))

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
            "relevancia": self.relevancia,
        }

    def __repr__(self):
        return f"Local({self.id}, {self.nome!r})"
