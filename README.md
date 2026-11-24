<img width="975" height="194" alt="logo-github-transparente" src="https://github.com/user-attachments/assets/794cdcb6-105e-4b1d-a72a-149c08f9309f" />


<div align = "center">
  É um roguelike de construção de baralho que combina poker, exploração em mapas e investigação, tudo executado no navegador.

O projeto acadêmico coloca um **Autômato com Pilha (PDA)** no centro da jogabilidade: o jogador percorre uma mesa no mapa, empilha cartas, entrega-as pelas portas e só pode sair pelo portal com a pilha vazia. Essa mesma sequência é processada por um autômato, estado por estado, durante a partida.
</div>


## Jogabilidade

Você controla **Capri**, condenado a disputar mesas para pagar uma dívida ao Tio Juros. Entre uma mesa e outra, explore os cenários do cassino, converse com personagens e procure pistas que podem enfraquecer as trapaças da casa.

<img width="1444" height="741" alt="Captura de tela de 2026-11-24 08-00-55" src="https://github.com/user-attachments/assets/b65630ff-c535-402a-a2af-576d63e43172" />


### Percurso pela mesa

1. Ande pelas salas usando **WASD**, **setas** ou **clique em um tile**.
2. Pise em uma carta para executar `a` e empilhar a carta.
3. Pise em uma porta para executar `b` e retirar a carta do topo da pilha para a mão de poker.
4. Chegue ao portal com a pilha vazia para executar `c` e aceitar o percurso.
5. Pressione **Enter** para jogar a mão formada. Acompanhe a execução do PDA e a animação da pontuação; quando o total aparecer, pressione **Enter** novamente (ou clique em **Próxima mão**) para continuar.

<img width="904" height="544" alt="Captura de tela de 2026-11-24 08-01-59" src="https://github.com/user-attachments/assets/ca24da7b-34a8-4a53-a3c4-c9accdcb31a8" />


O jogador pode entregar até cinco cartas por mão. Em cada mapa há um **lixo**: pise nele com uma carta na pilha para descartá-la e receber uma carta nova na vaga correspondente. A mesa começa com **4 descartes de carta**, compartilhados entre todas as mãos; eles não são renovados ao iniciar outro mapa. É possível desfazer o último movimento com **Z** ou **Backspace**, reiniciar o percurso com **R** e solicitar uma nova distribuição com o botão de novo mapa.

Cada entrega rende **10 fichas**. Depois, a mão de poker soma fichas e multiplicadores das cartas, relíquias, nível das combinações e bônus das regras da mesa. Ao aceitar o percurso, o autômato aplica um multiplicador baseado na profundidade máxima alcançada pela pilha:

```text
pontuação final = (fichas da mão × multiplicador da mão) arredondado
multiplicador do PDA = 1 + 0,5 × profundidade máxima
```

O painel informa fichas, multiplicadores e todos os fatores do cálculo ao final de uma mão.



### Poker e progressão

As cartas podem formar Carta Alta, Par, Dois Pares, Trinca, Sequência, Flush, Full House, Quadra e Sequência do mesmo naipe. As combinações podem ser aprimoradas em nível na loja.

<img width="1811" height="655" alt="Captura de tela de 2026-11-24 08-30-57" src="https://github.com/user-attachments/assets/dd765c56-6390-45aa-a13b-1c059aeec0cd" />


Entre as mesas, o jogador pode:

- comprar até cinco relíquias com efeitos permanentes para a tentativa;
- elevar o nível de combinações de poker;
- aplicar melhorias às cartas;
- remover ou duplicar cartas do baralho;
- rerrolar as ofertas da loja;
- investigar pistas e aprender as regras e as fraudes da casa.

A campanha possui oito adversários, com mapas e regras progressivamente mais difíceis. Madame Ônix é a chefe final e pode usar trapaças como reduzir o número de mãos, alterar o bônus do PDA e desvalorizar a primeira jogada. As pistas obtidas podem neutralizar essas trapaças.

## O Autômato com Pilha

O PDA é implementado independentemente da interface em `src/pda/pda.ts` e `src/pda/mesaPda.ts`. Sua definição é:

```text
P = (Q, Σ, Γ, δ, q0, Z, F)

Q = {q0, q1, q2, q3, q4, q5, qf}
Σ = {a, b, c, d}
Γ = {X, Z}
q0 = estado inicial
Z  = símbolo inicial da pilha
F = {qf}
```

- **`a`** representa pisar em uma carta: empilha `X`.
- **`b`** representa pisar em uma porta: desempilha `X` e entrega uma carta à mão.
- **`d`** representa pisar no lixo: desempilha `X`, descarta a carta e repõe a vaga com uma nova carta.
- **`c`** representa entrar no portal: só ocorre com o símbolo inicial `Z` no topo, indicando pilha vazia.

Os estados `qi` indicam quantas cartas foram entregues, chegando de `q0` até `q5`. A pilha contém as cartas coletadas mas ainda não entregadas.

As principais transições são:

```text
δ(qi, a, Z) = (qi, XZ)     0 ≤ i ≤ 4
δ(qi, a, X) = (qi, XX)     0 ≤ i ≤ 4
δ(qi, b, X) = (q(i+1), ε)  0 ≤ i ≤ 4
δ(qi, d, X) = (qi, ε)      0 ≤ i ≤ 5
δ(qi, c, Z) = (qf, Z)      1 ≤ i ≤ 5
```

A linguagem aceita é composta por uma sequência balanceada de `a` (cartas), `b` (entregas) e `d` (descartes), com uma a cinco entregas `b`, seguida de `c`. O PDA controla a pilha; o limite de **4 descartes por mesa** é uma regra de jogo mantida entre as mãos:

```text
abc, aabbc, ababc, aadbc, ...
```

Não são aceitos percursos com portas ou lixo sem cartas empilhadas, fechamento do portal com cartas pendentes, mais de cinco entregas ou excesso de símbolos de fechamento.

Durante o jogo, o mapa é interpretado como uma entrada do autômato. Movimentos que não possuem uma transição válida são bloqueados e exibidos como uma mensagem explicativa. O painel do PDA mostra o estado atual, o símbolo lido, as transições executadas e o conteúdo da pilha em tempo real. Descartes disponíveis são compartilhados entre as mãos da mesma mesa; desfazer um descarte também restaura a carta e o uso.

A pilha segue a política **LIFO (último que entra, primeiro que sai)**: ao pisar em uma porta, sempre é entregue a carta mais recentemente empilhada.

### Laboratório do PDA

Na tela inicial ou no painel **⚙ Autômato**, é possível abrir o laboratório. Digite um roteiro com `a`, `b`, `c` e `d`, por exemplo `aadbc` (com descarte), e acompanhe cada configuração: estado, símbolo, transição e pilha.

O laboratório informa se a palavra foi **aceita** ou **rejeitada** e explica o motivo da travar. Também permite baixar o autômato em formato JFLAP `.jff`.

Na partida, os botões **Mostrar autômato** e **Ampliar autômato** permitem ocultar ou destacar a visualização sem interromper o jogo.

## Controles

| Ação | Controle |
|---|---|
| Andar | `W A S D`, setas ou clique no mapa |
| Jogar mão aceita pelo PDA | `Enter` |
| Desfazer movimento | `Z` ou `Backspace` |
| Reiniciar percurso | `R` |
| Ocultar/ampliar o PDA | Botões na partida |
| Reabrir instruções | **Guia rápido** |

## Executar localmente

Pré-requisitos: Node.js e npm.

```bash
npm install
npm run dev
```

Outros comandos:

```bash
npm test       # testes do PDA, poker, mesas, loja, mapas e roteiro
npm run build  # verificação de tipos e build para dist/
npm run preview
npm run sim    # simulação de equilíbrio
```

Exemplo de simulação:

```bash
npm run sim -- 200 1 0
```

Os argumentos representam, respectivamente, número de partidas, nível do empréstimo e quantidade de pistas.

O jogo usa salvamento automático no navegador e inclui testes e feedback visual para relacionar diretamente a teoria dos autômatos com as decisões da jogabilidade.
