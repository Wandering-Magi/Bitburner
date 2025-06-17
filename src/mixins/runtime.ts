import { Base } from "./extender";
import { LogLevel } from "./logger";

type Constructor<T = object> = new (...args: any[]) => T;

type Timings = {
  start: number;
  end: number;
  checkpoint: number;
  readonly total: number;
}
export interface Runtime {
  runtime: Timings,
}
/**
 * The mixin to track how long it takes for something to happen.
 */
export const Runtime = <TBase extends Constructor<Base>>(Base: TBase) =>
  class extends Base {
    runtime: Timings;

    constructor(...args: any[]) {
      super(...args);
      this.runtime = {
        start: Date.now(),
        end: 0,
        checkpoint: 0,
        get total() {
          return this.end - this.start;
        }
      }
    }
    
    /**
     * Logs the current runtime in ms.
     * @param ...args - any number of arguments that should be passed to the log.
     */
    public log_total_time(...args: any[]) {
      this.runtime.end = Date.now();
      this.LOG(LogLevel.DEBUG, 'RUNTM', `Runtime: ${this.runtime.total}ms`, ...args);
    }

    /**
     * Set a checkpoint at the current time 
     */
    public log_checkpoint_start(){
      this.runtime.checkpoint = Date.now();
      this.LOG(LogLevel.DEBUG, 'CHKPT', 'Checkpoint set.');
    }
    /*
    * Log the total time in ms since the checkpoint was set 
    */
    public log_checkpoint_end(){
      this.LOG(LogLevel.DEBUG, 'CHKPT', `Checkpoint finished in ${Date.now() - this.runtime.checkpoint}ms.`);
    }
  };
