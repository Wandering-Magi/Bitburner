import { Base } from "./extender";
import { LogLevel } from "./logger";

type Constructor<T = object> = new (...args: any[]) => T;
type State = string;
type Transitions<T extends string> = Record<T, T[]>;
type StateHandlers<T extends string> = Record<T, () => void>;

/* Transition type so that a script can define the transition table locally */
/*
export type Transitions<S extends string> = Record<S, readonly S[]>;
type Valid_States<T extends string> = T;
*/
export interface StateMachine<State extends string> {
  state: State;
  transition(nextState: State): void;
  start_state(): void;
}

export function StateMachine<
  State extends string, // The state union type
  TBase extends Constructor<Base>, // The base class type
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
        this.LOG(LogLevel.DEBUG, "STATE", `${this.state} => ${nextState}`);
        this.state = nextState;
      }

      start_state() {
        this.LOG(LogLevel.DEBUG, "STATE", `Entered ${this.state}`);
      }
    };
}

export function NewStateMachine<
TBase extends Constructor<Base>,
>(){
  return (Base: TBase) =>
  class NewStateMachine extends Base {
      state: State;
      transitions: Transitions<State> = {};
      state_handlers: StateHandlers<State> = {};
      
      constructor(...args: any[]) {
        super(...args);
        this.state = "initial";
        this.transitions = {} as Transitions<State>;
        this.state_handlers = {} as StateHandlers<State>;
      }

      transition(nextState: State) {
        const allowed = this.transitions[this.state] || [];
        if (!allowed.includes(nextState)) {
          throw new Error(
            `Invalid transition from ${this.state} to ${nextState}`,
          );
        }
        this.LOG(LogLevel.DEBUG, "STATE", `${this.state} => ${nextState}`);
        this.state = nextState;
      }

      start_state() {
        this.LOG(LogLevel.DEBUG, "STATE", `Entered ${this.state}`);
      }
    }
}
