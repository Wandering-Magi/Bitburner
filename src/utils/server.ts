import {NS} from '@ns';

export interface ServerImp {
  name: string;
  root: boolean;
  ram: number;
  ram_used: number;
  level: number;
  nuke_ports: number;
  money: number;
  max_money: number;
  security: number;
  min_security: number;
  children?: Treenode[];
  cct?: Array<string>;
  properties?: any[];
  ram_free: number;
  points: number;
  points_str: string;
  money_str: string; 
  max_money_str: string; 
  ram_str: string; 
  ram_used_str: string; 
  ram_free_str: string; 
  grid_json: string;
}

export class Server implements ServerImp {
  private ns: NS;

  name: string;
  root: boolean;
  ram: number;
  ram_used: number;
  level: number;
  nuke_ports: number;
  money: number;
  max_money: number;
  security: number;
  min_security: number;
  children?: Treenode[];
  cct?: any[];
  properties?: any[];

  constructor(ns: NS, name: string) {
    this.ns = ns;
    this.name = name,
    this.root = ns.hasRootAccess(name) || this.attempt_nuke();
    this.level = ns.getServerRequiredHackingLevel(name),
    this.nuke_ports = ns.getServerNumPortsRequired(name),
    this.money = ns.getServerMoneyAvailable(name),
    this.max_money = ns.getServerMaxMoney(name),
    this.security = ns.getServerSecurityLevel(name),
    this.min_security = ns.getServerMinSecurityLevel(name),
    this.ram = ns.getServerMaxRam(name),
    this.ram_used = ns.getServerUsedRam(name)
  }

  get ram_free(): number {
    return this.ram - this.ram_used;
  }

  get points(): number {
    return Math.floor(this.money / this.min_security);
  }

  get points_str(): string {
    return `${this.ns.formatNumber(this.points)}`;
  }

  get money_str(): string {
    return `$${this.ns.formatNumber(this.money)}`;
  }

  get max_money_str(): string {
    return `$${this.ns.formatNumber(this.max_money)}`;
  }

  get ram_str(): string {
    return `${this.ns.formatRam(this.ram)}`;
  }

  get ram_used_str(): string {
    return `${this.ns.formatRam(this.ram_used)}`;
  }

  get ram_free_str(): string {
    return `${this.ns.formatRam(this.ram_free)}`;
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

  private attempt_nuke(): boolean {
    const ns = this.ns;
    const programs = [
      { file: 'BruteSSH.exe', fn: ns.brutessh },
      { file: 'FTPCrack.exe', fn: ns.ftpcrack },
      { file: 'relaySMTP.exe', fn: ns.relaysmtp },
      { file: 'HTTPWorm.exe', fn: ns.httpworm },
      { file: 'SQLInject.exe', fn: ns.sqlinject },
    ];

    let count = 0;
    for (const each of programs) {
      if (ns.fileExists(each.file, 'home')) {
        each.fn(this.name);
        count++;
      }
    }

    if(count >= this.nuke_ports){
      return ns.nuke(this.name);
    }
    return false;
  }

  find_cct(): Array<string> {
    return this.ns.ls(this.name, '.cct');
  }
}
