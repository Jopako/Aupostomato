# Decisões tomadas na geração (para aprovação)

O documento de concepção diz que nada pendente é definitivo sem aprovação. Estas foram as escolhas
feitas para entregar um jogo completo. **Cada uma é fácil de trocar** (arquivo indicado).

## Regras
| Decisão | Onde trocar |
|---|---|
| ♥♦ = `a` (PUSH), ♣♠ = `b` (POP); ordem de clique = palavra lida | `src/game/cards.ts` (`symbolOf`) |
| Linguagem L = { aⁿbⁿ \| n ≥ 1 }, aceitação por estado final | `src/pda/pda.ts` (`ANBN`) |
| Efeito do PDA (RF10): cada POP = +10 fichas (mesmo se rejeitar); se aceitar, mult × (n+1) | `src/game/scoring.ts` |
| Carta Espelho inverte a↔b | `src/game/cards.ts`, `relics.ts` |
| 4 mãos, 3 descartes, 8 cartas na mão, até 5 jogadas | `src/game/match.ts` |
| 8 mesas, metas 500 → 16.000 (calibradas por simulação) | `src/game/opponents.ts` |
| Derrota encerra a tentativa; ganha Fichas Douradas p/ melhorias permanentes | `src/game/state.ts` |

## História
- **Entrada:** achar um isqueiro no banco → devolver ao garçom Nando → ele dá o convite do Conde Ottoni
  (que cancelou) → pegar o smoking do Conde no furgão da lavanderia → Brutus (segurança) deixa entrar
  como "sobrinho do Conde".
- **Agiota:** "Tio Juros" (nome meu). Empréstimos $300/$500/$800 com juros de 50/70/90%.
  Cobra parte da dívida depois da 3ª mesa (quitar, pagar metade ou perder uma relíquia/juros).
- **Personagens novos:** Brutus (segurança), Nando (garçom), Lúcio (bartender), Cecília (dealer),
  Madame Ônix (dona), e 6 adversários de mesa.
- **Mistério:** a casa trapaceia com o "Autômato P.D.A." para esvaziar os convidados e pagar a dívida da
  Madame com o Tio Juros. 4 pistas; 3 delas desativam trapaças da chefe.
- **Finais:** (1) quitar e sair; (2) aposta final dobro-ou-nada, que pode ser vitória ou derrota.
- **Nome do cassino:** "Ônix" (nome meu).

## Pendências suas
- Grafia final do logo (hoje: "Aupostomato").
- Arte definitiva (hoje: ilustrações SVG geradas por código) e áudio (hoje: sons sintetizados).
