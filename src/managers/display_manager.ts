import { NS, ProcessInfo } from "@ns";

type DMSets = {
  state: string;
};
interface DMGets extends DMSets {
  readonly manager_pid: number;
}

class Display_Manager implements DMGets {
  private ns: NS;
  private _pid_cache: number;
  state: string;

  constructor(ns: NS) {
    this.ns = ns;
    this._pid_cache = 0;
    this.state = "initialize";
  }

  /**
   * ==========================================================================
   *                        Getters
   * ==========================================================================
   */
  get manager_pid(): number {
    if (this._pid_cache !== 0) return this._pid_cache;

    return this.find_network_manager();
  }

  /**
   * ==========================================================================
   *                        Utility Methods
   * ==========================================================================
   */

  /**
   * Iterates through the network to find if any node is running the Network Manager
   * @returns the PID of the network manager
   */
  find_network_manager() {
    const ns = this.ns;

    function scan_network(node: string): number {
      const scan = ns.scan(node);
      const running: Array<ProcessInfo> = ns.ps(node);
      for (const prog of running) {
        if (prog.filename === "managers/network_manager.js") {
          ns.print(`INFO Found it @PID ${prog.pid}`);
          return prog.pid;
        }
      }
      /* Remove parent nodes */
      if (node !== "home") scan.shift();
      for (const next of scan) {
        scan_network(next);
      }
      return 0;
    }

    return scan_network("home");
  }

  /**
   * ==========================================================================
   *                        Primary Methods
   * ==========================================================================
   */
  async run() {
    while (true) {
      try{
      switch (this.state){
          case 'initialize':

          break;
      }
      } catch (error) {
        this.state = 'error';
      }
      await this.ns.sleep(1000);
    }
  }
}

export async function main(ns: NS) {
  ns.ui.setTailTitle(
    `Display Manager | ${ns.formatRam(ns.getScriptRam(`managers/display_manager.js`))}`,
  );
  ns.disableLog("scan");
  const display = new Display_Manager(ns);
  ns.clearLog();
  ns.print(display.manager_pid);
}
