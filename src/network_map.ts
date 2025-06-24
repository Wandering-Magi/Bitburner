import {NS} from "@ns";


type NTServer = {
  name: string,
  children: NTServer[],
  cct: string[],
}

function build_network_tree(ns: NS, target: string): NTServer
{
  let server: NTServer = {
    name: target,
    children: [],
    cct: ns.ls(target, '.cct'),
  }

  let arr_children = ns.scan(target);
  if(target != 'home') arr_children.shift();

  arr_children.forEach((child: string) => {
    server.children.push(
      build_network_tree(ns, child)
    );
  })

  return server;
}

function print_tree(
  ns: NS,
  node: NTServer,
  prefix: string = "",
  isLast: boolean = true,
  list_properties: boolean = false,
  index:number = 0,
  buffer: string = "\n",
){
  const connector = prefix === "" ? "┗ " : (isLast ? "┗ " : "┣ ");

  let cct = node.cct.length > 0? ` . . . ${node.cct.length} contracts`: '';

  buffer += (prefix + connector + node.name + `${cct}`  + `\n`);

  const childPrefix = prefix + (isLast ? "  " : "┃ ");
  const children = node.children || [];
  children.forEach((child, idx) =>
    buffer = print_tree(ns, child, childPrefix, idx === children.length - 1, list_properties, index + 1, buffer)
  );
  return buffer;
}

export async function main(ns: NS)
{
  ns.ui.setTailTitle(`Network Map | ${ns.formatRam(ns.getScriptRam("/utils/network_map.js"))}`);
  ns.disableLog("scan");
  ns.clearLog();
  const servers = build_network_tree(ns, "home");
  ns.tprint(print_tree(ns, servers));
}
