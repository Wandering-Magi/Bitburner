import { NS } from "@ns";
import {Treenode} from "/utils/variables.js";

let RAM_ARR: Array<number> = [];
for (let s = 1; s < 21; s++) {
  let ram = 2 ** s;
  RAM_ARR.push(ram);
}

type CFG = {
  purchase_all: Boolean,
  reserve: number,
}

const DEFAULT_CFG = "#This is the default config file for the Server Manager\n"
  +"#Purchase all server upgrades as they become available and skip prompts\n"
  +"#Default: false\n"
  +"PURCHASE_ALL = false\n"
  +"\n"
  +"#Reserve % of player currency 0-1\n"
  +"#Default: 0.5\n"
  +"RESERVE = 0.5\n"
  +"\n"
  +""

/** 
  * Returns an arry of purchased servers
  * @param {NS} ns - Allows Netscript functions
  * @returns Array<Treenode>
  */
function get_purchased_nodes(ns: NS)
{
  let RAM_ARR: Array<number> = [];
  for (let s = 1; s < 21; s++) {
    let ram = 2 ** s;
    RAM_ARR.push(ram);
  }

  let tn_servers: Array<Treenode> = [];
  ns.getPurchasedServers().forEach((server_name) => {
    const ram = ns.getServerMaxRam(server_name);
    const value = ns.getPurchasedServerCost(ram);
    let upgrade = (ram: number) => {
      return ns.getPurchasedServerCost(
        RAM_ARR[Math.min(RAM_ARR.indexOf(ram)+1, RAM_ARR.lengeth-1)]
      ) - value;
    }

    tn_servers.push({
      name: server_name,
      ram: ram,
      value: value,
      upgrade_cost: upgrade(ram),
    })
  })  

  return tn_servers;
}

async function try_purchase(ns: NS, servers: Array<Treenode>, cfg: CFG): Promise<void>
{
  for(const server of servers){
    if(server.upgrade_cost == 0) continue;
    if(server.upgrade_cost !< Math.floor(ns.getServerMoneyAvailable('home')*cfg.reserve)) continue;

    let name = server.name;
    let ram = server.ram;
    let next_ram = RAM_ARR[RAM_ARR.indexOf(ram)+1];
    let cost = server.upgrade_cost;

    const purchase = cfg.purchase_all 
      || await ns.prompt(`Would you like to upgrade ${name} to ${ns.formatRam(next_ram)} for $${ns.formatNumber(cost)}`);

    if(purchase){
      ns.upgradePurchasedServer(name, next_ram);
      ns.prompt(`${server.name} has been upgraded from ${ns.formatRam(ram)} to ${ns.formatRam(next_ram)}!`);
    } 
  }
}

/**
 * Returns a CFG object referenced from /.config/server_manager_cfg.txt
 * @param {NS} ns - Allows Netscript functions
 * @returns CFG Object
 */
function import_configs(ns: NS)
{
  if(!ns.fileExists('/.config/server_manager.cfg')) {
    ns.write('/.config/server_manager_cfg.txt', DEFAULT_CFG, 'w');
  }
  
  let lines = ns.read('/.config/server_manger_cfg.txt').split('\n');
  let cfg: CFG = {};
  lines.forEach((line) => {
    if(line.startsWith('#')) return;
    let [key, value] = line.split('=').map((e) => e.trim().toLowerCase());
    switch(key){
      case 'purchase_all':
        cfg.purchase_all = Boolean(value);
        break;
      case 'reserve':
        cfg.reserve = Number(value);
        break;
      default:
    }
  })

  return cfg;
}

export async function main(ns: NS): Promise<void> {
  /* Time in seconds to delay each loop */
  const delay = 1;
  while(true) {
    /* Import configs and servers */
    let cfg = import_configs(ns);
    let tn_servers: Array<Treenode> = get_purchased_nodes(ns);

    /* Sort the server list by upgrade cost */
    tn_servers.sort((a,b) => a.upgrade_cost - b.upgrade_cost);

    /* Buying servers */
    try_purchase(ns, tn_servers, cfg);

    /* Log Management */
    ns.ui.setTailTitle(`Server Manager | ${ns.formatRam(ns.getScriptRam('/managers/server_manager.js'))}`);
    ns.clearLog();
  }
}
