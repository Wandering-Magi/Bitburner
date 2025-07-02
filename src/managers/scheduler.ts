/*  
private calc_batch() {
    this.start_state();

    const hack = {
      time: this.ns.getHackTime(this.targets.valid[0].name),
      amount: this.ns.hackAnalyze(this.targets.valid[0].name),
    };

    this.ns.print(`Time: ${hack.time}ms\nAmount: ${hack.amount}`);

    this.transition("idle");
  }
*/

import { NS } from "@ns";
import { Base, extender } from "/mixins/extender";
import { Logger, LogLevel } from "/mixins/logger";
import { Runtime } from "/mixins/runtime";
import { StateMachine } from "/mixins/state_machine";
import { Telecoms } from "/mixins/telecom";
import { Network_Comms } from "/types/network_comm";
import { rehydrate_Server_String, Server_String } from "/utils/server/string";

type Targets = {
  valid: Server_String[];
  max: number;
};

interface i_Ram {
  network: Server_String[];
  max: number;
  used: number;
  readonly free: number;
}
class Ram implements i_Ram {
  network: Server_String[];
  max: number;
  used: number;

  constructor(){
    this.network = [];
    this.max = 0,
    this.used = 0
  }
  get free() {
    return this.max - this.used;
  }
}

interface Scheduler extends Logger, Telecoms, Runtime, StateMachine {}

class Scheduler
  extends extender(Base, Logger, Telecoms, Runtime, StateMachine)
  implements Scheduler
{
  listen_ports: number[];
  network: Network;
  targets: Targets;
  ram: Ram;

  transitions = {
    startup: ["idle"],
    idle: ["idle", "end"],
    end: [],
  } as const;

  state_handlers = {
    startup: this.startup.bind(this),
    idle: this.idle.bind(this),
    end: this.end.bind(this),
  } as const;

  constructor(ns: NS, name: string, parent_pid: number) {
    super(ns, name);
    this.listen_ports = [this.ns.pid, parent_pid];
    this.simulated = null;
    this.update = null;
    this.network = new NetworkHolder();
    this.ram = new Ram();
    this.targets = {
      valid: [],
      max: 5,
    };
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
    this.transition("idle");
  }

  private end() {
    this.start_state();
  }

  // listen to the network port
  private async idle(): Promise<void> {
    this.start_state();
    const msg_pid = await this.listen(this.listen_ports, 100);
    // if it gets a network update
    if (typeof msg_pid === "number") this.transition("process_message");
    /* If there is no update */
    this.transition("idle"); // TODO have this go somewhere else
  }

  //  parse and save the incoming data
  private process_message() {
    this.start_state();
    if (this.inbound_message == null)
      throw new Error("inbound_message is null");
    const json = JSON.parse(this.inbound_message) as Network_Comms;
    /* If the message is from the parent pid, it is probably a network update
     * or a kill order */
    if (json.TELECOM.header.from.pid === this.listen_ports[1]) {
      /* message contains a network packet from the Network Manager */
      if (json.TELECOM.body?.network_packet !== undefined) {
        this.network.new = rehydrate_Server_String(
          this.ns,
          json.TELECOM.body.network_packet,
        );
        this.transition("analyze_network");
        return;
      }
    }
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

  private analyze_network() {
    this.start_state();
    /* convert the network into a single array */
    const roots = [...this.network.new_flat].filter((node) => node.security.root) as Server_String[];

    /* track available ram on the network */
    roots.sort((a, b) => b.ram.max - a.ram.max);
    this.ram.network = roots;
    let m = 0,u = 0;
    roots.forEach((node) => {
      m+=node.ram.max;
      u+=node.ram.used;
    })
    this.ram.max = m;
    this.ram.used = u;

    /* TODO: compare it to simulated ram */

    /* get valid targets from ones with valid scores */
    const targets = [...roots].filter((node) => node.score > 0);
    targets.sort((a, b) => b.score - a.score); // Sort scores high to low
  }
  //  calculate the available ram on the network
  //  validate targets
  //  select a target (usually the top one)
  //  check if the current target is the same as the last target
  //  if different
  //    clear the que of attacks
  //    calculate a batch
  //    does it need to be prepped?
  //    calculate preparation batches
  //  if same
  //    check the current status of the target compared to simulated status
  //    CHECK: What is the margin of error

  /**==========================================================================
   *                           Methods
   *===========================================================================
   */
  flatten_network() {
    this.LOG(LogLevel.DEBUG, "NTMGR", `flatten_network() start`);
    if (this.network.new === null) return [];

    const network_arr: Server_String[] = [];
    /* Helper functon for recursive traverse */
    function traverse(node: Server_String) {
      if (node instanceof Server_String && node.security.root) {
        network_arr.push(node as Server_String);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child: Server_String) => traverse(child));
      }
    }
    /* Now traverse the network */
    traverse(this.network.new);

    return network_arr;
  }
}

type Network = {
  new: Server_String | null;
  old: Server_String | null;
  readonly new_flat: Server_String[] | [];
  readonly old_flat: Server_String[] | [];
};

class NetworkHolder {
  new: Server_String | null;
  old: Server_String | null;

  constructor() {
    this.new = null;
    this.old = null;
  }

  get new_flat(): Server_String[] | [] {
    return this.flatten_network(this.new);
  }

  get old_flat(): Server_String[] | [] {
    return this.flatten_network(this.new);
  }

  flatten_network(net: Server_String | null) {
    if (net === null) return [];

    const network_arr: Server_String[] = [];
    /* Helper functon for recursive traverse */
    function traverse(node: Server_String) {
      if (node instanceof Server_String && node.security.root) {
        network_arr.push(node as Server_String);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child: Server_String) => traverse(child));
      }
    }
    /* Now traverse the network */
    traverse(net);

    return network_arr;
  }
}

export async function main(ns: NS) {
  const args = ns.args;
  const parent_pid = args[0] as number;

  ns.ui.setTailTitle(
    `Scheduler | ${ns.formatRam(ns.getScriptRam(ns.getScriptName()))}`,
  );
  ns.disableLog(`ALL`);

  const scheduler = new Scheduler(ns, "home", parent_pid);
  ns.write("/logs/home/managers/scheduler.txt", "", "w");
  ns.clearLog();

  await scheduler.process();
}
