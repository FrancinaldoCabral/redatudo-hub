import { MarkedRenderer, MarkedOptions } from 'ngx-markdown';
import { FileRenderService } from './services/file-render.service';
import katex from 'katex';
//import 'katex/dist/katex.min.css';

function getIconByTypeFile(type: string): string {
  let imageExcessions = ['.webp', '.tiff']
  if(type){
      if(imageExcessions.includes(type)) return `bi bi-image-alt`
      return `bi bi-filetype-${type}`
  }else{
      return `bi bi-files-alt`
  }
}
export function markedOptionsFactory(): MarkedOptions {
  const renderer = new MarkedRenderer();
  const fileRenderService = new FileRenderService()

  // Custom heading
  renderer.heading = (text: string, level: number) => {
    const className = level === 1 ? 'card-title' :
                      level === 2 ? 'card-title' :
                      level === 3 ? 'card-title' :
                      level === 4 ? 'card-title' :
                      level === 5 ? 'h5 card-title' : 'h6 card-title';
    return `<h${level} class="${className}">${text}</h${level}>`;
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

  // Custom link with additional attributes
  renderer.link = (href: string | null, title: string | null, text: string) => {
    // Base attributes
    let attributes = `href="${href}" target="_blank"`;

    // Extract additional attributes from the text
    const attributeRegex = /\{([^\}]+)\}$/;
    const attributeMatch = text.match(attributeRegex);
    if (attributeMatch) {
      const attributeString = attributeMatch[1];
      const attributePairs = attributeString.split(';').map(attr => attr.trim());
      attributePairs.forEach(attr => {
        const [key, value] = attr.split('=');
        attributes += ` ${key}="${value}"`;
      });
      text = text.replace(attributeRegex, ''); // Remove the attributes from the displayed text
    }

    // Determine link type and add icon if necessary
    let linkContent = text;
    switch (fileRenderService.getFileType(href as string)) {
      case 'audio':
        return `
        <div class="card-body bg-transparent border-0 m-2">
          <audio controls class="w-100" src="${href}"></audio>
        </div>`;
      case 'unknown':
        linkContent = text;
        break;
      default:
        linkContent = `<i class="${getIconByTypeFile(fileRenderService.getFileType(href as string))}"></i> ${text}`;
        break;
    }

    // Render the link with additional attributes and content
    return `<a ${attributes} class="card-link bg-transparent">${linkContent}</a>`;
  };

  // Custom image
  renderer.image = (href: string | null, title: string | null, text: string) => {
    switch (fileRenderService.getFileType(href as string)) {
      case 'audio':
        return `
        <div class="card-body bg-transparent border-0 m-2">
          <audio controls class="w-100" src="${href}"></audio>
        </div>`
      case 'video':
        return `
        <div class="card text-bg-dark">
            <video class="card-img-top bg-transparent" controls loop src="${href}"></video>
        </div>` 
      case 'image':
        return `
        <div class="card text-bg-dark col-12 col-md-9 col-lg-9 m-2">
          <img src="${href}" class="card-img" alt="${text}">
          <div class="card-img-overlay text-end">
            <a class="btn btn-light btn-sm btn-light-transparent text-end" href="${href}" target="_blank">
              View media
            </a>
          </div>
        </div>`                        
      default:
        return `<a class="card-link bg-transparent" href="${href}" target="_blank"> <i class="${getIconByTypeFile(fileRenderService.getFileType(href as string))}"></i> ${text}</a>`;
    }
  };

  // Custom bullet list
  renderer.list = (body: string, ordered: boolean) => {
    const type = ordered ? 'ol' : 'ul';
    return `<${type} class="m-1 bg-transparent text-white">${body}</${type}>`;
  };

  // Custom list item
  renderer.listitem = (text: string) => {
    return `<li class="bg-transparent text-white border-0">${text}</li>`;
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

  // Custom table
  renderer.table = (header: string, body: string) => {
    return `
      <table class="table table-sm table-dark">
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

  // Custom video
  renderer.html = (html: string) => {
    html = html.replace('<video',`<div class="card text-bg-dark"><video class="card-img-top bg-transparent"`)
    html = html.replace('</video>','</video></div>')

    
    return stringEscapeBackslashes(html);
  };

  return {
    renderer: renderer,
    gfm: true,
    breaks: false,
    pedantic: false,
    smartLists: true,
    smartypants: false,
  };
}

function stringEscapeBackslashes(s: string): string {
  return s ? s.replace(/\\/g,'\\\\') : s;
}
