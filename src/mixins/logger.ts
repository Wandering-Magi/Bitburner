import { NS } from "@ns";

type Constructor<T = object> = new (...args: any[]) => T;
interface HasNS {
  ns: NS;
}

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  VERBOSE = "VERBOSE",
}

type Logging = {
  debug: boolean;
  info: boolean;
  warn: boolean;
  error: boolean;
  verbose: boolean;
};
export interface Logger {
  readonly logFile: string;
  hostname: string;
  scriptName: string;
  logging: Logging;
  set_logging(levels: Partial<Logging>): void;
  LOG(level: LogLevel, label: string, ...args: unknown[]): void;
}

// eslint-disable-next-line
export const Logger = <TBase extends Constructor<HasNS>>(Base: TBase) =>
  class extends Base {
    hostName: string;
    scriptName: string;
    logging: Logging;
    constructor(...args: any[]) {
      super(...args);
      this.hostName = this.ns.getHostname();
      this.scriptName = this.ns.getScriptName();
      this.logging = {
        debug: false,
        info: false,
        warn: false,
        error: false,
        verbose: false,
      };
    }

    get logFile(): string {
      return `logs/${this.hostName}/${this.scriptName}.txt`;
    }

    /**
     * Method to quickly turn logging values on or off
     * @param {object} levels - an object with keys for the logging object
     *                          Each key is optional and can be set to true or false.
     *                          If the 'verbose' key is true, all logging levels are enabled.
     * @example
     * set_logging({debug: true, info: true});
     * @example
     * set_logging({info: false, error: true});
     * @example
     * set_logging({verbose: true});
     */
    public set_logging(levels: Partial<Logging>) {
      /* Turn everything on if verbose is turned on */
      if (levels.verbose === true) {
        Object.keys(this.logging).forEach((key) => {
          this.logging[key as keyof typeof this.logging] = true;
        });
        return;
      }
      this.logging = {
        ...this.logging,
        ...levels,
      };
    }

    /**
     * The method to log output to the tail of a script
     * It will write the log to "hostname/scriptName.txt"
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
    public LOG(level: LogLevel, label: string, ...args: unknown[]) {
      /* Early exit when not logging */
      if (!this.logging[level.toLowerCase() as keyof typeof this.logging])
        return;

      /* Timestamp in HH:mm:ss.zsss format */
      const now = new Date();
      const pad = (n: number, z = 2) => n.toString().padStart(z, "0");
      const timestamp =
        `${pad(now.getHours())}:` +
        `${pad(now.getMinutes())}:` +
        `${pad(now.getSeconds())}.` +
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

      this.ns.write(
        this.logFile,
        `${level.padEnd(7, ' ')} | ${timestamp} | ${s_label} | ${s_args}\n`,
        "a",
      );
      //this.ns.print(`INFO | ${timestamp} | ${s_label} | ${s_args}`);
    }
  };
