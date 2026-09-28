#ifndef LISTA_H
#define LISTA_H

#include "livro.h"

typedef struct NoLista {
    Livro livro;
    struct NoLista *proximo;
} NoLista;

typedef struct {
    NoLista *inicio;
    int tamanho;
} Lista;

void inicializar_lista(Lista *lista);

void inserir_lista(Lista *lista, Livro livro);

void remover_lista(Lista *lista, int id);

NoLista *buscar_lista(Lista *lista, int id);

void imprimir_lista(Lista *lista);

void liberar_lista(Lista *lista);

#endif