import {NS} from '@ns';
import {Server_Base} from "./basic";

export class Server_Nuke extends Server_Base {
  ports_open: number;
  children: Array<Server_Nuke>;

  constructor(ns: NS, name: string){
    super(ns, name);
    this.ports_open = this.open_ports();
    this.children   = [];
  };

  open_ports(): number {
    const ns = this.ns;
    const programs = [
      { file: 'BruteSSH.exe',  fn: ns.brutessh,  port: this.server.sshPortOpen },
      { file: 'FTPCrack.exe',  fn: ns.ftpcrack,  port: this.server.ftpPortOpen },
      { file: 'relaySMTP.exe', fn: ns.relaysmtp, port: this.server.smtpPortOpen },
      { file: 'HTTPWorm.exe',  fn: ns.httpworm,  port: this.server.httpPortOpen },
      { file: 'SQLInject.exe', fn: ns.sqlinject, port: this.server.sqlPortOpen },
    ];

    for (const each of programs) {
      if (each.port) {
        this.ports_open++;
        continue;
      }
      if (ns.fileExists(each.file, 'home')) {
        if (each.fn(this.name)) this.ports_open++;
      }
    }

    return this.ports_open;
  }

  nuke(): boolean {
    if(this.ports_open < this.nuke_ports){
      this.open_ports();
    }

    if(this.ports_open >= this.nuke_ports){
      this.root = this.ns.nuke(this.name);
    }
    return this.root;
  }
}
