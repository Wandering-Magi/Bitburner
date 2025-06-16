import { NS } from "@ns";
import { Server_Break } from "/utils/server/break";
import { Server_String } from "/utils/server/string";
import { build_network_tree } from "../utils/network_builder";

type Target = {
  node: Server_Break;
  scheduler_pid?: number;
};

//type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

type State =
  | "initial"
  | "scan_network"
  | "write_port"
  | "update_network"
  | "validate_targets"
  | "idle"
  | "error"
  | "kill";

const allowedTransitions: Record<State, State[]> = {
  initial: ["scan_network"],
  scan_network: ["write_port"],
  write_port: ["update_network"],
  update_network: ["validate_targets"],
  validate_targets: ["idle"],
  idle: ["scan_network", "kill"],
  error: ["idle"],
  kill: [],
};

type MachineStats = {
  network: {
    old: Server_Break | null;
    new: Server_Break | null;
  };
  logging: {
    debug: boolean;
    info: boolean;
    log: boolean;
    verbose: boolean;
  };
  managed_targets: Array<Target>;
  valid_targets: Array<Server_Break>;
  max_targets: number;
  state: string;
  error: string;
  debug: boolean;
};
interface MachineGets extends MachineStats {
  runtime: {
    start: number;
    end: number;
    readonly total: number;
    average: Array<number>;
  };
}

class StateMachine implements MachineGets {
  private ns: NS;
  network: {
    old: Server_Break | null;
    new: Server_Break | null;
  };
  runtime: {
    start: number;
    end: number;
    readonly total: number;
    average: Array<number>;
  };
  logging: {
    debug: boolean;
    info: boolean;
    log: boolean;
    verbose: boolean;
  };
  managed_targets: Array<Target>;
  valid_targets: Array<Server_Break>;
  max_targets: number;
  state: string;
  error: string;
  debug: boolean;

  constructor(ns: NS) {
    this.ns = ns;
    this.network = {
      old: null,
      new: null,
    };
    this.runtime = {
      start: Date.now(),
      end: Date.now(),
      get total() {
        return this.end - this.start;
      },
      average: [],
    };
    this.logging = {
      debug: true,
      info: true,
      log: false,
      verbose: false,
    };
    this.managed_targets = [];
    this.valid_targets = [];
    this.max_targets = 5;
    this.state = "initial";
    this.error = "";
    this.debug = true;
  }

  async process() {
    while (this.state !== "kill") {
      try {
        switch (this.state) {
          case "":
            this.start_state();
            this.change_state("idle");
            break;

          case "initial":
            this.ns.disableLog("scan");
            this.ns.disableLog("sleep");
            this.ns.disableLog('getHackingLevel');
            this.ns.clearLog();
            this.start_state();
            this.change_state("scan_network");
            break;

          case "scan_network":
            this.start_state();
            this.network.new = build_network_tree(this.ns, "home");
            this.change_state("write_port");
            break;

          case "write_port":
            this.start_state();
            this.write_network();
            this.change_state("update_network");
            break;

          case "update_network":
            this.start_state();
            this.network.old = this.network.new;
            this.change_state("validate_targets");
            break;

          case "validate_targets":
            this.start_state();
            this.find_valid_targets();
            this.change_state("idle");
            break;

          case "idle":
            this.start_state();
            this.DEBUG(LogLevel.INFO, "run", `Runtime | Total:${this.runtime.total} | Average:${this.avg_runtime()}`);
            await this.ns.sleep(100);
            this.runtime.start = Date.now();
            this.ns.clearLog();
            this.change_state("scan_network");
            break;

          case "error":
            this.start_state();
            this.change_state("idle");
            break;

          case "kill":
            break;

          default:
            throw new Error(`${this.state} is not a valid state`);
        }
      } catch (error: unknown) {
        this.state = "error";
        let message: string;

        if (error instanceof Error) {
          message = error.message;
        } else if (typeof error === "string") {
          message = error;
        } else {
          message = JSON.stringify(error);
        }

        this.ns.tprint(`ERROR Network Manager encountered an error: `, message);
      }
    }
  }

  private DEBUG(level: LogLevel, label: string, ...args: unknown[]) {
    /* Early exit when not logging */
    if (!this.logging[level.toLowerCase() as keyof typeof this.logging]) return;

    this.runtime.end = Date.now();
    const now = new Date();
    const pad = (n: number, z = 2) => n.toString().padStart(z, "0");
    //const timestamp = now.toISOString().slice(11, 23); //HH:mm:ss.sss
    const timestamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
    const s_label =
      label.length > 5
        ? label.slice(0, 6).toUpperCase()
        : label.padEnd(5, " ").toUpperCase();
    const s_time = `@${this.runtime.total}ms`.padEnd(6, " ");

    const s_args = args
      .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
      .join(" | ");

    this.ns.print(`INFO | ${timestamp} | ${s_label} | ${s_time} | ${s_args}`);
  }

  private avg_runtime() {
    const dec = 1;
    this.runtime.average.push(this.runtime.total);
    if(this.runtime.average.length > 100) this.runtime.average.shift();
    let sum = 0;
    this.runtime.average.forEach((n) => sum+=n);
    const avg = sum / this.runtime.average.length;
    return Math.trunc(avg * 10**dec) / 10**dec;
  }

  change_state(next_state: State) {
    const allowed = allowedTransitions[this.state as State] || [];
    if (!allowed.includes(next_state)) {
      this.DEBUG(
        LogLevel.ERROR,
        "INVALID",
        `Cannot transition from ${this.state} to ${next_state}`,
      );
      throw new Error(
        `Invalid state transition: ${this.state} -> ${next_state}`,
      );
    }
    this.DEBUG(LogLevel.INFO, "CHNGE", `${this.state} => ${next_state}`);
    this.state = next_state;
  }

  start_state() {
    this.DEBUG(LogLevel.INFO, `START`, `${this.state}`);
  }

  find_valid_targets() {
    if (this.network.new === null) return;

    const network_arr: Array<Server_Break> = [];
    function traverse(node: Server_String) {
      if (node instanceof Server_Break && node.security.root && node.score > 0)
        network_arr.push(node as Server_Break);

      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => traverse(child));
      }
    }
    traverse(this.network.new);
    this.valid_targets = network_arr.slice(0, this.max_targets);
  }

  write_network(): boolean {
    if (this.network.new === null) return false;

    const pid = this.ns.pid;
    this.ns.clearPort(pid);
    this.DEBUG(LogLevel.INFO, `DEBUG`, `clearPort(${pid}) complete`);
    //const buffer = JSON.stringify(this.network.new);
    const buffer = this.network.new.network_packet;
    this.DEBUG(LogLevel.INFO, `DEBUG`, `JSON.stringify() complete`);
    const write = this.ns.tryWritePort(pid, buffer);
    this.DEBUG(LogLevel.INFO, `DEBUG`, `tryWritePort() complete`);
    if (!write) throw new Error(`Failed to write to port ${pid}`);
    this.DEBUG(LogLevel.INFO, `DEBUG`, `Wrote network.new to Port ${pid}`);
    return true;
  }
}

export async function main(ns: NS): Promise<void> {
  ns.ui.setTailTitle(
    `Network Manager | ${ns.formatRam(ns.getScriptRam("managers/network_manager.js"))}`,
  );
  const data = ns.flags([
    ["debug", false], // output debug logs to tail
    ["log", false], // output info to a log
    ["help", false], // dislpay a help message
    ["verbose", false], // output all logs
    ["v", false], // verbose shortform
  ]);

  const server = new StateMachine(ns);
  await server.process();
}
