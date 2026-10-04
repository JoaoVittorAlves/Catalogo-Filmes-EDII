# 05 – Base de dados

## Formato de um local

Toda base (semente ou Wikidata) é um vetor de objetos com estes campos:

| Campo | Tipo | Exemplo | Uso |
|---|---|---|---|
| `nome` | texto | `"Teatro Amazonas"` | chave da árvore afunilada |
| `categoria` | texto | `"teatro"` | chave da lista de categorias e filtro do mapa |
| `cidade` | texto | `"Manaus"` | ficha do local |
| `uf` | texto | `"AM"` | ficha e sugestões |
| `lat`, `lon` | número | `-3.1301`, `-60.0234` | marcador e distância (chave da lista com saltos) |
| `relevancia` | 0 a 1 | `0.85` | altura do nó na lista com saltos (S2) |
| `descricao` | texto | `"Ópera do ciclo da borracha..."` | ficha |
| `imagem` | URL ou `null` | miniatura do Commons | foto da ficha |
| `fonte` | URL ou `null` | `https://www.wikidata.org/wiki/Q...` | botão "Abrir no Wikidata" |

Ao carregar, `Catalogo` descarta registros sem nome ou coordenadas válidas, limita a relevância a [0, 1], atribui um `id` sequencial e calcula `chaveNome`.

## Categorias

| Chave | Rótulo | Classe no Wikidata |
|---|---|---|
| `cidade` | Cidades | Q3184121 (município do Brasil) |
| `praia` | Praias | Q40080 |
| `museu` | Museus | Q33506 |
| `parque` | Parques | Q22698 |
| `monumento` | Monumentos | Q4989906 |
| `igreja` | Igrejas | Q16970 |
| `cachoeira` | Cachoeiras | Q34038 |
| `teatro` | Teatros | Q24354 |
| `forte` | Fortes | Q57821 |
| `ilha` | Ilhas | Q23442 |

## Base semente (`dados/locais-semente.js`)

São 221 locais reais de todos os estados, digitados à mão em formato compacto (`[nome, categoria, cidade, UF, lat, lon, relevância, descrição]`). Servem para a aplicação funcionar na hora, inclusive sem internet. As coordenadas são aproximadas e a relevância foi estimada manualmente. Esses locais não têm foto: a ficha mostra uma ilustração com a cor e o símbolo da categoria.

## Base grande (`scripts/gerar_base_wikidata.py`)

O script consulta o serviço SPARQL público do Wikidata, uma vez por categoria, e pede locais que:

- sejam instância (ou subclasse) da classe da categoria;
- fiquem no Brasil (`P17 = Q155`);
- tenham coordenadas (`P625`).

E traz junto, quando existirem: imagem (`P18`), município (`P131`), estado, descrição em português e o número de artigos em Wikipédias (`sitelinks`).

```bash
python3 scripts/gerar_base_wikidata.py --limite 1500      # padrão
python3 scripts/gerar_base_wikidata.py --so-com-imagem    # só locais com foto
```

Detalhes do processamento:

- **Relevância**: `log(1 + sitelinks) / log(1 + máximo da base)`. O logaritmo evita que meia dúzia de locais famosíssimos esmague a escala de todos os outros.
- **Duplicatas**: o SPARQL devolve uma linha por combinação de imagem e município. O script mantém a primeira ocorrência de cada item (pelo QID). Um item que pertence a duas categorias fica na primeira consultada.
- **Imagens**: o endereço `Special:FilePath` recebe `?width=640`, para baixar só uma miniatura.
- **Robustez**: até 4 tentativas por consulta, com espera crescente e uma pausa de 2 s entre categorias, por gentileza com o servidor público.
- **Requisitos**: Python 3.8+ e apenas a biblioteca padrão.

A saída é gravada em dois arquivos:

- `dados/locais.js`: define `self.LOCAIS_WIKIDATA`. O `index.html` carrega esse arquivo se ele existir e, nesse caso, a interface o usa no lugar da semente.
- `dados/locais.json`: os mesmos dados, para inspeção. Está no `.gitignore` por ser grande.

Com o limite padrão, a base costuma ficar com alguns milhares de locais, dependendo do que o Wikidata tiver no dia. O cabeçalho da aplicação mostra quantos locais foram carregados e quanto tempo levou para montar as estruturas.

### Se o script falhar

- `Nenhum dado obtido`: verifique a conexão. O serviço do Wikidata às vezes fica lento; rode de novo mais tarde.
- Uma categoria demora demais: classes muito amplas (museu, parque) podem estourar o tempo limite do servidor. Reduza o `--limite`.
- Alguns locais aparecem sem estado: no Wikidata, o município de alguns itens não está ligado a um estado por até dois níveis de `P131`. Eles continuam funcionando no mapa normalmente.

## Licenças

- Dados do Wikidata: CC0 (domínio público).
- Imagens: Wikimedia Commons, cada uma com sua própria licença, indicada na página do arquivo. A ficha do local leva ao item do Wikidata, que aponta para a imagem.
- Base semente: escrita para este projeto, com informações de conhecimento geral.
