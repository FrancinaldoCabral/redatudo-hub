// src/app/ebook-studio/ebook.model.ts

/**
 * Define a estrutura de um item do sumário (capítulo, introdução, etc.).
 */
export interface StructureItem {
  id: number;
  title: string;
  includeImages: boolean;
  // O conteúdo gerado para este item.
  content?: string;
}

/**
 * Define a estrutura de um template de diagramação.
 */
export interface DiagrammingStyle {
  id: string;
  name: string;
  css: string;
  thumbnailUrl: string;
}

/**
 * Define o objeto principal que representa o ebook em criação.
 */
export interface Ebook {
  prompt: string;
  structure: StructureItem[];
  // O conteúdo completo do ebook, em formato HTML, após a junção de todas as partes.
  fullHtmlContent: string;
  // O ID do estilo de diagramação selecionado.
  selectedStyleId: string;
}
