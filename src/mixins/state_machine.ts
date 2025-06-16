import { NS } from "@ns";

type Constructor<T = object> = new (...args: any[]) => T;
interface HasNS {
  ns: NS;
}

/* Transition type so that a script can define the transition table locally */
export type Transitions<S extends string> = Record<S, readonly S[]>;

export interface StateMachine {
  state: string;
  transition(nextState: string): void;
}

export function StateMachine<
  State extends string, // The state union type
  TBase extends Constructor<HasNS>, // The base class type
  >(allowedTransitions: Transitions<State>, initialState: State) {
  return (Base: TBase) =>
    class StateMachine extends Base {
      state: State;

      constructor(...args: any[]) {
        super(...args);
        this.state = initialState;
      }

      transition(nextState: State) {
        const allowed = allowedTransitions[this.state] || [];
        if (!allowed.includes(nextState)) {
          throw new Error(
            `Invalid transition from ${this.state} to ${nextState}`,
          );
        }
        if (typeof (this as any).LOG === 'function') {
          (this as any).LOG('INFO', 'STATE', `${this.state} => ${nextState}`)
        }
        this.state = nextState;
      }
    };
}
