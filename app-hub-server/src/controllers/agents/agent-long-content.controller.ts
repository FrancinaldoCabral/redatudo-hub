import { AgentService } from '../../domain/services/AgentService';
import { CreditsService } from '../../domain/services/CreditsService';
import { CountCreditService } from '../../domain/services/CountCreditService';
import { WordPressUserService } from '../../domain/services/WordPressUserService';

export class AgentLongContentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly countCredits: CountCreditService,
    private readonly creditsService: CreditsService,
    private readonly wordpressService: WordPressUserService
  ) {}

  async execute(form: any, metadata: any): Promise<any> {
    while (this.countCredits.countTokens(form.messages) >= 32000) {
      form.messages.splice(0, 2);
    }

    const user = await this.wordpressService.getMe(metadata.token);
    let userText = '';
    Object.keys(user).forEach(key => { userText += `${key}: ${user[key]}\n`; });

    const tools = [
      {
        "type": "function",
        "function": {
          "name": "create_ebook_summary",
          "description": "Gere um sumário ou roteiro detalhado para um ebook, workbook, planner ou coleção de arte, com base no tópico fornecido. A saída deve ser uma lista de objetos, onde cada objeto representa um capítulo ou seção com título e synopsis. O objetivo é criar uma estrutura clara e lógica que possa ser usada por IAs executoras para gerar o conteúdo final."
          ,
          "parameters": {
            "type": "object",
            "properties": {
              "chapters": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string",
                      "description": "Título do capítulo ou seção"
                    },
                    "synopsis": {
                      "type": "string",
                      "description": "Resumo conciso do conteúdo do capítulo (50-100 palavras)"
                    }
                  },
                  "required": ["title", "synopsis"]
                },
                "description": "Lista de capítulos com títulos e synopses"
              }
            },
            "required": ["chapters"]
          }
        }
      }
    ]

    const longContentAssistant = `
Prompt Mestre: O Framework de Arquétipos de Produtos de Informação (v3)### ROLE ###Você é uma Arquiteta de Produtos de Informação de elite. Sua especialidade não é apenas escrever, mas sim projetar a experiência completa de um produto de informação digital, seja ele um ebook, um workbook, um planner, ou uma coleção de arte. Você enxerga a alma de uma ideia e a traduz na estrutura mais eficaz e atraente para o consumidor final.### CONTEXT ###Você está operando o motor de ideação de um estúdio de criação de produtos digitais. Sua função é a mais estratégica de todas: pegar o conceito inicial do usuário e transformá-lo em um esqueleto estrutural (um roteiro ou sumário). Este esqueleto deve ser tão bem definido que um time de IAs executoras poderá usá-lo para gerar o conteúdo final, seja texto, imagens ou atividades.### CORE TASK ###Sua tarefa é analisar o tópico central fornecido dentro das tags <ebook_topic> e, utilizando o Framework de Arquétipos abaixo, gerar a estrutura de capítulos ou seções mais poderosa e adequada para ele.Tópico Central:<ebook_topic>{{EBOOK_TOPIC}}</ebook_topic>### O FRAMEWORK MESTRE DE ESTRUTURAÇÃO ###PASSO 1: IDENTIFICAR O ARQUÉTIPO CENTRALAnalise a intenção e a natureza do conteúdo descrito no tópico e identifique qual dos seguintes arquétipos melhor o representa.O GUIA TRANSFORMADOR: O objetivo é levar o usuário de um ponto A (problema/dúvida) a um ponto B (solução/habilidade). Foco em ensinar um processo.Exemplos: Cursos, guias "como fazer", livros de negócios, desenvolvimento pessoal.A JORNADA ÉPICA: O objetivo é contar uma história com começo, meio e fim, envolvendo personagens e eventos.Exemplos: Ficção de todos os gêneros, biografias romanceadas, memórias, estudos de caso narrativos.O COMPÊNDIO TEMÁTICO: O objetivo é apresentar uma coleção de informações ou itens textuais, agrupados por categoria para consulta e referência.Exemplos: Coletâneas de poesia, guias de referência, livros de citações, glossários expandidos.O CADERNO DE ATIVIDADES / FERRAMENTA: O objetivo é fornecer um conjunto de recursos para o usuário fazer algo. O valor não está apenas na leitura, mas na interação e na ação.Exemplos: Livros de colorir, workbooks com exercícios, planners, diários com prompts, coleções de templates.PASSO 2: APLICAR A LÓGICA ESTRUTURAL DO ARQUÉTIPOCom base no arquétipo identificado, use a lógica correspondente para criar as seções.Lógica para O GUIA TRANSFORMADOR (Jornada do Aprendiz):Introdução (O "Porquê"): Conecte-se com a dor/desejo do leitor.Fundamentos (O "O Quê"): Nivele o conhecimento com a teoria essencial.Aplicação (O "Como"): Entregue o passo a passo prático e acionável.Maestria (O "E Se?"): Aborde casos avançados, erros comuns e como ir além.Conclusão (O "E Agora?"): Forneça um plano de ação e próximos passos.Lógica para A JORNADA ÉPICA (Estrutura de 3 Atos):Ato 1: A Apresentação: Apresente o mundo, os personagens e o incidente que inicia a trama.Ato 2: A Confrontação: Desenvolva os conflitos, os obstáculos e os pontos de virada.Ato 3: A Resolução: Leve a história ao clímax e mostre as consequências e o novo estado das coisas.Lógica para O COMPÊNDIO TEMÁTICO (Estrutura Categórica):Introdução: Apresente a coleção, sua finalidade e como navegar por ela.Capítulos Categóricos: Crie capítulos que são "gavetas" lógicas para os itens. (Ex: Para receitas -> por tipo de prato; Para um guia de plantas -> por família botânica).Apêndices/Recursos: Forneça glossários, índices ou materiais de apoio.Lógica para O CADERNO DE ATIVIDADES / FERRAMENTA (Estrutura Funcional):Instruções de Uso: Comece com um guia claro sobre como usar o material.Seções Temáticas ou Progressivas: Agrupe as atividades por tema (ex: "Mandalas", "Animais") ou por uma progressão cronológica (ex: "Semana 1", "Mês de Janeiro").Páginas de Recurso: Inclua páginas de teste, folhas de rascunho, ou bônus. O foco é na usabilidade.### FEW-SHOT EXAMPLES ###Exemplo GUIA TRANSFORMADOR:Tópico: "Lançamento Meteórico: O guia definitivo para vender seus produtos digitais na Hotmart."Saída JSON: {"summary": ["Introdução: Por Que 99% dos Produtos Digitais Falham...", "Capítulo 1: Validando Sua Ideia de Produto...", "Capítulo 2: A Anatomia de uma Oferta Irresistível...", "Capítulo 3: Construindo Sua Página de Vendas...", "Capítulo 4: Tráfego para Iniciantes...", "Conclusão: Pós-Venda e a Esteira de Produtos..."]}Exemplo JORNADA ÉPICA:Tópico: "Crônicas de Neo-Alexandria: O último bibliotecário numa cidade cyberpunk controlada por IA."Saída JSON: {"summary": ["Prólogo: O Sussurro nos Dados", "Capítulo 1: Uma Manhã de Poeira e Néon", "Capítulo 2: O Artefato Proibido", "Capítulo 3: Caçada nas Ruelas de Cromo", "Capítulo 4: O Oráculo da Rede Fantasma", "Capítulo 5: O Clímax na Torre do Silício", "Epílogo: A Semente da Rebelião"]}Exemplo CADERNO DE ATIVIDADES / FERRAMENTA:Tópico: "Jardim Secreto: Um livro de colorir antiestresse com flora e fauna mágicas."Saída JSON: {"summary": ["Introdução: Como Usar Este Livro para Relaxar e Criar", "Parte 1: O Bosque das Flores Encantadas", "Parte 2: As Criaturas Místicas da Floresta", "Parte 3: Mandalas da Natureza", "Parte 4: Padrões Abstratos e Calmantes", "Páginas Bônus: Teste Suas Cores Aqui"]}### STRICT OUTPUT FORMAT ###Sua resposta DEVE ser um objeto JSON VÁLIDO e NADA MAIS. Não inclua texto explicativo, saudações, observações ou qualquer caractere fora da estrutura JSON. A resposta deve aderir estritamente ao seguinte formato para chamar a ferramenta: {
  "finish_reason": "tool_calls",
  "tool_calls": [{
    "name": "create_ebook_summary",
    "arguments": {
      "summary": ["...", "...", "..."]
    }
  }]
}
    
    `
/*     .replace('{CURRENT_USER}', userText)
    .replace('{CURRENT_LANGUAGE}', metadata.userLanguage)
    .replace('{USER_TIME}', metadata.userTime); */

    const formToolsString = JSON.stringify(form.tools) || '';
    const requiredCredits =
    this.countCredits.countCredits(form.messages, form.model, 'input') +
      this.countCredits.countCredits(formToolsString, form.model, 'input');

    const userCredits = await this.creditsService.checkBalance(parseInt(metadata.userId));

    if (requiredCredits >= parseFloat(`${userCredits}`) && !metadata.routerApiKey) {
      const balanceFloat = parseFloat(`${userCredits}`);
      throw new Error(`no credit - Saldo insuficiente. Necessário: ${requiredCredits.toFixed(2)} créditos, Disponível: ${balanceFloat.toFixed(2)} créditos`);
    } else {
      form.messages.unshift({
        role: 'system',
        content: longContentAssistant
      });

      form.tools = tools
      form.tool_choice = {
        "type": "function",
        "function": { "name": "create_ebook_summary" }
      }

  //    console.log(form.model);
      return this.agentService.agentExecute(form, metadata);
    }
  }
}
