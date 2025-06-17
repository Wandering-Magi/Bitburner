import { NS, Server } from "@ns";
import {
  Server_Security,
  Server_Ram,
  Server_Money,
  Server_Ports,
  Server_String,
} from "./string";

type BasicSets = {
  ns: NS;
};
interface BasicGets extends BasicSets {
  server: Server;
}

export class Server_Basic extends Server_String implements BasicGets {
  ns: NS;

  private _serverCache?: Server;

  constructor(ns: NS, name: string) {
    const server = ns.getServer(name);
    super(
      ns,
      server.hostname,
      server.ip,
      server.cpuCores,
      server.requiredHackingSkill || 0,
      new Server_Security(
        server.backdoorInstalled || false,
        server.hasAdminRights,
        server.minDifficulty || 0,
        server.hackDifficulty || 0,
      ),
      new Server_Ram(ns, server.maxRam, server.ramUsed),
      new Server_Money(ns, server.moneyAvailable || 0, server.moneyMax || 0),
      new Server_Ports(
        server.numOpenPortsRequired || 0,
        server.ftpPortOpen,
        server.sshPortOpen,
        server.sqlPortOpen,
        server.httpPortOpen,
        server.smtpPortOpen,
      ),
      [],
    );
    this.ns = ns;
    this._serverCache = server;
  }

  get server() {
    if (!this._serverCache) {
      this._serverCache = this.ns.getServer(this.name);
    }
    return this._serverCache;
  }
}
