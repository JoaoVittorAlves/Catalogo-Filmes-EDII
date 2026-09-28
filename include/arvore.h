#ifndef ARVORE_H
#define ARVORE_H

#include "livro.h"

typedef struct NoArvore {
    Livro livro;
    struct NoArvore *esquerda;
    struct NoArvore *direita;
} NoArvore;

NoArvore *inserir_arvore(NoArvore *raiz, Livro livro);

NoArvore *buscar_arvore(NoArvore *raiz, int id);

NoArvore *remover_arvore(NoArvore *raiz, int id);

void imprimir_em_ordem(NoArvore *raiz);

void liberar_arvore(NoArvore *raiz);

#endif