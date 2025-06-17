import { NS } from "@ns";
import { Server_Basic } from "./basic";
import { ServerGets, Server_Ports } from "./string";

export interface BreakGets extends ServerGets {
  readonly file_count: number;
  break(): void;
}

export class Server_Break extends Server_Basic implements BreakGets {
  constructor(ns: NS, name: string) {
    super(ns, name);
  }

  get file_count(): number {
    const programs = [
      "BruteSSH.exe",
      "FTPCrack.exe",
      "relaySMTP.exe",
      "HTTPWorm.exe",
      "SQLInject.exe",
    ];
    let count = 0;
    for (const each of programs) {
      if (this.ns.fileExists(each, "home")) count++;
    }
    return count;
  }

  /**
   * Open the maximum amount of ports
   * Once that is done, nuke the server
   * @returns boolean value if they're all open
   */
  public break(): boolean {
    const ns = this.ns;

    /* Early exits */
    /* Must have the required amount of port .exe's */
    if (this.ports.required > this.file_count) return false;
    /* Must be a high enough level to hack */
    if (this.level > ns.getHackingLevel()) return false;

    /* Always open the max amount of ports, unles they're all open */
    if (this.ports.open !== 5) {
      const programs: Array<{
        file: string;
        fn: (host: string) => void;
        port: keyof Server_Ports;
      }> = [
          { file: "BruteSSH.exe", fn: ns.brutessh, port: "ssh" },
          { file: "FTPCrack.exe", fn: ns.ftpcrack, port: "ftp" },
          { file: "relaySMTP.exe", fn: ns.relaysmtp, port: "smtp" },
          { file: "HTTPWorm.exe", fn: ns.httpworm, port: "http" },
          { file: "SQLInject.exe", fn: ns.sqlinject, port: "sql" },
        ];

      /* Check if each port is already open, try to break it open if not */
      for (const each of programs) {
        if (this.ports[each.port]) continue;
        if (ns.fileExists(each.file, "home")) {
          each.fn(this.name);
        }
      }
    }

    /* Nuke the server */
    if (!this.security.root) this.security.root = ns.nuke(this.name);

    return this.security.root && this.ports.open === 5;
  }
}
