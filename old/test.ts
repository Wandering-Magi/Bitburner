import { NS } from "@ns";
//import { Server_Base } from "./utils/server"

class Server_Base {
  private ns: NS;

  name:       string;
  ip:         string;
  backdoor:   boolean | undefined;
  root:       boolean;
  level:      number | undefined;
  cur_sec:    number | undefined;
  min_sec:    number | undefined;
  max_ram:    number;
  used_ram:   number;
  cores:      number;
  money:      number | undefined;
  max_money:  number | undefined;
  nuke_ports: number | undefined;

  constructor(ns: NS, name: string) {
    this.ns         = ns;
    this.name       = name;
    this.ip         = this.server.ip;
    this.backdoor   = this.server.backdoorInstalled;
    this.root       = this.server.hasAdminRights;
    this.level      = this.server.requiredHackingSkill;
    this.cur_sec    = this.server.hackDifficulty;
    this.min_sec    = this.server.minDifficulty;
    this.max_ram    = this.server.maxRam;
    this.used_ram   = this.server.ramUsed;
    this.cores      = this.server.cpuCores;
    this.money      = this.server.moneyAvailable;
    this.max_money  = this.server.moneyMax;
    this.nuke_ports = this.server.numOpenPortsRequired;
  };

  get server(){
    return this.ns.getServer(this.name)
  };

  get free_ram(): number {
    return this.max_ram - this.used_ram;
  };

  get points(): number | undefined {
    return Math.floor(this.max_money / this.max_ram) || undefined;
  }

  get points_str(): string {
    return `${this.ns.formatNumber(this.points)}`;
  }

  get money_str(): string | undefined{
    return `$${this.ns.formatNumber(this.money)}` || undefined;
  }

  get max_money_str(): string | undefined {
    return `$${this.ns.formatNumber(this.max_money)}` || undefined;
  }

  get ram_str(): string {
    return `${this.ns.formatRam(this.max_ram)}`;
  }

  get ram_used_str(): string {
    return `${this.ns.formatRam(this.used_ram)}`;
  }

  get ram_free_str(): string {
    return `${this.ns.formatRam(this.free_ram)}`;
  }

  get grid_JSON(): string {
    return JSON.stringify({
      NAME: this.name,
      LEVEL: this.level,
      POINTS: this.points_str,
      PORTS: this.nuke_ports,
      ROOT: this.root,
      CUR_MONEY: this.money_str,
      MAX_MONEY: this.max_money_str,
      CUR_RAM: this.ram_free_str,
      MAX_RAM: this.ram_str,
    })
  }

  toJSON() {
    // Gather own properties (set attributes)
    const data = { ...this };
    // Gather getter properties (get attributes)
    const proto = Object.getPrototypeOf(this);
    Object.getOwnPropertyNames(proto).forEach(key => {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc && typeof desc.get === 'function') {
        data[key] = this[key];
      }
    });
    return data;
  }
}
export async function main(ns: NS): Promise<void> {
  let serv = new Server_Base(ns, "n00dles");
  //ns.getServer().
  ns.tprint(serv.server.cpuCores);
}
