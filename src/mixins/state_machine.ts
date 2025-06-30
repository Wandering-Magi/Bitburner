import { Base } from "./extender";
import { LogLevel } from "./logger";

type Constructor<T = object> = new (...args: any[]) => T;
type State = string;
type Transitions<T extends string> = Record<T, readonly T[]>;
type StateHandlers<T extends string> = Record<T, () => void | Promise<void>>;

export interface StateMachine {
  state: State;
  transitions: Transitions<State>;
  state_handlers: StateHandlers<State>;
  transition(state: State): void;
  start_state(): void;
}

export const StateMachine = <TBase extends Constructor<Base>>(Base: TBase) =>
  class extends Base {
    state!: State;
    transitions!: Transitions<State>;
    state_handlers!: StateHandlers<State>;

    constructor(...args: any[]) {
      super(...args);
    }

    async process() {
      while (this.state != "kill") {
        try {
          await this.state_handlers[this.state]();
        } catch (error) {
          const msg = `StateMachine encountered an error: ${error}`;
          this.LOG(LogLevel.ERROR, "STATE", msg);
          throw msg;
        }
      }
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
  };
