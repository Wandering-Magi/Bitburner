import { NS } from "@ns";

export async function main(ns: NS){
  const data = ns.flags([
    ['server', ''],
  ])

  let target:string;
  if(typeof data.server === "string"){
    target = data.server;
  } else {
    ns.tprint(`Incorrect server type.`);
    return;
  }

  /* Check to make sure it is a valid server */
  if(!ns.serverExists(target)) {
    ns.tprint(`Server ${target} does not exist. Aborting.`);
    return;
  }

  /* Connect to the target server */
  /* Nuke it */
  ns.nuke(target);
  /* Transfer basic_hack.ts */
  ns.scp("basic_hack.ts", target, "home");
  /* Get ram cost of basic_hack.ts */
  const ram_cost:number = ns.getScriptRam("basic_hack.ts");
  /* Calculate the available ram on server */
  const server_max:number = ns.getServerMaxRam(target);
  /* Deploy X threads of basic_hack.ts */
  const thread_count:number = Math.floor(server_max/ram_cost);
  ns.exec("basic_hack.ts", target, {threads: thread_count}, '--server', `${target}`);
}
