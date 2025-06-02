import { NS } from '@ns';
import {Treenode, VALID_KEYS} from 'utils/treenode';

const TICK = 5; // Time per cycle step

type Target = {
  name: string,
  pid: number,
}

function nuke_node(ns: NS, node: string) 
{
  if(ns.fileExists('BruteSSH.exe', 'home')) ns.brutessh(node);
  if(ns.fileExists('FTPCrack.exe', 'home')) ns.ftpcrack(node);
  if(ns.fileExists('relaySMTP.exe', 'home')) ns.relaysmtp(node);
  if(ns.fileExists('HTTPWorm.exe', 'home')) ns.httpworm(node);
  if(ns.fileExists('SQLInject.exe', 'home')) ns.sqlinject(node);

  ns.nuke(node);
}

class Server {
  private ns: NS;

  name: string;
  server: any;
  root: boolean;
  ram: number;
  ram_used: number;
  level: number;
  nuke_ports: number;
  money: number;
  max_money: number;
  security: number;
  min_security: number;
  children?: Treenode[];
  cct?: any[];
  properties?: any[];

  constructor(ns: NS, name: string) {
    this.ns = ns;
    this.name = name,
    this.server = ns.getServer(name);
    //this.root = ns.hasRootAccess(name),
    this.root = this.attempt_nuke();
    this.level = ns.getServerRequiredHackingLevel(name),
    this.nuke_ports = ns.getServerNumPortsRequired(name),
    this.money = ns.getServerMoneyAvailable(name),
    this.max_money = ns.getServerMaxMoney(name),
    this.security = ns.getServerSecurityLevel(name),
    this.min_security = ns.getServerMinSecurityLevel(name),
    this.ram = ns.getServerMaxRam(name),
    this.ram_used = ns.getServerUsedRam(name)
  }

  get ram_free(): number {
    return this.ram - this.ram_used;
  }

  get points(): number {
    return Math.floor(this.money / this.min_security);
  }

  get points_str(): string {
    return `${this.ns.formatNumber(this.points)}`;
  }

  get money_str(): string {
    return `$${this.ns.formatNumber(this.money)}`;
  }

  get max_money_str(): string {
    return `$${this.ns.formatNumber(this.max_money)}`;
  }

  get ram_str(): string {
    return `${this.ns.formatRam(this.ram)}`;
  }

  get ram_used_str(): string {
    return `${this.ns.formatRam(this.ram_used)}`;
  }

  get ram_free_str(): string {
    return `${this.ns.formatRam(this.ram_free)}`;
  }

  attempt_nuke(): boolean {
    const ns = this.ns;
    const programs = [
      { file: 'BruteSSH.exe', fn: ns.brutessh },
      { file: 'FTPCrack.exe', fn: ns.ftpcrack },
      { file: 'relaySMTP.exe', fn: ns.relaysmtp },
      { file: 'HTTPWorm.exe', fn: ns.httpworm },
      { file: 'SQLInject.exe', fn: ns.sqlinject },
    ];

    let count = 0;
    for (const each of programs) {
      if (ns.fileExists(each.file, 'home')) {
        each.fn(this.name);
        count++;
      }
    }

    if(count >= this.nuke_ports){
      return ns.nuke(this.name);
    }
    return false;
  }

  find_cct(): Array<string> {
    return this.ns.ls(this.name, '.cct');
  }
}

/**
 * Iterates through all network nodes connected to the target server
 * @param {NS} ns - include ns for NetScript calls
 * @param {Array<Treenode>} node_arr - a depth first array of nodes on the network
 * @param {string} server - the target server 
 * @param {string} parent - Optional - the parent of the target
 * @param {Array<Treenode>} opt_target - Optional - an array of targets prime for attack
 * @returns {Treenode} a completed nested Treenode of the target server
 */
function scan_network(
  ns: NS,
  node_arr: Array<Treenode>,
  server: string,
  parent: string = ``,
  opt_target?: Array<Treenode>,
) {
  let node: Treenode = { name: server };

  /* hacking level */
  node.level = ns.getServerRequiredHackingLevel(node.name);
  /* has root access */
  node.root = ns.hasRootAccess(node.name);
  /* ports required to nuke */
  node.nuke = ns.getServerNumPortsRequired(node.name);

  /* break it if you need to (or can) */
  /* scan files for .exe's */
  const port_exe = ['brutessh.exe', 'ftpcrack.exe', 'relaysmtp.exe', 'httpworm.exe', 'sqlinject.exe'];
  const my_exe = ns.ls('home', '.exe').filter(file => port_exe.includes(file.toLowerCase()));
  if (
    node.level <= ns.getHackingLevel()
    && !node.root
    && node.nuke <= my_exe.length
  ) {
    nuke_node(ns, node.name);
    node.root = ns.hasRootAccess(node.name);
  }

  /* M O N E Y */
  node.money = ns.getServerMoneyAvailable(node.name);
  node.max_money = ns.getServerMaxMoney(node.name);

  /* Security */
  node.security = ns.getServerSecurityLevel(node.name);
  node.min_sec = ns.getServerMinSecurityLevel(node.name);

  /* Calculate the ratio for choosing prime targets */
  node.ratio = Math.floor(node.money / node.min_sec);

  /* ram */
  node.ram = ns.getServerMaxRam(node.name);
  node.free = node.ram - ns.getServerUsedRam(node.name);

  /* Look for available cct's */
  const cct: Array<string> = ns.ls(node.name, '.cct');
  if (cct.length > 0) {
    if (!node.cct) node.cct = [];
    node.cct.push(cct);
  }

  /* Handle children */
  const server_list: Array<string> = ns.scan(node.name);
  server_list.forEach((child) => {
    /* stop infinite looping */
    if (child === parent) return;

    if (!node.children) node.children = [];
    /* Recursively build the tree */
    let child_node: Treenode;
    if (opt_target != undefined) {
      child_node = scan_network(ns, node_arr, child, node.name, opt_target);
    } else {
      child_node = scan_network(ns, node_arr, child, node.name);
    }

    /* add the child to the current node */
    node.children.push(child_node);
  })

  /* Finaly, add the completed node to the array */
  node_arr.push(node);

  /* Check if there is an opt_target array, and add it to that, too */
  if (
    opt_target != undefined
    && node.name !== 'home' 
    && node.root
    && node.level <= Math.ceil(ns.getHackingLevel() / 2)
    && node.money > 0
  ) opt_target.push(node);

  /* return a completed node */
  return node;
}

function print_valid_targets(ns: NS, optimal: Array<Treenode>)
{
  ns.print(`There are ${optimal.length} valid targets.`);
  optimal.forEach((server) => {
    ns.print(`${server.name} - $${ns.formatNumber(server.max_money)}:${server.min_sec} => ${server.ratio} pts`);
  })
}

function print_current_targets(ns: NS, targets: Array<Target>)
{
  ns.print(`Currently attacking ${targets.length} targets.`);
  targets.forEach((server) => ns.print(`${server.name} on PID ${server.pid}`));
}

export async function main(ns: NS): Promise<void> {
  ns.ui.setTailTitle(`Network Controller ${ns.formatRam(ns.getScriptRam('batch/controller.js', 'home'))}`);
  ns.ui.openTail();

  let managed_target: Array<Target> = [];

  let i = 0;

  while (true) {
    let start_time = Date.now();
    let node_arr: Array<Treenode> = [];
    let opt_arr: Array<Treenode> = [];

    // Update the current state of the network
    scan_network(ns, node_arr, 'home', undefined, opt_arr);
    opt_arr.sort((a, b) => b.ratio - a.ratio);

    ns.clearLog();

    if(opt_arr.length > 0){
      print_valid_targets(ns, opt_arr);
      if(managed_target.length > 0) print_current_targets(ns, managed_target);
      
      /* Always attack the most potent target */
      let launch = {
        target: JSON.stringify(opt_arr[0]),
        name: opt_arr[0].name,
        script: ['/batch/scheduler.js', '/batch/thread_weak.js', '/batch/thread_grow.js', '/batch/thread_hack.js'],
        host: opt_arr[0].name,
        threads: 1,
        manage_pid: ns.pid,
      }

      if(managed_target.length == 0 ||  managed_target[0].name != launch.name) {
        /* Sent the scripts to the target */
        ns.scp(launch.script, launch.host);
        let script_pid = ns.exec(launch.script[0], launch.host, launch.threads, launch.target, launch.manage_pid);
        if(script_pid!=0) managed_target[0] = {name: launch.name, pid: script_pid};
      }
    }

    managed_target.forEach((scheduler) => {
      ns.print(`Writing Network Status to ${scheduler.name} on port ${scheduler.pid}.`);
      let network_status = {
        network_update: {
          servers: node_arr,
          optimal: opt_arr,
          target: opt_arr[0],
        }
      }
      ns.writePort(scheduler.pid, JSON.stringify(network_status));
    })

    let end_time = Date.now();
    ns.print(`Runtime: ${end_time - start_time} ms`);
    ++i;

    await ns.sleep(TICK - (end_time - start_time));
  }
}
