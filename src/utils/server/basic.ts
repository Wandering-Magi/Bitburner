import {NS} from "@ns";

interface i_Server {
  name:       string;
  ip:         string;
  backdoor:   boolean | undefined;
  root:       boolean;
  level:      number | undefined;
  cur_sec:    number | undefined;
  min_sec:    number | undefined;
  max_ram:    number;
  used_ram:   number;
  free_ram:   number;
  cores:      number;
  money:      number | 0;
  max_money:  number | 0;
  nuke_ports: number | 0;
  points:     number;
  children:   Array<Server_Base>;

  points_str:     string;
  money_str:      string | undefined; 
  max_money_str:  string | undefined; 
  ram_str:        string; 
  ram_used_str:   string; 
  ram_free_str:   string; 

  grid_JSON:      string;
}

export class Server_Base implements i_Server{
  ns: NS;

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
  money:      number | 0;
  max_money:  number | 0;
  nuke_ports: number | 0;
  children:   Array<Server_Base>;

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
    this.money      = this.server.moneyAvailable || 0;
    this.max_money  = this.server.moneyMax || 0;
    this.nuke_ports = this.server.numOpenPortsRequired || 0;
    this.children   = [];
  };

  get server(){
    return this.ns.getServer(this.name)
  };

  get free_ram(): number {
    return this.max_ram - this.used_ram;
  };

  get points(): number | undefined {
    return Math.floor(this.max_money / this.max_ram);
  }

  get points_str(): string {
    return `${this.ns.formatNumber(this.points, 0)}`;
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
