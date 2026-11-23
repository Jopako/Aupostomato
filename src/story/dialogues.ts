import { LOAN_OPTIONS, loanDebt } from '../game/state';
import { PRIZE } from './data';
import { Ctx, Dialogue, Line } from './types';

const L = (who: string, text: string): Line => ({ who, text });
const has = (c: Ctx, item: string) => c.story.items.includes(item);
const flag = (c: Ctx, k: string) => !!c.story.flags[k];
const clue = (c: Ctx, id: string) => c.meta.clues.includes(id);
const brl = (n: number) => `$${n.toLocaleString('pt-BR')}`;

export const DIALOGUES: Record<string, Dialogue> = {
  // ---------------------------------------------------------------- abertura
  intro: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Narrador', 'Cassino Ônix. Três anos depois.'),
          L('Capri', 'A placa dourada continua a mesma. O meu nome, que já esteve gravado nela, foi raspado.'),
          L('Capri', 'Eu já tive tudo isso, e perdi tudo. Mas sorte é como uma pilha: o que foi empilhado uma vez pode ser empilhado de novo.'),
          L('Vício', 'Só uma mão. Uma. Prometo.'),
          L('Narrador', 'Ao lado da porta, um cartaz anuncia a noite. Capri nem precisa chegar perto para sentir o cheiro de dinheiro.'),
        ],
      },
    },
  },

  // ---------------------------------------------------------------- rua
  rua_cartaz: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Narrador', 'NOITE DOS MAGNATAS. Evento privado. Somente convidados. Traje a rigor.'),
          L('Capri', 'Traje a rigor. Eu estou de camisa suada e com um sapato que já viu dias melhores.'),
          L('Capri', 'Preciso de três coisas: um convite, uma roupa decente e uma cara de pau da altura do prédio.'),
        ],
      },
    },
  },
  rua_letreiro: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Capri', 'CASSINO ÔNIX. As letras neon piscam como se piscassem só para mim.'),
          L('Vício', 'Ela está chamando você.'),
          L('Capri', 'É um letreiro. Mas eu entendo a mensagem.'),
        ],
      },
    },
  },
  rua_lixeira: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Capri', 'Um bilhete de loteria amassado. Perdedor, claro.'),
          L('Capri', 'Guardo? Não. Eu não preciso de mais lembranças de como termina.'),
        ],
      },
    },
  },
  banco_isqueiro: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Capri', 'Algo brilha entre as ripas do banco... Um isqueiro dourado, com um "N" gravado.'),
          L('Capri', 'Alguém vai sentir falta disso. Ou vai pagar bem para recuperá-lo.'),
        ],
        effects: [{ k: 'give', item: 'isqueiro' }],
      },
    },
  },
  banco_vazio: {
    start: 'a',
    nodes: { a: { lines: [L('Capri', 'O banco onde já dormi uma noite inteira depois de perder tudo. Está mais duro do que eu lembrava.')] } },
  },

  // ---------------------------------------------------------------- Brutus
  brutus: {
    start: 'a',
    nodes: {
      a: {
        lines: [L('Brutus', 'Boa noite. Evento privado. Nome na lista?')],
        choices: [
          { text: '"Capri."', next: 'nome' },
          { text: '"Me deixa entrar, por favor."', next: 'pede' },
          { text: 'Mostrar o convite do Conde Ottoni.', next: 'convite_sem', if: (c) => has(c, 'convite') && !flag(c, 'smoking') },
          { text: 'Mostrar o convite do Conde Ottoni.', next: 'convite', if: (c) => has(c, 'convite') && flag(c, 'smoking') },
          { text: 'Oferecer uma gorjeta.', next: 'gorjeta' },
          { text: 'Dar uma volta.', next: null },
        ],
      },
      nome: {
        lines: [
          L('Brutus', 'Capri... Não tem. Mas o nome me é familiar. Você não é aquele que perdeu a cobertura na mesa cinco?'),
          L('Capri', 'Um detalhe irrelevante.'),
          L('Brutus', 'Circule.'),
        ],
      },
      pede: {
        lines: [L('Brutus', 'O seu sapato fala por você, amigo. Circule.')],
      },
      gorjeta: {
        lines: [
          L('Narrador', 'Capri revira os bolsos com a dignidade de um príncipe falido.'),
          L('Capri', 'Eu tenho... um clipe de papel.'),
          L('Brutus', 'Guarde. Vai precisar mais do que eu.'),
        ],
      },
      convite_sem: {
        lines: [
          L('Brutus', 'Conde Ottoni Brandão ou representante... O convite é autêntico. Mas o senhor está vestido de... isso.'),
          L('Brutus', 'Traje a rigor. Está escrito. Resolve isso e volte.'),
          L('Capri', 'Preciso achar uma roupa decente. De preferência uma que já tenha dono rico.'),
        ],
      },
      convite: {
        lines: [
          L('Brutus', 'Conde Ottoni Brandão ou representante.'),
          L('Brutus', 'O Conde tem 74 anos, bengala e gota. O senhor tem o quê, 30?'),
          L('Vício', 'Diz que é ele. Diz que é ele.'),
        ],
        choices: [
          { text: '"Eu sou o Conde."', next: 'conde' },
          { text: '"Sou o sobrinho. Ele mandou um representante."', next: 'ok' },
          { text: 'Desistir por agora.', next: null },
        ],
      },
      conde: {
        lines: [
          L('Brutus', 'O Conde tem 74 anos, uma bengala e cara de quem nunca deve dinheiro. O senhor tem cara de quem deve para três pessoas.'),
          L('Capri', 'Quatro, na verdade.'),
          L('Brutus', 'Tente de novo, mas com uma história melhor.'),
        ],
      },
      ok: {
        lines: [
          L('Brutus', 'Representante... Faz sentido. O Conde disse que mandaria alguém.'),
          L('Brutus', 'Entre, sobrinho. E não encoste em nada que brilhe.'),
          L('Capri', 'Eu nunca encosto. Eu aposto.'),
        ],
        effects: [{ k: 'enter' }, { k: 'dialogue', id: 'chegada' }],
      },
    },
  },
  brutus_volta: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Brutus', 'De novo você? Entra logo, antes que a Madame veja que eu deixei.'),
          L('Capri', 'Obrigado, Brutus.'),
          L('Brutus', 'Não agradeça. Só tenta perder mais devagar.'),
        ],
        effects: [{ k: 'enter' }, { k: 'dialogue', id: 'agiota_emprestimo' }],
      },
    },
  },

  // ---------------------------------------------------------------- beco
  nando: {
    start: (c) => {
      if (flag(c, 'nandoHelped')) return flag(c, 'smoking') ? 'pos_vestido' : 'pos_ajuda';
      return has(c, 'isqueiro') ? 'tem_fogo' : 'fogo';
    },
    nodes: {
      fogo: {
        lines: [
          L('Nando', 'Ei, você! Tem fogo? Meu isqueiro sumiu na troca de turno e a Madame não deixa fumar lá dentro.'),
          L('Capri', 'Não tenho. Mas posso procurar.'),
          L('Nando', 'Se achar, eu faço valer a pena. Eu sei de tudo que acontece por trás dessa porta.'),
        ],
      },
      tem_fogo: {
        lines: [L('Nando', 'Ei, você! Tem fogo? Meu isqueiro sumiu...')],
        choices: [
          { text: 'Entregar o isqueiro dourado.', next: 'troca' },
          { text: 'Ainda não.', next: null },
        ],
      },
      troca: {
        lines: [
          L('Capri', 'Dourado, com um "N" gravado.'),
          L('Nando', 'É o meu! Onde achou?'),
          L('Capri', 'Num banco da rua. Entre as ripas.'),
          L('Nando', 'Sorte a minha. Escuta: o Conde Ottoni Brandão cancelou em cima da hora, gota nos pés. O convite dele ia pro lixo. Pega.'),
          L('Nando', 'Vale para "o Conde ou representante". E o smoking do homem está no furgão da lavanderia. O motorista é chato, mas eu dou uma tossida e você pega.'),
          L('Narrador', 'Capri recebe o convite do Conde Ottoni Brandão.'),
        ],
        effects: [{ k: 'remove', item: 'isqueiro' }, { k: 'give', item: 'convite' }, { k: 'flag', key: 'nandoHelped' }],
      },
      pos_ajuda: {
        lines: [
          L('Nando', 'Vai logo pro furgão, antes que o motorista volte. Quando eu tossir, é a sua deixa.'),
        ],
      },
      pos_vestido: {
        lines: [
          L('Nando', 'Bem-vestido! Parece até gente. Fala pro Brutus que é sobrinho. O Conde é velho demais pra ser você.'),
          L('Nando', 'Depois que entrar, se precisar de informação, procura o Lúcio, no bar. Ele escuta mais do que serve.'),
        ],
      },
    },
  },
  furgao: {
    start: (c) => {
      if (flag(c, 'smoking')) return 'vazio';
      return flag(c, 'nandoHelped') ? 'pega' : 'bloqueado';
    },
    nodes: {
      bloqueado: {
        lines: [
          L('Motorista', 'Ei! Sai daí, moleque. Esse furgão é da Lavanderia Cisne!'),
          L('Capri', 'Preciso de uma distração. Ou de um amigo.'),
        ],
      },
      pega: {
        lines: [
          L('Narrador', 'Nando tosse tão alto que o motorista corre para ajudar.'),
          L('Capri', 'Entre os cabides, um smoking com etiqueta: "Conde O. Brandão". Perfeito. Largo nos ombros, mas perfeito.'),
          L('Narrador', 'Capri veste o smoking atrás do furgão. Ele nunca esteve tão elegante, nem tão culpado.'),
        ],
        effects: [{ k: 'flag', key: 'smoking' }, { k: 'toast', text: 'Você está de smoking.' }],
      },
      vazio: {
        lines: [L('Capri', 'Só sobraram toalhas e um guarda-chuva. Ótimo. Já peguei o que importa.')],
      },
    },
  },
  beco_lixeira: {
    start: 'a',
    nodes: {
      a: {
        lines: [L('Capri', 'Restos de caviar e uma lata de atum. A classe não depende do ingrediente.')],
      },
    },
  },
  beco_porta: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Capri', 'Trancada por dentro. Uma porta de serviço assim só abre para quem mora do lado de lá.'),
        ],
      },
    },
  },

  // ---------------------------------------------------------------- salão
  chegada: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Narrador', 'O Salão Ônix. Lustres de cristal, veludo vermelho, cheiro de charuto e perfume caro.'),
          L('Capri', 'Três anos e nada mudou. Exceto eu.'),
          L('Narrador', 'No canto, uma figura conhecida ergue o copo na direção de Capri.'),
        ],
        effects: [{ k: 'dialogue', id: 'agiota_emprestimo' }],
      },
    },
  },
  agiota_emprestimo: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Tio Juros', 'Capriii! Meu cliente favorito. O único que me pagou até o último centavo... quando estava rico.'),
          L('Capri', 'Hoje eu não estou rico, Tio Juros.'),
          L('Tio Juros', 'Eu sei. Dá para sentir pelo cheiro do sapato. Mas dinheiro é igual a pilha, meu jovem: quem não tem base, não empilha nada.'),
          L('Tio Juros', 'Posso te emprestar. A taxa depende do tamanho do sonho.'),
        ],
        choices: LOAN_OPTIONS.map((o, i) => ({
          text: `Pegar ${brl(o.amount)} (devolver ${brl(Math.ceil(o.amount * (1 + o.rate)))})`,
          next: 'fechado',
          effects: [{ k: 'loan' as const, option: i }],
        })).concat([{ text: 'Ainda estou pensando.', next: 'depois', effects: [] }]),
      },
      fechado: {
        lines: (c) => [
          L('Tio Juros', `Fechado. Você deve ${brl(c.run?.debt ?? 0)}. Quando você derrubar a terceira mesa, eu passo para cobrar uma parte.`),
          L('Tio Juros', 'Não me faça ir buscar. Eu sou educado, mas meus sobrinhos não.'),
          L('Capri', 'Entendido.'),
          L('Vício', 'Vamos jogar!'),
        ],
      },
      depois: {
        lines: [L('Tio Juros', 'Pense rápido. As mesas não esperam, e eu também não.')],
      },
    },
  },
  agiota_conversa: {
    start: 'a',
    nodes: {
      a: {
        lines: (c) => [
          L('Tio Juros', c.run && c.run.debt > 0 ? `Você me deve ${brl(c.run.debt)}. Eu não esqueço.` : 'Estamos quites. Que raro, e que bonito.'),
        ],
        choices: [
          { text: 'Pagar $100 agora.', next: 'pago', effects: [{ k: 'pay', amount: 100 }], if: (c) => !!c.run && c.run.debt > 0 && c.run.money >= 100 },
          { text: 'Quitar toda a dívida.', next: 'pago', effects: [{ k: 'pay', amount: 'all' }], if: (c) => !!c.run && c.run.debt > 0 && c.run.money >= c.run.debt },
          { text: 'Perguntar sobre o cassino.', next: 'cassino' },
          { text: 'Sair.', next: null },
        ],
      },
      pago: { lines: [L('Tio Juros', 'Um prazer fazer negócio com quem paga.')] },
      cassino: {
        lines: [
          L('Tio Juros', 'A Madame Ônix? Só digo isto: ninguém dá uma festa dessas por amor aos ricos. Fique de olho nas mesas dos fundos.'),
        ],
      },
    },
  },
  agiota_clue: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Tio Juros', 'Você anda derrubando gente grande, Capri. Gosto disso. Deixa eu te dizer uma coisa de graça, mas só uma vez.'),
          L('Tio Juros', 'A Madame Ônix me deve uma fortuna. Uma fortuna que ela nunca terá... a não ser que alguém empilhe milhões nos bolsos dela esta noite.'),
          L('Capri', 'A Noite dos Magnatas...'),
          L('Tio Juros', 'Exatamente. Convidados ricos, mesas manipuladas, e eu esperando do lado de fora com a caderneta. Toma o contrato.'),
          L('Narrador', 'Capri guarda no bolso um contrato assinado por Madame Ônix.'),
        ],
        effects: [{ k: 'clue', id: 'clue_contrato' }],
      },
    },
  },
  cobranca: {
    start: 'a',
    nodes: {
      a: {
        lines: (c) => [
          L('Narrador', 'Três mesas derrubadas. Uma sombra larga cobre o tapete de Capri.'),
          L('Tio Juros', `Capri! Hora de acertar parte da conta. Você deve ${brl(c.run?.debt ?? 0)}.`),
        ],
        choices: [
          {
            text: 'Quitar tudo.',
            next: 'tudo',
            effects: [{ k: 'cobranca', mode: 'all' }],
            if: (c) => !!c.run && c.run.money >= c.run.debt,
          },
          {
            text: 'Pagar a metade (os juros sobem 15% sobre o resto).',
            next: 'metade',
            effects: [{ k: 'cobranca', mode: 'half' }],
            if: (c) => !!c.run && c.run.money >= Math.ceil(c.run.debt / 2),
          },
          { text: 'Não tenho. Peço mais tempo.', next: 'nada', effects: [{ k: 'cobranca', mode: 'none' }] },
        ],
      },
      tudo: { lines: [L('Tio Juros', 'Impressionante. Raro, e bonito. Estamos quites, jovem.')] },
      metade: { lines: [L('Tio Juros', 'Metade agora, o resto com juros depois. Gosto de um cliente que não foge.')] },
      nada: {
        lines: [
          L('Tio Juros', 'Sem dinheiro, aceito garantia. Meus sobrinhos vão escolher algo seu. Se você não tiver nada de valor... os juros sobem 20%.'),
          L('Capri', '(Eu devia ter ficado na calçada.)'),
        ],
      },
    },
  },

  // ---------------------------------------------------------------- bar
  lucio: {
    start: (c) => (c.run && c.run.tableIndex >= 1 && !clue(c, 'clue_guardanapo') ? 'clue' : 'menu'),
    nodes: {
      menu: {
        lines: [L('Lúcio', 'O que vai ser? Eu sirvo bebida, informação e, quando você precisa, um pouco de juízo.')],
        choices: [
          { text: 'Ver o caderno de dicas (melhorias permanentes).', next: null, effects: [{ k: 'metashop' }] },
          { text: 'Conversar.', next: 'papo' },
          { text: 'Sair.', next: null },
        ],
      },
      papo: {
        lines: (c) => [
          L('Lúcio', c.meta.enteredOnce && c.meta.runs > 1
            ? 'Você de novo. Quem cai e volta sempre aprende alguma coisa. Quem cai e volta sem aprender, vira decoração.'
            : 'Se você perder aqui, não perde só o dinheiro. Perde a hora, a dignidade e a fé na própria sorte.'),
          L('Lúcio', 'O Caderno guarda o que os que caíram antes de você aprenderam. Paga em fichas douradas, que você ganha caindo ou vencendo.'),
        ],
        next: 'menu',
      },
      clue: {
        lines: [
          L('Lúcio', 'Você derrubou a Cecília. Isso é raro. Olha o que eu anoto, num guardanapo, para não enlouquecer.'),
          L('Lúcio', 'Todos os convidados que sentaram nas mesas dos fundos... perderam. Todos. Sempre por uma mão a menos do que as cartas diziam.'),
          L('Capri', 'Uma mão a menos? Isso é a regra da casa?'),
          L('Lúcio', 'Isso é a regra de uma casa que não gosta de perder. Fica com o guardanapo.'),
          L('Narrador', 'Capri guarda o guardanapo no bolso do smoking.'),
        ],
        effects: [{ k: 'clue', id: 'clue_guardanapo' }],
        next: 'menu',
      },
    },
  },

  // ---------------------------------------------------------------- mesa / Cecília
  mesa_sem_fichas: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Cecília', 'Sem fichas, sem mesa, Capri.'),
          L('Capri', 'Estou providenciando.'),
          L('Cecília', 'O Tio Juros está no canto. Ele sempre providencia.'),
        ],
      },
    },
  },
  cecilia_tutorial: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Cecília', 'Sente, Capri. Vou te lembrar das regras da casa, porque este ano elas mudaram.'),
          L('Cecília', 'Este ano a mão não fica na sua mão. As cartas ficam espalhadas pelo salão, e você anda até elas: WASD ou as setas.'),
          L('Cecília', 'Pisar numa carta é "a": o Autômato a empilha. Pisar numa porta é "b": ele desempilha a carta do topo e ela vai para a sua mão. O portal é "c", e só abre com a pilha vazia.'),
          L('Cecília', 'A pilha é LIFO: a última carta que você pegou é a primeira que sai. Monte a melhor mão de poker com as cartas entregues; a ordem não muda a combinação, mas a profundidade da pilha aumenta o multiplicador.'),
          L('Capri', 'E se eu me enrolar no caminho?'),
          L('Cecília', 'Z desfaz o último passo importante, R recomeça o percurso. E no botão Autômato você pode digitar roteiros e ver a máquina pensar. Boa sorte.'),
        ],
        effects: [{ k: 'flag', key: 'tutorial_done' }, { k: 'match' }],
      },
    },
  },
  cecilia_confissao: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Cecília', 'Capri... posso falar uma coisa? Rápido, antes que o Autômato leia meus lábios.'),
          L('Cecília', 'O salão não é justo. A pilha do Autômato paga o bônus cheio só para a casa. Para os convidados, ela escorrega pela metade.'),
          L('Capri', 'Por que está me contando?'),
          L('Cecília', 'Porque meu filho foi um desses convidados, anos atrás. Ele perdeu a faculdade, o carro, a mãe de quem eu cuidava. Não conta que fui eu.'),
          L('Narrador', 'Cecília desliza um cartão marcado pela mesa. Capri entende o que isso significa.'),
        ],
        effects: [{ k: 'clue', id: 'clue_baralho' }],
      },
    },
  },
  mesa_fim: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Cecília', 'Não sobrou ninguém no salão para você. Só a Madame, no escritório, ao lado do bar.'),
          L('Cecília', 'Se for lá, vá preparado. Ela não perde.'),
        ],
      },
    },
  },

  // ---------------------------------------------------------------- flavor salão
  lustre: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Capri', 'O lustre de cristal. Dizem que cada pingente custa mais do que um carro.'),
          L('Vício', 'E quanto vale uma mão de straight flush?'),
        ],
      },
    },
  },
  convidados: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Convidada', '...e eu disse ao meu contador: se ele não consegue esconder, não é contador, é testemunha.'),
          L('Convidado', 'Hahaha! Mais champanhe!'),
          L('Capri', 'Ninguém aqui está nem aí para o que acontece nas mesas dos fundos. Isso me interessa.'),
        ],
      },
    },
  },
  escritorio_trancado: {
    start: 'a',
    nodes: {
      a: {
        lines: [
          L('Capri', 'A porta do escritório da Madame. Fechadura de ouro, dois seguranças e um bilhete: "Só passa quem derrubou o salão inteiro."'),
          L('Vício', 'Então vamos derrubar o salão.'),
        ],
      },
    },
  },

  // ---------------------------------------------------------------- serviço
  caixote: {
    start: (c) => {
      if (clue(c, 'clue_engrenagem')) return 'ja';
      return c.run && c.run.tableIndex >= 2 ? 'clue' : 'trancado';
    },
    nodes: {
      trancado: {
        lines: [
          L('Capri', 'Um caixote com cadeado grosso e uma etiqueta ilegível.'),
          L('Nando', '(sussurrando) Volta quando tiver mais mesas no currículo, sobrinho. Aí eu abro o cadeado.'),
        ],
      },
      clue: {
        lines: [
          L('Narrador', 'O cadeado está aberto. Nando deixou, e já sumiu pelo corredor.'),
          L('Capri', 'Engrenagens, correias, uma pilha de cartas gravadas... e um manual: "Autômato P.D.A. — Pilha Dupla Automática, Mesa dos Fundos".'),
          L('Capri', 'Aqui: "A primeira leitura da noite é sempre corrigida para baixo, a critério da casa."'),
          L('Capri', 'Então é por isso que a primeira mão nunca presta.'),
        ],
        effects: [{ k: 'clue', id: 'clue_engrenagem' }],
      },
      ja: {
        lines: [L('Capri', 'O caixote do Autômato. Já vi o que precisava.')],
      },
    },
  },
  nando_servico: {
    start: 'a',
    nodes: {
      a: {
        lines: (c) => [
          L('Nando', c.run && c.run.tableIndex >= 2
            ? 'Eu abri o caixote. Não vi nada, não ouvi nada e vou continuar não vendo nem ouvindo.'
            : 'A Madame vigia tudo daqui de dentro. Volta quando for mais conhecido por aqui.'),
        ],
      },
    },
  },
  cabides: {
    start: 'a',
    nodes: {
      a: {
        lines: [L('Capri', 'Paletós, coletes, uma peruca verde. Toda noite elegante tem o seu segredo.')],
      },
    },
  },

  // ---------------------------------------------------------------- escritório / chefe
  onix_confronto: {
    start: 'a',
    nodes: {
      a: {
        lines: (c) => {
          const n = ['clue_guardanapo', 'clue_engrenagem', 'clue_baralho'].filter((id) => clue(c, id)).length;
          const lines: Line[] = [
            L('Narrador', 'O escritório é um relógio gigante: engrenagens nas paredes, pilhas de fichas no teto. No centro, uma mesa e uma mulher de preto.'),
            L('Madame Ônix', 'Capri. O jovem prodígio de três anos atrás. Eu esperava por você.'),
            L('Madame Ônix', 'Sente. O Autômato adora o seu estilo. Ele lê cada carta que você toca.'),
          ];
          if (n === 0) lines.push(L('Capri', '(Eu não sei como ele funciona. Isso vai doer.)'));
          else if (n < 3) lines.push(L('Capri', `(Eu descobri ${n} das 3 trapaças. Não é tudo, mas já ajuda.)`));
          else lines.push(L('Capri', 'Eu sei como o Autômato trapaceia. Guardanapo, caixote, confissão. Está tudo aqui.'));
          if (n >= 3) lines.push(L('Madame Ônix', '...Quem falou? Foi a Cecília? Ah, não importa. Vamos jogar mesmo assim.'));
          return lines;
        },
        effects: [{ k: 'flag', key: 'onix_intro' }, { k: 'match' }],
      },
    },
  },
  madame: {
    start: 'a',
    nodes: {
      a: {
        lines: [L('Madame Ônix', 'Sente, Capri. A noite é longa e a pilha é funda.')],
        choices: [{ text: 'Sentar à mesa.', next: null, effects: [{ k: 'match' }] }, { text: 'Ainda não.', next: null }],
      },
    },
  },
  automato: {
    start: 'a',
    nodes: {
      a: {
        lines: (c) => {
          const out: Line[] = [L('Capri', 'O Autômato: uma máquina enorme de engrenagens, correias e um visor onde pilhas de fichas sobem e descem.')];
          if (clue(c, 'clue_engrenagem')) out.push(L('Capri', 'Reconheço o modelo: P.D.A., Pilha Dupla Automática. Igual ao do manual.'));
          if (clue(c, 'clue_contrato')) out.push(L('Capri', 'E agora sei para quem ele trabalha: para pagar a dívida da dona.'));
          return out;
        },
      },
    },
  },
  boss_win: {
    start: 'a',
    nodes: {
      a: {
        lines: (c) => {
          const out: Line[] = [
            L('Narrador', 'O visor do Autômato pisca, trava e apaga. Uma engrenagem cai no chão e rola até os sapatos de Capri.'),
            L('Madame Ônix', 'Impossível. Eu desenhei cada engrenagem dessa máquina.'),
            L('Capri', 'Você desenhou a máquina. Mas esqueceu que a pilha sempre pode ser desempilhada.'),
            L('Madame Ônix', 'Você foi meu primeiro teste, sabia? Sete vitórias seguidas, dez, vinte. A pilha estava a seu favor. Quando você se achou invencível... bastou virar a pilha.'),
            L('Capri', 'Eu não perdi por burrice. Perdi porque você virou a pilha.'),
            L('Madame Ônix', 'Você perdeu porque continuou apostando, querido.'),
            L('Capri', '...Isso eu não posso negar.'),
          ];
          if (clue(c, 'clue_contrato')) {
            out.push(L('Capri', 'E a Noite dos Magnatas era só o jeito de pagar o que você devia ao Tio Juros. Com o dinheiro dos convidados.'));
            out.push(L('Madame Ônix', 'Era o único jeito. Você nunca vai entender o peso de uma dívida de verdade.'));
            out.push(L('Capri', 'Eu entendo mais do que você imagina.'));
          }
          out.push(L('Narrador', 'No cofre da casa, o prêmio da noite: fichas douradas empilhadas até o teto. Tio Juros pigarreia na porta, caderneta em punho.'));
          return out;
        },
        next: 'final',
      },
      final: {
        lines: (c) => [
          L('Narrador', `O prêmio é de ${brl(PRIZE)}. Capri ainda deve ${brl(c.run?.debt ?? 0)} ao Tio Juros.`),
          L('Vício', 'Aposta tudo. Mais uma. Só mais uma.'),
          L('Capri', '...'),
        ],
        choices: [
          { text: 'Quitar a dívida, pegar o que sobrou e ir embora.', next: null, effects: [{ k: 'ending', id: 'sair' }] },
          { text: 'Só mais uma aposta... a última.', next: null, effects: [{ k: 'ending', id: 'ultima' }] },
        ],
      },
    },
  },
};

export function dialogueStart(d: Dialogue, c: Ctx): string {
  return typeof d.start === 'function' ? d.start(c) : d.start;
}

export function nodeLines(lines: Line[] | ((c: Ctx) => Line[]), c: Ctx): Line[] {
  return typeof lines === 'function' ? lines(c) : lines;
}

export { loanDebt };
