import { NS } from "@ns";
import { Server } from "utils/server";
import { print_grid } from "./utils/grid";

export async function main(ns: NS): Promise<void> {
  const target = ns.args[0];
  const delay = ns.args[1];
  ns.ui.setTailTitle(`Monitor ${ns.formatRam(ns.getScriptRam('monitor.js'))}| ${target}`);

  try {
    while(true){
      const s = new Server (ns, target);

      ns.clearLog();
      ns.print(`
Level   : ${s.level}
--Root--
Ports   : ${s.nuke_ports}
Has Root: ${s.root}
--Ram--
Used    : ${s.ram_used_str}/${s.ram_str} ${Math.floor((s.ram_used/s.ram)*100)}%
Free    : ${s.ram_free_str}
--Money--
Current : ${s.money_str}
Max     : ${s.max_money_str}
--Security--
Current : ${s.security}
Min     : ${s.min_security}
      --Hack--
      `);
      print_grid(ns, [s.grid_JSON]);
      
      await ns.sleep(delay);
    }
  }
  catch {
    ns.print("That is not a valid server name");
  }
}
