import MarkdownIt from 'markdown-it';

class Markdown {
    private md: MarkdownIt;

    constructor() {
        this.md = new MarkdownIt();

        // Customize rendering rules
        this.md.renderer.rules.heading_open = (tokens, idx) => {
            const level = tokens[idx].tag.slice(1);
            const className = level === '1' ? 'display-1' :
                level === '2' ? 'card-title' :
                level === '3' ? 'card-title' :
                level === '4' ? 'card-title' :
                level === '5' ? 'h5 card-title' : 'h6 card-title';
            return `<h${level} class="${className}">`;
        };

        this.md.renderer.rules.paragraph_open = () => {
            return '<p class="card-text">';
        };

        this.md.renderer.rules.strong_open = () => {
            return '<strong>';
        };

        this.md.renderer.rules.em_open = () => {
            return '<i>';
        };

        this.md.renderer.rules.link_open = (tokens, idx) => {
            const href = tokens[idx].attrGet('href');
            return `<a class="card-link bg-transparent" href="${href}" target="_blank">`;
        };

        this.md.renderer.rules.image = (tokens, idx) => {
            const src = tokens[idx].attrGet('src');
            const alt = tokens[idx].content;
            return `
            <div class="card text-bg-dark">
                <img src="${src}" class="card-img" alt="${alt}">
                <div class="card-img-overlay text-end">
                    <a class="btn btn-light btn-sm btn-light-transparent text-end" href="${src}" target="_blank">
                        View media
                    </a>
                </div>
            </div>`;
        };

        this.md.renderer.rules.bullet_list_open = () => {
            return '<ul class="list-group bg-transparent text-white">';
        };

        this.md.renderer.rules.ordered_list_open = () => {
            return '<ol class="list-group bg-transparent text-white">';
        };

        this.md.renderer.rules.list_item_open = () => {
            return '<li class="list-group-item">';
        };

        this.md.renderer.rules.blockquote_open = () => {
            return `
                <figure>
                    <blockquote class="blockquote">
                        <p>`;
        };

        this.md.renderer.rules.blockquote_close = () => {
            return `
                        </p>
                    </blockquote>
                    <figcaption class="blockquote-footer">
                        Someone famous in <cite title="Source Title">Source Title</cite>
                    </figcaption>
                </figure>`;
        };

        this.md.renderer.rules.code_block = (tokens, idx) => {
            const content = tokens[idx].content;
            return `<pre><code class="language-plaintext" data-prismjs-copy="Copy">${content}</code></pre>`;
        };

        this.md.renderer.rules.fence = (tokens, idx) => {
            const content = tokens[idx].content;
            const language = tokens[idx].info || 'plaintext';
            return `<pre><code class="language-${language}" data-prismjs-copy="Copy">${content}</code></pre>`;
        };

        this.md.renderer.rules.inline = (tokens, idx) => {
            const token = tokens[idx];
            return `<code class="text-bg-dark">${token.content}</code>`;
        };

        this.md.renderer.rules.table_open = () => {
            return '<table class="table table-sm bg-transparent text-white">';
        };

        this.md.renderer.rules.table_close = () => {
            return '</table>';
        };

        this.md.renderer.rules.thead_open = () => {
            return '<thead>';
        };

        this.md.renderer.rules.thead_close = () => {
            return '</thead>';
        };

        this.md.renderer.rules.tbody_open = () => {
            return '<tbody>';
        };

        this.md.renderer.rules.tbody_close = () => {
            return '</tbody>';
        };

        this.md.renderer.rules.tr_open = () => {
            return '<tr>';
        };

        this.md.renderer.rules.tr_close = () => {
            return '</tr>';
        };

        this.md.renderer.rules.th_open = (tokens, idx) => {
            const align = tokens[idx].attrGet('align') || '';
            return `<th class="text-${align}">`;
        };

        this.md.renderer.rules.th_close = () => {
            return '</th>';
        };

        this.md.renderer.rules.td_open = (tokens, idx) => {
            const align = tokens[idx].attrGet('align') || '';
            return `<td class="text-${align}">`;
        };

        this.md.renderer.rules.td_close = () => {
            return '</td>';
        };

        this.md.renderer.rules.hr = () => {
            return '<hr class="my-4">';
        };

        this.md.renderer.rules.br = () => {
            return '<br>';
        };

        this.md.renderer.rules.video = (tokens, idx) => {
            const src = tokens[idx].attrGet('src');
            return `
            <div class="card text-bg-dark">
                <video class="card-img-top bg-transparent" controls loop src="${src}"></video>
                <div class="card-img-overlay text-end">
                    <a class="btn btn-light btn-sm btn-light-transparent text-end" href="${src}" target="_blank">
                        View media
                    </a>
                </div>
            </div>`;
        };

        this.md.renderer.rules.audio = (tokens, idx) => {
            const src = tokens[idx].attrGet('src');
            return `
                <div class="card-body bg-transparent">
                    <audio controls autoplay class="w-100">
                        <source src="${src}" />
                    </audio>
                </div>`;
        };

        this.md.renderer.rules.dl_open = () => {
            return '<dl class="row">';
        };

        this.md.renderer.rules.dl_close = () => {
            return '</dl>';
        };

        this.md.renderer.rules.dt_open = () => {
            return '<dt class="col-sm-3">';
        };

        this.md.renderer.rules.dt_close = () => {
            return '</dt>';
        };

        this.md.renderer.rules.dd_open = () => {
            return '<dd class="col-sm-9">';
        };

        this.md.renderer.rules.dd_close = () => {
            return '</dd>';
        };

        this.md.renderer.rules.figcaption_open = () => {
            return '<figcaption class="figure-caption">';
        };

        this.md.renderer.rules.figcaption_close = () => {
            return '</figcaption>';
        };
    }

    public parse(content: string): string {
        // Check if content is HTML
        const isHTML = /<\/?[a-z][\s\S]*>/i.test(content);
        if (isHTML) {
            return content;
        }
        // Parse as Markdown
        return this.md.render(content);
    }
}

export default Markdown;
