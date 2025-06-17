import { NS } from "@ns";
import { Server_Base } from "utils/server/basic";
import { print_grid } from "./utils/grid";

export async function main(ns: NS): Promise<void> {
  const target = ns.args[0];
  const delay = ns.args[1] || 1000;
  ns.ui.setTailTitle(`Monitor ${ns.formatRam(ns.getScriptRam('monitor.js'))}| ${target}`);

  try {
    while(true){
      ns.ui.resizeTail(670, 160);
      const s = new Server_Base (ns, target);

      ns.disableLog("sleep");
      ns.clearLog();
      print_grid(ns, [s.grid_JSON]);
      await ns.sleep(delay);
    }
  }
  catch {
    ns.print("That is not a valid server name");
  }
}
