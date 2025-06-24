import { NS } from "@ns";
import { Base, extender } from "/mixins/extender";
import { Logger, LogLevel } from "/mixins/logger";
import { Runtime } from "/mixins/runtime";
import { StateMachine, Transitions } from "/mixins/state_machine";
import { Telecoms } from "/mixins/telecom";
import { Network_Comms } from "/types/network_comm";
import { build_network_tree } from "/utils/network_builder";
import { Server_Break } from "/utils/server/break";
import { Server_String } from "/utils/server/string";

type ValidStates =
  | "initial"
  | "idle"
  | "scan_network"
  | "write_port"
  | "update_network"
  | "validate_targets"
  | "calc_batch"
  | "kill";

const allowed_transitions: Transitions<ValidStates> = {
  initial: ["scan_network", "idle"],
  scan_network: ["write_port"],
  write_port: ["update_network"],
  update_network: ["validate_targets"],
  validate_targets: ["idle", "calc_batch"],
  calc_batch: ["idle"],
  idle: ["scan_network", "kill"],
  kill: [],
};

type Scripts = {
  /**
   * The filename of the script 
   * */
  name: string;
  /**
   * The name of the host server
   */
  host: string;
  /**
   * The PID of the script
   */
  pid: number;
};

type Network = {
  new: Server_Break | null;
  old: Server_Break | null;
};

type Targets = {
  valid: Server_String[];
  max: number;
};

interface Network_Manager
  extends Logger,
  Telecoms,
  Runtime,
  StateMachine<ValidStates> {
  managed_scripts: Scripts[];
  network: Network;
  targets: Targets;
  process(): Promise<void>;
}

class Network_Manager
  extends extender(
    Base,
    Logger,
    Telecoms,
    Runtime,
    StateMachine(allowed_transitions, "initial"),
  )
  implements Network_Manager {
  managed_scripts: Scripts[];
  targets: Targets;

  constructor(ns: NS, name: string) {
    super(ns, name);
    this.managed_scripts = [];
    this.network = {
      new: null,
      old: null,
    };
    this.targets = {
      valid: [],
      max: 5,
    };
  }

  async process() {
    while(true){
      try{
        switch (this.state) {
          /*
      case "":
        this.start_state();
        this.transition("idle");
        break;
      */
          case "initial":
            this.start_state();
            this.transition("idle");
            break;

          case "idle":
            this.start_state();
            let msg_pid = await this.listen([], 1000);
            if(typeof msg_pid === 'number'){
            }
            this.transition("scan_network");
            break;

          case "scan_network":
            this.start_state();
            this.network.new = build_network_tree(this.ns, "home");
            this.transition("write_port");
            break;

          case "write_port":
            this.start_state();
            this.write_network();
            this.transition("update_network");
            break;

          case "update_network":
            this.start_state();
            this.network.old = this.network.new;
            this.transition("validate_targets");
            break;

          case "validate_targets":
            this.start_state();
            this.find_valid_targets();
            this.transition("calc_batch");
            break;

          case "calc_batch":
            this.start_state();
            this.calc_batch();
            this.transition("idle");
            break;

          default:
            break;
        }

      } catch(error) {
        const msg = `Network Manager encountered an error: ${error}`;
        this.LOG(LogLevel.ERROR, "NTMGR", msg);
        throw msg;
      }

    }
  }
  write_network(): boolean {
    this.LOG(LogLevel.DEBUG, "NTMGR", `write_network() start`);
    if (this.network.new === null) {
      this.LOG(LogLevel.ERROR, "NTMGR", `Did not find a valid network.`);
      return false;
    }
    this.ns.ki

    const pid = this.ns.pid;
    this.ns.clearPort(pid);
    this.LOG(LogLevel.DEBUG, `NTMGR`, `clearPort(${pid}) complete`);

    const buffer = this.network.new.server_packet;
    this.LOG(LogLevel.DEBUG, `NTMGR`, `Created network packet`);

    const write = this.ns.tryWritePort(pid, buffer);

    if (!write)
      this.LOG(LogLevel.ERROR, `NTMGR`, `tryWritePort(${pid}) failed`);
    if (!write) throw new Error(`Failed to write to port ${pid}`);
    if (write)
      this.LOG(LogLevel.DEBUG, `NTMGR`, `tryWritePort(${pid}) complete`);
    return true;
  }

  find_valid_targets() {
    this.LOG(LogLevel.DEBUG, "NTMGR", `find_valid_targets() start`);
    if (this.network.new === null) return;

    let network_arr: Server_Break[] = [];
    /**
     * Quick helper function to:
     * - Collapse the network into a flat array
     * - Sort out unwanted nodes
     */
    function traverse(node: Server_String) {
      if (node instanceof Server_Break && node.security.root && node.score > 0)
        network_arr.push(node as Server_Break);

      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => traverse(child));
      }
    }
    traverse(this.network.new);

    /* Sort the targets by high to low score */
    network_arr.sort((a, b) => b.score - a.score);
    /* Truncate it to the maximum tracked targets */
    network_arr = network_arr.slice(0, this.targets.max);

    /* Log it if the layout of the targets change */
    if (
      this.targets.valid.length === 0 ||
      (this.targets.valid.length > 0 &&
        network_arr.every(
          (node, i) => node.name !== this.targets.valid[i].name,
        ))
    )
      this.LOG(
        LogLevel.INFO,
        "NTMGR",
        `Targets update: ${JSON.stringify(network_arr.map((node) => node.name))}`,
      );

    this.targets.valid = network_arr;
  }

  calc_batch(){
    let hack = {
      time: this.ns.getHackTime(this.targets.valid[0].name),
      amount: this.ns.hackAnalyze(this.targets.valid[0].name),
    }

    this.ns.print(`Time: ${hack.time}ms\nAmount: ${hack.amount}`);
  }
}

export async function main(ns: NS) {
  ns.ui.setTailTitle(
    `Network Manager | ${ns.formatRam(ns.getScriptRam(ns.getScriptName()))}`,
  );
  ns.disableLog(`ALL`);

  const manager = new Network_Manager(ns, "home");
  ns.write("/logs/home/managers/network_manager.js.txt", "", "w");
  ns.clearLog();

  //manager.set_logging({ error: true, info: true });
  //for (let i = 0; i < 500; i++) {
    await manager.process();
  //}
}
