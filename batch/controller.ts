import { NS } from '@ns';

const TICK = 5; // Time per cycle step

type Treenode = {
  name: string,
  children?: Treenode[],
  cct?: any[],
  root?: boolean,
  ram?: number,
  free?: number,
  level?: number,
  nuke?: number,
  money?: number,
  max_money?: number,
  security?: number,
  min_sec?: number,
  ratio?: number,
  value?: number,
  upgrade_cost?: number,
  properties?: any[],
};

const VALID_KEYS = [
  'name',
  'children',
  'cct',
  'root',
  'ram',
  'free',
  'level',
  'nuke',
  'money',
  'max_money',
  'security',
  'min_sec',
  'ratio',
  'value',
  'upgrade_cost',
  'properties',
];

function nuke_node(ns: NS, node: string, files: Array<string>) {
  if('brutessh.exe' in files) ns.brutessh(node);
  if('ftpcrack.exe' in files) ns.ftpcrack(node);
  if('relaysmtp.exe' in files) ns.relaysmtp(node);
  if('httpworm.exe' in files) ns.httpworm(node);
  if('sqlinject.exe' in files) ns.sqlinject(node);

  ns.nuke(node);
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
    node.level < ns.getHackingLevel()
    && !node.root
    && node.nuke <= my_exe.length
  ) {
    nuke_node(ns, node.name, my_exe);
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
    && node.level < Math.floor(ns.getHackingLevel() / 2)
    && node.money > 0
  ) opt_target.push(node);

  /* return a completed node */
  return node;
}


function prep_server(ns: NS, target: string) {
  let server_sec = ns.getServerSecurityLevel(target);
  let server_min = ns.getServerMinSecurityLevel(target);
  let weaken_threads = (server_sec - server_min) / 0.05;

  ns.print(weaken_threads.toString());

}

/* Manages servers the player can/has puchased
 * Will try to buy 8GB servers until the purchase cap
 * After that it will try to iteratively upgrade servers to the data cap.
 * @params {NS} - ns - allows NetScape functions
 */
function manage_servers(ns: NS) {
  ns.disableLog('ALL');

  let ram_arr: Array<number> = [];
  for (let s = 1; s < 21; s++) {
    let ram = 2 ** s;
    ram_arr.push(ram);
  }

  let servers: Array<Treenode> = [];
  /* Try to buy servers until the max */
  /* If it does, bail from function */
  if(ns.getPurchasedServers().length < 25
  && ns.getPurchasedServerCost(8) < Math.floor(ns.getServerMoneyAvailable('home')/2)){
    let name = ns.purchaseServer('mnt', 8); 
    ns.prompt(`Purchased Server: ${name} for ${ns.getPurchasedServerCost(8)}`);
    return;
  }

  /* Build an array of current servers */
  ns.getPurchasedServers().forEach((server_name) => {
    let ram = ns.getServerMaxRam(server_name);
    let value = ns.getPurchasedServerCost(ram);
    let upgrade = (ram: number) => {
      return ns.getPurchasedServerCost(
        ram_arr[Math.min(ram_arr.indexOf(ram)+1, ram_arr.length-1)]
      ) - value;
    } 
    servers.push({
      name: server_name,
      ram: ram,
      value: value,
      upgrade_cost: upgrade(ram),
    })
  })
  
  /* Sort servers by upgrade cost from low to high */
  servers.sort((a,b) => a.upgrade_cost - b.upgrade_cost);

  /* Buy the cheapest server, if you can 
   * Stops buying when they cost more than half of your current money
   */
  if(servers[0].upgrade_cost < Math.floor(ns.getServerMoneyAvailable('home')/2)
  && servers[0].upgrade_cost != 0) {
    let name = servers[0].name;
    let ram = servers[0].ram;
    let nex_ram = ram_arr[ram_arr.indexOf(ram)+1];
    let cost = servers[0].upgrade_cost;

    ns.upgradePurchasedServer(name, nex_ram);
    ns.prompt(`${servers[0].name} has been upgraded from ${ns.formatRam(ram)} to ${ns.formatRam(nex_ram)} for $${ns.formatNumber(cost)}!`);
  }

  ns.enableLog('ALL');
}

export async function main(ns: NS): Promise<void> {
  ns.ui.setTailTitle(`Network Controller ${ns.formatRam(ns.getScriptRam('batch/controller.js', 'home'))}`);
  ns.ui.openTail();

  let managed_targets: Array<string> = [];
  let managed_pids: Array<number> = [];

  let i = 0;

  while (true) {
    let start_time = Date.now();
    let node_arr: Array<Treenode> = [];
    let opt_arr: Array<Treenode> = [];

    // Try to upgrade/buy purchased servers
    manage_servers(ns); 
    // Update the current state of the network
    scan_network(ns, node_arr, 'home', undefined, opt_arr); 

    let hack_time = ns.getHackTime('home'); //time in milliseconds
    let weak_time = hack_time * 4;
    let grow_time = hack_time * 3.2;

    const weak_ram = ns.getScriptRam('batch/weaken_server.js', 'home');

    ns.clearLog();
    ns.print(`Iteration: ${i}`);

    ns.print(`There are ${opt_arr.length} valid targets.`);
    opt_arr.sort((a, b) => b.ratio - a.ratio);
    opt_arr.forEach((node) => ns.print(`${node.name}: $${ns.formatNumber(node.max_money).toString()}:${node.min_sec.toString()} = ${node.ratio}`));

    let launch = {
      target: JSON.stringify(opt_arr[0]),
      name: opt_arr[0].name,
      script: ['/batch/scheduler.js', '/batch/thread_weak.js', '/batch/thread_grow.js', '/batch/thread_hack.js'],
      host: 'mnt',
      threads: 1,
      manage_pid: ns.pid,
    }

    if(!(managed_targets.includes(launch.name))) {
      managed_targets.push(launch.name);
      ns.scp(launch.script, launch.host);
      let script_pid = ns.exec(launch.script[0], launch.host, launch.threads, launch.target, launch.manage_pid);
      managed_pids.push(script_pid);
    }

    let end_time = Date.now();
    ns.print(`Runtime: ${end_time - start_time} ms`);
    ++i;

    await ns.sleep(TICK - (end_time - start_time));
  }
}
