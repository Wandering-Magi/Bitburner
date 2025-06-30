import { NS } from "@ns";
import { Base, extender } from "/mixins/extender";
import { Logger, LogLevel } from "/mixins/logger";
import { Runtime } from "/mixins/runtime";
import { StateMachine } from "/mixins/state_machine";
import { Telecoms } from "/mixins/telecom";
import { Network_Comms } from "/types/network_comm";
import { build_network_tree } from "/utils/network_builder";
import { Server_Break } from "/utils/server/break";
import { Server_String } from "/utils/server/string";

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
  readonly new_flat: Server_Break[] | [];
  readonly old_flat: Server_Break[] | [];
};

type Targets = {
  valid: Server_String[];
  max: number;
};

interface Network_Manager extends Logger, Telecoms, Runtime, StateMachine {
  managed_scripts: Scripts[];
  network: Network;
  targets: Targets;
  process(): Promise<void>;
}

class Network_Manager
  extends extender(Base, Logger, Telecoms, Runtime, StateMachine)
  implements Network_Manager {
  managed_scripts: Scripts[];
  targets: Targets;
  scheduler_started: boolean;

  /* Constants */
  transitions = {
    startup: ["scan_network", "idle"],
    scan_network: ["write_port"],
    write_port: ["update_network"],
    update_network: ["validate_targets"],
    validate_targets: ["idle"],
    idle: ["scan_network", "end"],
    end: [],
  } as const;

  state_handlers = {
    startup: this.startup.bind(this),
    idle: this.idle.bind(this),
    scan_network: this.scan_network.bind(this),
    write_port: this.write_port.bind(this),
    update_network: this.update_network.bind(this),
    validate_targets: this.validate_targets.bind(this),
    end: this.end.bind(this),
  } as const;

  constructor(ns: NS, name: string) {
    super(ns, name);
    this.managed_scripts = [];
    this.network = new NetworkHolder();
    this.targets = {
      valid: [],
      max: 5,
    };
    this.state = "startup";
    this.scheduler_started = false;
  }

  /**==========================================================================
   *                           Gets
   *===========================================================================
   */

  /**==========================================================================
   *                            States
   *===========================================================================
   */
  private startup() {
    this.start_state();
    /* launch the scheduler */
    this.transition("idle");
  }

  private end() {
    this.start_state();
  }

  private async idle(): Promise<void> {
    this.start_state();
    const msg_pid = await this.listen([], 1000);
    this.transition("scan_network");
  }

  private scan_network() {
    this.start_state();
    this.network.new = build_network_tree(this.ns, "home");
    this.transition("write_port");
  }

  private launch_scheduler() {
    this.start_state();
  }

  private write_port() {
    this.start_state();
    this.write_network();
    this.transition("update_network");
  }

  private update_network() {
    this.start_state();
    this.network.old = this.network.new;
    this.transition("validate_targets");
  }

  private validate_targets() {
    this.start_state();
    this.find_valid_targets();
    this.transition("idle");
  }


  /**==========================================================================
   *                           Methods
   *===========================================================================
   */
  private write_network(): boolean {
    this.LOG(LogLevel.DEBUG, "NTMGR", `write_network() start`);
    if (this.network.new === null) {
      this.LOG(LogLevel.ERROR, "NTMGR", `Did not find a valid network.`);
      return false;
    }

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
    if (this.network.new_flat.length === 0) this.targets.valid = [];

    /* Get only targets with root access and a proper score value */
    let target_arr = [...this.network.new_flat].filter(
      (node) => node.security.root && node.score > 0,
    );

    /* Sort the targets by high to low score */
    target_arr.sort((a, b) => b.score - a.score);

    /* Truncate it to the maximum tracked targets */
    target_arr = target_arr.slice(0, this.targets.max);

    /* Log it if the layout of the targets change */
    if (
      this.targets.valid.length === 0 ||
      (this.targets.valid.length > 0 &&
        target_arr.every((node, i) => node.name !== this.targets.valid[i].name))
    )
      this.LOG(
        LogLevel.INFO,
        "NTMGR",
        `Targets update: ${JSON.stringify(target_arr.map((node) => node.name))}`,
      );

    this.targets.valid = target_arr;
  }

  calc_network_ram() {
    this.LOG(LogLevel.DEBUG, "NTMGR", `calc_network_ram() start`);
    if (this.network.new_flat.length === 0) this.targets.valid = [];

    /* Limit to nodes with a max ram value that we have root access to */
    const ram_arr = [...this.network.new_flat].filter(
      (node) => node.security.root && node.ram.max > 0,
    );
  }

  flatten_network() {
    this.LOG(LogLevel.DEBUG, "NTMGR", `flatten_network() start`);
    if (this.network.new === null) return [];

    const network_arr: Server_Break[] = [];
    /* Helper functon for recursive traverse */
    function traverse(node: Server_String) {
      if (node instanceof Server_Break && node.security.root) {
        network_arr.push(node as Server_Break);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => traverse(child));
      }
    }
    /* Now traverse the network */
    traverse(this.network.new);

    return network_arr;
  }
}

/*
function make_network_holder(): Network {
  const network = {
    new: null as Server_Break | null,
    old: null as Server_Break | null,
  };
  Object.defineProperty(network, "flat", {
    get: function() {
      return network.new && network.old
        ? ([network.new, network.old].filter(
          (x) => x !== null,
        ) as Server_Break[])
        : [];
    },
    enumerable: true,
  });
  return network as Network;
}*/

class NetworkHolder {
  new: Server_Break | null;
  old: Server_Break | null;

  constructor() {
    this.new = null;
    this.old = null;
  }

  get new_flat(): Server_Break[] | [] {
    return this.flatten_network(this.new);
  }

  get old_flat(): Server_Break[] | [] {
    return this.flatten_network(this.new);
  }

  flatten_network(net: Server_Break | null) {
    if (net === null) return [];

    const network_arr: Server_Break[] = [];
    /* Helper functon for recursive traverse */
    function traverse(node: Server_String) {
      if (node instanceof Server_Break && node.security.root) {
        network_arr.push(node as Server_Break);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => traverse(child));
      }
    }
    /* Now traverse the network */
    traverse(net);

    return network_arr;
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
