import { NS } from "@ns";
import { Treendode } from "/utils/treenode";

export async function main(ns: NS): Promise<void> {
  const server_name = ns.args[0];
  const delay = ns.args[1];

  while(true){
    ns.ui.setTailTitle(`Monitoring: ${server_name}`);
    ns.print(`Hack Time: ${ns.getHackTime} ms`);
    ns.print(`Weak Time: ${ns.getWeakenTime} ms`);
    ns.print(`Grow TIme: ${ns.getGrowTime} ms`);
    ns.print(`Grow Threads: ${}`);
    ns.print(``);
    ns.print(``);
    ns.print(``);
    ns.print(``);
    await sleep(delay);
  }
}
