import { MarkdownService } from 'ngx-markdown';

export class CustomMarkdownService {
  constructor(private markdownService: MarkdownService) {
    this.configureMarkdownService();
  }

  private configureMarkdownService() {
    const renderer = this.markdownService.renderer;

    // Custom heading
    renderer.heading = (text: string, level: number) => {
      const className = level === 1 ? 'display-1' :
                        level === 2 ? 'card-title' :
                        level === 3 ? 'card-title' :
                        level === 4 ? 'card-title' :
                        level === 5 ? 'h5 card-title' : 'h6 card-title';
      const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<h${level} class="${className}">
                <a name="${escapedText}" class="anchor" href="#${escapedText}">
                  <span class="header-link"></span>
                </a>${text}
              </h${level}>`;
    };

    // Custom paragraph
    renderer.paragraph = (text: string) => {
      return `<p class="card-text">${text}</p>`;
    };

    // Custom strong
    renderer.strong = (text: string) => {
      return `<strong>${text}</strong>`;
    };

    // Custom emphasis
    renderer.em = (text: string) => {
      return `<i>${text}</i>`;
    };

    // Custom link
    renderer.link = (href: string | null, title: string | null, text: string) => {
      return `<a class="card-link bg-transparent" href="${href}" target="_blank">${text}</a>`;
    };

    // Custom image
    renderer.image = (href: string | null, title: string | null, text: string) => {
      return `
        <div class="card text-bg-dark">
          <img src="${href}" class="card-img" alt="${text}">
          <div class="card-img-overlay text-end">
            <a class="btn btn-light btn-sm btn-light-transparent text-end" href="${href}" target="_blank">
              View media
            </a>
          </div>
        </div>`;
    };

    // Custom bullet list
    renderer.list = (body: string, ordered: boolean) => {
      const type = ordered ? 'ol' : 'ul';
      return `<${type} class="list-group bg-transparent text-white">${body}</${type}>`;
    };

    // Custom list item
    renderer.listitem = (text: string) => {
      return `<li class="list-group-item">${text}</li>`;
    };

    // Custom blockquote
    renderer.blockquote = (quote: string) => {
      return `
        <figure>
          <blockquote class="blockquote">
            <p>${quote}</p>
          </blockquote>
          <figcaption class="blockquote-footer">
            Someone famous in <cite title="Source Title">Source Title</cite>
          </figcaption>
        </figure>`;
    };

    // Custom code block
    renderer.code = (code: string, infostring: string | undefined, escaped: boolean) => {
      const language = infostring || 'plaintext';
      return `<pre><code class="language-${language}" data-prismjs-copy="Copy">${code}</code></pre>`;
    };

    // Custom inline code
    renderer.codespan = (code: string) => {
      return `<code class="text-bg-dark">${code}</code>`;
    };

    // Custom table
    renderer.table = (header: string, body: string) => {
      return `
        <table class="table table-sm bg-transparent text-white">
          <thead>${header}</thead>
          <tbody>${body}</tbody>
        </table>`;
    };

    // Custom table row
    renderer.tablerow = (content: string) => {
      return `<tr>${content}</tr>`;
    };

    // Custom table cell
    renderer.tablecell = (content: string, flags: { header: boolean; align: 'center' | 'left' | 'right' | null; }) => {
      const tag = flags.header ? 'th' : 'td';
      const align = flags.align ? `text-${flags.align}` : '';
      return `<${tag} class="${align}">${content}</${tag}>`;
    };

    // Custom horizontal rule
    renderer.hr = () => {
      return '<hr class="my-4">';
    };

    // Custom line break
    renderer.br = () => {
      return '<br>';
    };

    // Custom video and audio
    renderer.html = (html: string) => {
      if (html.includes('<video')) {
        return `
        <div class="card text-bg-dark">
          <video class="card-img-top bg-transparent" controls loop>${html}</video>
          <div class="card-img-overlay text-end">
            <a class="btn btn-light btn-sm btn-light-transparent text-end" href="#" target="_blank">
              View media
            </a>
          </div>
        </div>`;
      } else if (html.includes('<audio')) {
        return `
          <div class="card-body bg-transparent">
            <audio controls autoplay class="w-100">${html}</audio>
          </div>`;
      }
      return html;
    };
  }
}
