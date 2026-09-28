#ifndef LIVRO_H
#define LIVRO_H

typedef struct {
    int id;
    char titulo[100];
    char autor[100];
    int ano;
    int disponivel;
} Livro;

void imprimir_livro(Livro livro);

#endif