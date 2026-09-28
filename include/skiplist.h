#ifndef SKIPLIST_H
#define SKIPLIST_H

#include "livro.h"

#define MAX_NIVEIS 4

typedef struct NoSkip {
    Livro livro;
    struct NoSkip *proximo[MAX_NIVEIS];
} NoSkip;

typedef struct {
    NoSkip *inicio;
    int nivel;
} SkipList;

void inicializar_skiplist(SkipList *lista);

void inserir_skiplist(SkipList *lista, Livro livro);

NoSkip *buscar_skiplist(SkipList *lista, int id);

void remover_skiplist(SkipList *lista, int id);

void imprimir_skiplist(SkipList *lista);

void liberar_skiplist(SkipList *lista);

#endif