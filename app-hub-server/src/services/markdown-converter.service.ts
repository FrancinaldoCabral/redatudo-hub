/**
 * Serviço para conversão avançada de Markdown para HTML
 * Suporta mais recursos que a conversão básica
 */

export class MarkdownConverterService {
  /**
   * Converte Markdown para HTML com suporte avançado
   */
  static toHTML(markdown: string): string {
    let html = markdown;

    // Code blocks (deve vir antes de outros processamentos)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `<pre><code class="language-${language}">${this.escapeHtml(code.trim())}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers (deve vir antes de processamento de linhas)
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/^\*\*\*$/gim, '<hr>');

    // Bold (deve vir antes de italic)
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;">');

    // Blockquotes
    html = html.replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = this.processLists(html);

    // Tables
    html = this.processTables(html);

    // Line breaks
    html = html.replace(/  $/gm, '<br>');

    // Paragraphs (deve vir por último)
    html = this.processParagraphs(html);

    return html.trim();
  }

  /**
   * Processa listas ordenadas e não ordenadas
   */
  private static processLists(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inUnorderedList = false;
    let inOrderedList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const unorderedMatch = line.match(/^\s*[\*\-\+] (.+)$/);
      const orderedMatch = line.match(/^\s*\d+\. (.+)$/);

      if (unorderedMatch) {
        if (!inUnorderedList) {
          result.push('<ul>');
          inUnorderedList = true;
        }
        result.push(`<li>${unorderedMatch[1]}</li>`);
      } else if (orderedMatch) {
        if (!inOrderedList) {
          result.push('<ol>');
          inOrderedList = true;
        }
        result.push(`<li>${orderedMatch[1]}</li>`);
      } else {
        if (inUnorderedList) {
          result.push('</ul>');
          inUnorderedList = false;
        }
        if (inOrderedList) {
          result.push('</ol>');
          inOrderedList = false;
        }
        result.push(line);
      }
    }

    // Fechar listas abertas
    if (inUnorderedList) result.push('</ul>');
    if (inOrderedList) result.push('</ol>');

    return result.join('\n');
  }

  /**
   * Processa tabelas markdown
   */
  private static processTables(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inTable = false;
    let headerProcessed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detectar linha de tabela
      if (line.match(/^\|(.+)\|$/)) {
        const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
        
        // Verificar se é linha separadora
        if (cells.every(c => c.match(/^:?-+:?$/))) {
          continue; // Pular linha separadora
        }

        if (!inTable) {
          result.push('<table>');
          inTable = true;
          headerProcessed = false;
        }

        if (!headerProcessed) {
          result.push('<thead><tr>');
          cells.forEach(cell => result.push(`<th>${cell}</th>`));
          result.push('</tr></thead><tbody>');
          headerProcessed = true;
        } else {
          result.push('<tr>');
          cells.forEach(cell => result.push(`<td>${cell}</td>`));
          result.push('</tr>');
        }
      } else {
        if (inTable) {
          result.push('</tbody></table>');
          inTable = false;
        }
        result.push(line);
      }
    }

    if (inTable) {
      result.push('</tbody></table>');
    }

    return result.join('\n');
  }

  /**
   * Processa parágrafos
   */
  private static processParagraphs(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inParagraph = false;
    let paragraphBuffer: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Verificar se é tag HTML ou linha vazia
      const isHtmlTag = trimmed.match(/^<(h[1-6]|ul|ol|li|blockquote|pre|code|table|hr|img)/i);
      const isEmpty = trimmed === '';

      if (isEmpty) {
        if (inParagraph) {
          result.push(`<p>${paragraphBuffer.join(' ')}</p>`);
          paragraphBuffer = [];
          inParagraph = false;
        }
        result.push('');
      } else if (isHtmlTag) {
        if (inParagraph) {
          result.push(`<p>${paragraphBuffer.join(' ')}</p>`);
          paragraphBuffer = [];
          inParagraph = false;
        }
        result.push(line);
      } else {
        inParagraph = true;
        paragraphBuffer.push(trimmed);
      }
    }

    // Fechar parágrafo aberto
    if (inParagraph && paragraphBuffer.length > 0) {
      result.push(`<p>${paragraphBuffer.join(' ')}</p>`);
    }

    return result.join('\n');
  }

  /**
   * Escapa HTML para prevenir XSS
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Converte Markdown para texto plano (remove formatação)
   */
  static toPlainText(markdown: string): string {
    return markdown
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`]+`/g, '')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Remove strikethrough
      .replace(/~~(.+?)~~/g, '$1')
      // Remove links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove lists
      .replace(/^\s*[\*\-\+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      // Remove horizontal rules
      .replace(/^---$/gm, '')
      .replace(/^\*\*\*$/gm, '')
      .trim();
  }
}
