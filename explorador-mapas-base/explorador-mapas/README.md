# Explorador de Mapas

Projeto-base para a disciplina de Estrutura de Dados e Algoritmos II.

A aplicação tem como objetivo visualizar uma base de pontos de interesse
geográficos e utilizar estruturas de dados tanto para organizar os dados
quanto para implementar funcionalidades visíveis ao usuário.

## Estruturas utilizadas

### 1. Lista com Movimentação ao Início

Utilizada para organizar as categorias exploradas.

Quando uma categoria é acessada, ela é movimentada para o início da lista.

### 2. Skip List

Utilizada para organizar os locais por uma chave ordenada.

A aplicação permite selecionar um nível da Skip List. O nível 0 contém
todos os locais, enquanto níveis superiores representam uma visão mais
resumida da estrutura.

### 3. Splay Tree

Utilizada para organizar os locais acessados.

Quando um local é selecionado, a busca na Splay Tree reorganiza a árvore
por meio da operação de Splay, levando o elemento acessado para a raiz.

## Estrutura do projeto

```text
explorador-mapas/
├── app.py
├── estruturas/
│   ├── lista_mov_inicio.py
│   ├── skip_list.py
│   └── splay_tree.py
├── modelos/
│   └── local.py
├── dados/
│   └── locais.json
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
└── README.md
```

## Como executar

Recomendado: Python 3.11 ou superior.

### 1. Criar ambiente virtual

Windows PowerShell:

```powershell
python -m venv .venv
```

### 2. Ativar

```powershell
.venv\Scripts\Activate.ps1
```

### 3. Instalar Flask

```powershell
pip install flask
```

### 4. Executar

```powershell
python app.py
```

Depois abra:

```text
http://127.0.0.1:5000
```

## Estado atual

Esta é uma base inicial para desenvolvimento acadêmico. A base JSON contém
poucos locais apenas para testar a aplicação.

Antes da entrega, devem ser desenvolvidos:

- uma base de dados substancialmente maior;
- uma fonte de dados adequada e documentada;
- uma definição mais rigorosa da chave utilizada pela Skip List;
- uma visualização mais clara das estruturas;
- testes das estruturas;
- modificações nos algoritmos clássicos que sejam justificadas pelo problema;
- documentação do processo de desenvolvimento.

## Próximas etapas sugeridas

1. Testar as três estruturas isoladamente.
2. Definir a base geográfica definitiva.
3. Substituir a chave provisória da Skip List por uma chave geográfica.
4. Definir a modificação da Skip List relacionada à exploração do mapa.
5. Definir a modificação da Splay Tree relacionada ao histórico/acesso.
6. Melhorar a visualização da árvore.
7. Adicionar filtros e busca.
8. Aumentar a base de dados.
9. Preparar testes e apresentação.
