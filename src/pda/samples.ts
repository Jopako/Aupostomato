import { PDADefinition } from './pda';

/**
 * PDA clássico para L = { aⁿbⁿ | n ≥ 1 }. Não é usado no jogo: serve de
 * exemplo e de teste do motor genérico (src/pda/pda.ts).
 */
export const ANBN: PDADefinition = {
  name: 'L = { aⁿbⁿ | n ≥ 1 }',
  states: ['q0', 'q1', 'qf'],
  inputAlphabet: ['a', 'b'],
  stackAlphabet: ['Z', 'A'],
  initialState: 'q0',
  initialStack: 'Z',
  finalStates: ['qf'],
  transitions: [
    { id: 't1', from: 'q0', read: 'a', pop: 'Z', to: 'q0', push: ['A', 'Z'] },
    { id: 't2', from: 'q0', read: 'a', pop: 'A', to: 'q0', push: ['A', 'A'] },
    { id: 't3', from: 'q0', read: 'b', pop: 'A', to: 'q1', push: [] },
    { id: 't4', from: 'q1', read: 'b', pop: 'A', to: 'q1', push: [] },
    { id: 't5', from: 'q1', read: null, pop: 'Z', to: 'qf', push: ['Z'] },
  ],
};
