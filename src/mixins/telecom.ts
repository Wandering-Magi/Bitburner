import { Base } from "./extender";
import { LogLevel } from "./logger";

type Constructor<T = object> = new (...args: any[]) => T;

type Address = {
  from: number;
  to: number;
};
type telecom = {
  address?: Address;
};
export interface Telecoms {
  listen(pids: Array<number>, timeout: number): boolean;
}

/**
 * The mixin to pass the telecommunications functions to other classes
 */
export const Telecoms = <TBase extends Constructor<Base>>(Base: TBase) =>
  class extends Base {
    constructor(...args: any[]) {
      super(...args);
    }

    async listen(pids: Array<number>, timeout: number): Promise<boolean> {
      const LOG_LABEL = "TC-LS";
      const empty = "NULL PORT DATA";
      const end = false;
      let message = "";
      let interval = 1;
      let next_tick = Date.now() + interval;
      let duration = timeout;
      let count = 0;

      this.LOG(
        LogLevel.INFO,
        LOG_LABEL,
        `Now listening to pid's ${JSON.stringify(pids)} for up to ${timeout}ms`,
      );
      /* Check PID's for messages */
      while (!end) {

        this.LOG(LogLevel.DEBUG, LOG_LABEL, `Starting loop I=${interval} D=${duration}`);
        for (const pid of pids ) {
          /* peek and readPort separation keep message from being overwritten */
          const check = this.ns.peek(pid); /* peek does not remove messages */
          this.LOG(
            LogLevel.VERBOSE,
            LOG_LABEL,
            `${pid} has message ${String(check !== empty)}`,
          );
          if (check !== empty) {
            message = this.ns.readPort(pid); /* readPort does */
            this.LOG(
              LogLevel.INFO,
              LOG_LABEL,
              `Found message on ${pid} this.message => message`,
            );
            this.LOG(LogLevel.DEBUG, LOG_LABEL, `${message}`);
          }
        }
        if (message !== "") break;
        this.LOG(LogLevel.DEBUG, LOG_LABEL, `Did not find any messages.`);
        
        /* No messages received before it ran out of time */
        if (interval === 0){
          this.LOG(LogLevel.DEBUG, LOG_LABEL, `Timeout reached.`);
          break;
        }

        /**
         * Every 100 loops, increase the interval by an order of magnitude
         * This should let long-running systems that only occasionally get information
         * use less resources overall.
         * Max is 1000ms (1s).
         * 10ms -> 100ms -> 1000ms
         */
//        interval = Math.min(duration, interval);
        if (interval * 10 < 1000 && interval * 10 < duration && count >= 100) {
          interval *= 10;
          this.LOG(LogLevel.DEBUG, LOG_LABEL, `Count reached, increasing interval to ${interval}`);
          count = 0;
        } else {
          count++;
        }

        interval = Math.min(interval, duration);
        duration -= interval;


        /* Drifting sleeps to stick close to intervals */
        const now = Date.now();
        const sleepTime = next_tick - now;
        this.LOG(LogLevel.VERBOSE, LOG_LABEL, `Sleeping for ${interval} ms`);
        if (sleepTime > 0) await this.ns.sleep(sleepTime);
        this.LOG(LogLevel.VERBOSE, LOG_LABEL, `Woke from sleep after ${Date.now() - now} ms`);
        next_tick += interval;
      }
      
      return true;
    }
  };
