import { Base } from "./extender";
import { LogLevel } from "./logger";
import { Network_Comms } from "/types/network_comm";

type Constructor<T = object> = new (...args: any[]) => T;

export interface Telecoms {
  outbound_message: string | null;
  readonly inbound_message: string | null;
  /**
   * A timeout function to replace others like ns.sleep() and ns.nextWrite() for checking pid's.
   * Allows listening to a port for a moment before going on to something else.
   * Will slowly ramp loops out to 100ms or max_interval to save on resources for long-running scripts.
   * Will log the first port with a valid message to the internal cache for use by inbound_message.
   * @param {number[]} pids - an array of pid's to check
   * @param {number} timeout - the amount of ms to wait before timeout
   * @param {number} max_interval - (optional) the max amount of ms the loop should expand to
   * @returns {number | null} pid of the message it received. null if nothing.
   */
  listen(pids: Array<number>, timeout: number, max_interval?: number): Promise<number | null>;
  /**
   * Clears the inbound message cache
   */
  clear_msg_cache(): void;
}
/**
 * The mixin to pass the telecommunications functions to other classes
 */
export const Telecoms = <TBase extends Constructor<Base>>(Base: TBase) =>
  class extends Base {
    private _inbound_cache: string | null;
    private _port_cache: number | null;

    outbound_message: string | null;
    constructor(...args: any[]) {
      super(...args);
      this.outbound_message = null;
      this._port_cache = null;
      this._inbound_cache = null;
    }

    get inbound_message(): string | null {
      /*First look if there is a new valid port to get a message from*/
      if(this._port_cache !== null) {
        const msg = this.ns.readPort(this._port_cache);
        this._port_cache = null;
        this._inbound_cache = msg;
        return msg;
      }
      /*Get it from the cache*/
      if(this._inbound_cache !== '')
        return this._inbound_cache;
      return null;
    }

    clear_msg_cache() {
      this._inbound_cache = '';
    }

    parse_message(str?: string) {
      const buffer = str || this.inbound_message;
    }

  /**
   * A timeout function to replace others like ns.sleep() and ns.nextWrite() for checking pid's.
   * Allows listening to a port for a moment before going on to something else.
   * Will slowly ramp loops out to 1s to save on resources for long-running scripts
   * @param {number[]} pids - an array of pid's to check
   * @param {number} timeout - the amount of ms to wait before timeout
   * @param {number} max_interval - (optional) the max amount of ms the loop should expand to
   * @returns {number | null} pid of the message it received. null if nothing.
   */
    async listen(pids: Array<number>, timeout: number, max_interval?: number): Promise<number | null> {
      const LOG_LABEL = "TC-LS";
      const empty = "NULL PORT DATA";
      let message_found = false;
      let interval = 1;
      let next_tick = Date.now() + interval;
      let duration = timeout;
      let count = 0;

      this.LOG(
        LogLevel.DEBUG,
        LOG_LABEL,
        `Now listening to pid's ${JSON.stringify(pids)} for up to ${timeout}ms`,
      );
      while (!message_found) {
        this.LOG(LogLevel.VERBOSE, LOG_LABEL, `Starting loop I=${interval} D=${duration}`);

        /* Check PID's for messages, will run one last time before timeout */
        for (const pid of pids ) {
          message_found = this.ns.peek(pid) !== empty; 
          this.LOG(
            LogLevel.VERBOSE,
            LOG_LABEL,
            `${pid} has message? ${String(message_found)}`,
          );
          if(message_found){
            this._port_cache = pid;
            return pid;
          } 
        }

        this.LOG(LogLevel.VERBOSE, LOG_LABEL, `Did not find any messages.`);
        
        /* No messages received before timeout */
        if (interval === 0){
          this.LOG(LogLevel.DEBUG, LOG_LABEL, `Listen timed out.`);
          break;
        }

        /**
         * Every 100 loops, increase the interval by an order of magnitude
         * This should let long-running systems that only occasionally get information
         * use less resources overall.
         * 1ms -> 10ms -> 100ms
         */
//        interval = Math.min(duration, interval);
        if (interval * 10 < (max_interval || 100) && interval * 10 < duration && count >= 100) {
          interval *= 10;
          this.LOG(LogLevel.VERBOSE, LOG_LABEL, `Count reached, increasing interval to ${interval}`);
          count = 0;
        } else {
          count++;
        }

        interval = Math.min(interval, duration);
        duration -= interval;


        /* Drifting sleeps to stick close to expected intervals */
        const now = Date.now();
        const sleepTime = next_tick - now;
        this.LOG(LogLevel.VERBOSE, LOG_LABEL, `Sleeping for ${interval} ms`);
        if (sleepTime > 0) await this.ns.sleep(sleepTime);
        this.LOG(LogLevel.VERBOSE, LOG_LABEL, `Woke from sleep after ${Date.now() - now} ms`);
        next_tick += interval;
      }
      
      return null;
    }
  };
