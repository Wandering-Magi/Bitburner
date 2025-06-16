import { NS } from "@ns";

export type Constructor<T = object> = new (...args: any[]) => T;
interface HasNS {
  ns: NS;
}

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface i_Logger {
  logging: {
    debug: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;
  };
  LOG(level: LogLevel, label: string, ...args: unknown[]): void;
}

// eslint-disable-next-line
export const Logger = <TBase extends Constructor<HasNS>>(Base: TBase) =>
  class extends Base {
    logging: {
      debug: boolean;
      info: boolean;
      warn: boolean;
      error: boolean;
    };
    constructor(...args: any[]) {
      super(...args);
      this.logging = {
        debug: false,
        info: false,
        warn: false,
        error: false,
      };
    }

    /**
     * The method to log output to the tail of a script
     * @param {LogLevel} level - Which level the log should appear at
     * @param {string} label - The label to be shown, 5 char max
     * @param ...args - All other values to be sent to the console
     *
     *
     * @example
     * this.LOG(LogLevel.INFO, 'iNfOrmaTion', 'Hello World!');
     *
     * INFO | 12:34:56.789 | INFOR | Hello World!
     */
    LOG(level: LogLevel, label: string, ...args: unknown[]) {
      /* Early exit when not logging */
      if (!this.logging[level.toLowerCase() as keyof typeof this.logging])
        return;

      /* Timestamp in HH:mm:ss.zsss format */
      const now = new Date();
      const pad = (n: number, z = 2) => n.toString().padStart(z, "0");
      const timestamp = 
        `${pad(now.getHours())}:`+
        `${pad(now.getMinutes())}:`+
        `${pad(now.getSeconds())}.`+
        `${pad(now.getMilliseconds(), 3)}`;

      /* Render all lables in uppercase 
       * limit them to 5 charaters for uniformity */
      const s_label =
        label.length > 5
          ? label.slice(0, 6).toUpperCase()
          : label.padEnd(5, " ").toUpperCase();

      const s_args = args
        .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
        .join(" | ");

      this.ns.print(`INFO | ${timestamp} | ${s_label} | ${s_args}`);
    }
  };
