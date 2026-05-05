import { Component, OnInit, Input } from '@angular/core';

interface Book {
  url: string;
  title: string;
  desc: string;
  cat: string;
  group: string;
}

const CATALOG: Book[] = [
  // IA & Tecnologia
  { url: 'https://amzn.to/4dkIqCJ', title: 'Cointeligência — A vida e o trabalho com IA', desc: 'O guia definitivo para trabalhar COM a IA. Best-seller em Computação, ★4.7.', cat: 'IA & Trabalho', group: 'ia' },
  { url: 'https://amzn.to/4urU704', title: 'A Próxima Onda — IA, poder e o maior dilema do século', desc: 'Escrito pelo cofundador do DeepMind. 1.100 avaliações ★4.6.', cat: 'IA & Futuro', group: 'ia' },
  { url: 'https://amzn.to/4usxh8y', title: 'Nexus — Yuval Noah Harari', desc: 'Como as redes de informação moldaram a história. 3.800 avaliações ★4.7.', cat: 'IA & Sociedade', group: 'ia' },
  { url: 'https://amzn.to/4d2CgFZ', title: 'A Máquina que Pensa — Jensen Huang e a Nvidia', desc: 'A história real do chip mais cobiçado do mundo. ★4.8.', cat: 'IA & Tecnologia', group: 'ia' },
  { url: 'https://amzn.to/4weTQQ0', title: 'A Singularidade está mais Próxima — Ray Kurzweil', desc: 'A previsão mais ousada sobre a fusão entre humanos e IA. ★4.7.', cat: 'IA & Futuro', group: 'ia' },
  // Copywriting & Marketing
  { url: 'https://amzn.to/4cPPd7l', title: 'Gatilhos Mentais — Gustavo Ferreira', desc: 'Estratégias de persuasão para negócios e comunicação. 18.000+ avaliações ★4.6.', cat: 'Copywriting', group: 'copy' },
  { url: 'https://www.amazon.com.br/dp/6555646659', title: 'Brevidade Inteligente', desc: 'Escrever textos que as pessoas realmente leem. ★4.6.', cat: 'Escrita & Conteúdo', group: 'copy' },
  { url: 'https://amzn.to/4d4g2U9', title: 'Marketing 6.0 — O futuro é imersivo', desc: 'Kotler sobre o futuro do marketing com IA. 580 avaliações ★4.8.', cat: 'Marketing Digital', group: 'copy' },
  { url: 'https://amzn.to/3QO3ZmA', title: 'Marketing 5.0 — Tecnologia para a humanidade', desc: 'IA, dados e automação no marketing. 2.700 avaliações ★4.8.', cat: 'Marketing Digital', group: 'copy' },
  { url: 'https://amzn.to/4d62UxW', title: 'A Lógica do Consumo — Martin Lindstrom', desc: 'Neuromarketing aplicado ao conteúdo. 2.400 avaliações ★4.6.', cat: 'Neuromarketing', group: 'copy' },
  // Produtividade
  { url: 'https://amzn.to/4u1HvNt', title: 'Hábitos Atômicos — James Clear', desc: 'O método mais vendido para criar bons hábitos. 27.000 avaliações ★4.8.', cat: 'Produtividade', group: 'prod' },
  { url: 'https://amzn.to/4eZn52S', title: 'Essencialismo — A disciplinada busca por menos', desc: 'Faça menos, mas muito melhor. 34.000 avaliações ★4.8.', cat: 'Foco & Método', group: 'prod' },
  { url: 'https://amzn.to/42MAiES', title: 'O Poder do Hábito — Charles Duhigg', desc: 'Por que fazemos o que fazemos — e como mudar. 24.000 avaliações ★4.8.', cat: 'Hábitos', group: 'prod' },
  { url: 'https://amzn.to/4cPQ0Fl', title: 'Mindset — A nova psicologia do sucesso', desc: 'A mentalidade de crescimento que separa quem avança. 37.000 avaliações ★4.7.', cat: 'Mentalidade', group: 'prod' },
  // Carreira & Criatividade
  { url: 'https://amzn.to/3QO4ZqQ', title: 'Roube como um Artista — Austin Kleon', desc: 'Como criar seu próprio trabalho com base nas influências certas. 25.000 avaliações ★4.7.', cat: 'Criatividade', group: 'carreira' },
  { url: 'https://amzn.to/4exZSVz', title: 'Como Fazer Amigos e Influenciar Pessoas', desc: 'O guia de comunicação mais vendido de todos os tempos. 24.000 avaliações ★4.8.', cat: 'Comunicação', group: 'carreira' },
  { url: 'https://amzn.to/42MrQ8D', title: 'Negocie como se sua Vida Dependesse Disso', desc: 'Técnicas reais do FBI para negociar qualquer coisa. 5.000 avaliações ★4.8.', cat: 'Negociação', group: 'carreira' },
  // Finanças
  { url: 'https://amzn.to/4d6yD1K', title: 'A Psicologia Financeira — Morgan Housel', desc: 'Lições sobre fortuna, ganância e felicidade. #1 em Finanças, 27.000 avaliações ★4.8.', cat: 'Finanças', group: 'financa' },
  { url: 'https://amzn.to/3QFHS1D', title: 'O Homem Mais Rico da Babilônia', desc: 'O clássico das finanças pessoais. 48.000 avaliações ★4.9.', cat: 'Finanças', group: 'financa' },
];

@Component({
  selector: 'app-amazon-affiliate',
  templateUrl: './amazon-affiliate.component.html',
  styleUrls: ['./amazon-affiliate.component.css']
})
export class AmazonAffiliateComponent implements OnInit {
  @Input() group: string = 'ia';

  items: Book[] = [];

  ngOnInit(): void {
    const pool = this.group
      ? CATALOG.filter(b => b.group === this.group)
      : CATALOG;
    this.items = this.shuffle(pool).slice(0, 2);
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
