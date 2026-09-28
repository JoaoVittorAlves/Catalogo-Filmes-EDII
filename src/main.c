#include <stdio.h>

int main() {

    int opcao;

    do {

        printf("\n===== SISTEMA DE BIBLIOTECA =====\n");
        printf("1 - Cadastrar livro\n");
        printf("2 - Buscar livro\n");
        printf("3 - Remover livro\n");
        printf("4 - Emprestar livro\n");
        printf("5 - Devolver livro\n");
        printf("6 - Listar livros\n");
        printf("7 - Mostrar arvore\n");
        printf("8 - Mostrar Skip List\n");
        printf("0 - Sair\n");

        printf("\nEscolha: ");
        scanf("%d", &opcao);

        switch (opcao) {

            case 1:
                // cadastrar
                break;

            case 2:
                // buscar
                break;

            case 3:
                // remover
                break;

            case 4:
                // emprestar
                break;

            case 5:
                // devolver
                break;

            case 6:
                // listar
                break;

            case 7:
                // árvore
                break;

            case 8:
                // Skip List
                break;

            case 0:
                printf("Encerrando...\n");
                break;

            default:
                printf("Opcao invalida!\n");
        }

    } while (opcao != 0);

    return 0;
}