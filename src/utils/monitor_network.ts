import {Server_Nuke} from "./server/nuke";
import {print_grid} from "./grid";
import {NS} from "@ns";

function build_network_tree(ns: NS, target: string, depth: number)
{
  let server = new Server_Nuke(ns, target, depth);
  //ns.print(`${'-'.repeat(depth)}${server.name}`);

  /* Attempt to open all ports */
  if(server.ports_open < 5) server.open_ports();
  /* Attempt to nuke the server */
  if(!server.root) server.nuke();

  /* Get the array of connected servers, remove the parent node */
  let arr_children = ns.scan(target);
  if(target != 'home') arr_children.shift();

  /* Build a server obj for each child */
  depth++;
  arr_children.forEach((child) => {
    server.children.push(
      build_network_tree(ns, child, depth)
    );
  })

  return server;
}

export async function main(ns: NS)
{
  ns.ui.setTailTitle(`Network Monitor | ${ns.formatRam(ns.getScriptRam("/utils/monitor_network.js"))}`);
  ns.disableLog("scan");
  ns.clearLog();
  const servers = build_network_tree(ns, "home", 0);
  ns.print(print_tree(ns, servers));
}
