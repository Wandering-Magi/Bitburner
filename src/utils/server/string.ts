import { NS } from "@ns";

type RamStats = {
  max: number;
  used: number;
};
interface RamGets extends RamStats {
  readonly max_str: string;
  readonly used_str: string;
  readonly free: number;
  readonly free_str: string;
}

export class Server_Ram implements RamGets {
  private ns: NS;
  max: number;
  used: number;

  constructor(ns: NS, max: number, used: number) {
    this.ns = ns;
    this.max = max;
    this.used = used;
  }

  get free(): number {
    return this.max - this.used;
  }

  get max_str(): string {
    return this.ns.formatRam(this.max);
  }

  get used_str(): string {
    return this.ns.formatRam(this.used);
  }

  get free_str(): string {
    return this.ns.formatRam(this.free);
  }
}

type MoneyStats = {
  current: number;
  max: number;
};
interface MoneyGets extends MoneyStats {
  readonly current_str: string;
  readonly max_str: string;
}

export class Server_Money implements MoneyGets {
  current: number;
  max: number;

  readonly ns: NS;

  constructor(ns: NS, current: number, max: number) {
    this.ns = ns;
    this.current = current;
    this.max = max;
  }

  get current_str(): string {
    return `$${this.ns.formatNumber(this.current)}`;
  }

  get max_str(): string {
    return `$${this.ns.formatNumber(this.max)}`;
  }
}

type SecurityStats = {
  backdoor: boolean;
  root: boolean;
  min: number;
  current: number;
};
interface SecurityGets extends SecurityStats {
  readonly backdoor_str: string;
  readonly root_str: string;
  readonly min_str: string;
  readonly current_str: string;
}

export class Server_Security implements SecurityGets {
  backdoor: boolean;
  root: boolean;
  min: number;
  current: number;

  constructor(backdoor: boolean, root: boolean, min: number, current: number) {
    this.backdoor = backdoor;
    this.root = root;
    this.min = min;
    this.current = current;
  }

  get backdoor_str(): string {
    return this.backdoor ? "Y" : "N";
  }

  get root_str(): string {
    return this.root ? "Y" : "N";
  }

  get min_str(): string {
    return String(this.min);
  }

  get current_str(): string {
    return String(this.current);
  }
}

type PortStats = {
  required: number;
  open: number;
  ftp: boolean;
  ssh: boolean;
  sql: boolean;
  http: boolean;
  smtp: boolean;
};
interface PortGets extends PortStats {
  readonly open: number;
}

export class Server_Ports implements PortGets {
  required: number;
  ftp: boolean;
  ssh: boolean;
  sql: boolean;
  http: boolean;
  smtp: boolean;

  constructor(
    required: number,
    ftp: boolean,
    ssh: boolean,
    sql: boolean,
    http: boolean,
    smtp: boolean,
  ) {
    this.required = required;
    this.ftp = ftp;
    this.ssh = ssh;
    this.sql = sql;
    this.http = http;
    this.smtp = smtp;
  }

  public get open(): number {
    let count = 0;
    if (this.ftp) count++;
    if (this.ssh) count++;
    if (this.sql) count++;
    if (this.http) count++;
    if (this.smtp) count++;
    return count;
  }
}

type ServerStats = {
  name: string;
  ip: string;
  cores: number;
  level: number;
  security: SecurityGets;
  ram: RamGets;
  money: MoneyGets;
  ports: PortGets;
  children: Server_String[];
};
export interface ServerGets extends ServerStats {
  readonly ns: NS;
  readonly score: number;
  readonly score_str: string;
  readonly grid_JSON: string;
}

/**
 * Represents a server in the network tree.
 *
 * Each server can have 0-many child servers, forming a hierarchical structure.
 * Use this class to manage server properties and relationships.
 *
 * It is recommended to build out the object using NetScape functions.
 *
 * @example
 * const server = ns.getServer('home');
 * const security = {
 *  backdoor: server.hasBackdoor,
 *  root: server.hasRoot,
 *  ...
 * }
 * ...
 * const server = new Server_String(
 * ns,
 * server.name,
 * server.ip,
 * server.cores,
 * server.level,
 * security,
 * ram,
 * money,
 * []);
 */
export class Server_String implements ServerGets {
  name: string;
  ip: string;
  cores: number;
  level: number;
  security: SecurityGets;
  ram: RamGets;
  money: MoneyGets;
  ports: PortGets;
  children: Server_String[];

  readonly ns: NS;
  /**
   * Creates a server instance.
   * @param {NS} ns - The Bitburner NS object for utility functions.
   * @param {string} name - The server's hostname.
   * @param {string} ip - The server's IP address.
   * @param {number} cores - Number of CPU cores.
   * @param {number} level - Server level.
   * @param {SecurityStats} security - Security stats object.
   * @param {MoneyStats} money - Money stats object.
   * @param {RamStats} ram - Ram stats object.
   * @param {Server_String[]} children - Array of child servers.
   */
  constructor(
    ns: NS,
    name: string,
    ip: string,
    cores: number,
    level: number,
    security: SecurityStats,
    ram: RamStats,
    money: MoneyStats,
    ports: PortStats,
    children: Server_String[],
  ) {
    this.ns = ns;
    this.name = name;
    this.ip = ip;
    this.cores = cores;
    this.level = level;
    this.security = new Server_Security(
      security.backdoor,
      security.root,
      security.min,
      security.current,
    );
    this.ram = new Server_Ram(this.ns, ram.max, ram.used);
    this.money = new Server_Money(this.ns, money.current, money.max);
    this.ports = new Server_Ports(
      ports.required,
      ports.ftp,
      ports.ssh,
      ports.sql,
      ports.http,
      ports.smtp,
    );
    this.children = children;
  }

  get score(): number {
    return Math.floor(this.money.max / this.security.min);
  }

  get score_str(): string {
    return this.ns.formatNumber(this.score);
  }

  get grid_JSON(): string {
    return JSON.stringify({
      name: { lable: "Name", value: this.name },
      level: { lable: "Level", value: this.level },
      score: { lable: "Score", value: this.score_str },
      root: { lable: "Root", value: this.security.root_str },
      cur_money: { lable: "Money", value: this.money.current_str },
      max_money: { lable: "Max$", value: this.money.max_str },
      cur_ram: { lable: "FREE RAM", value: this.ram.free_str },
      max_ram: { lable: "RAM", value: this.ram.max_str },
    });
  }

  get server_packet(): string {
    return JSON.stringify({
      name: this.name,
      ip: this.ip,
      cores: this.cores,
      level: this.level,
      security: {
        backdoor: this.security.backdoor,
        root: this.security.root,
        min: this.security.min,
        current: this.security.current,
      },
      ram: {
        max: this.ram.max,
        used: this.ram.used,
      },
      money: {
        current: this.money.current,
        max: this.money.max,
      },
      ports: {
        required: this.ports.required,
        ftp: this.ports.ftp,
        ssh: this.ports.ssh,
        sql: this.ports.sql,
        http: this.ports.http,
        smtp: this.ports.smtp,
      },
      children: this.children.map((child) => JSON.parse(child.server_packet)),
    });
  }
}

/**
 * A function to catch data on the other side of a port and re-hydate it
 * into a Server_String class
 * Will also recursively re-hydrate children
 * @param {NS} ns - The Bitburner NS object for utility functions.
 * @param {string} input - A string typically generated by the server_packet
 * getter of a Server_String class.
 * @returns Server_String class object
 */
export function rehydrate_Server_String(ns: NS, input: string): Server_String {
  const buffer = JSON.parse(input);

  /* Recursively rehydrate children from objects using helper */
  const children = (buffer.children || []).map((child: Server_String) =>
    rehydrateFromObject(ns, child),
  );

  return new Server_String(
    ns,
    buffer.name,
    buffer.ip,
    buffer.cores,
    buffer.level,
    buffer.security,
    buffer.ram,
    buffer.money,
    buffer.ports,
    children,
  );
}

/* Helper function to rehydrate the children */
function rehydrateFromObject(ns: NS, obj: Server_String): Server_String {
  const children = (obj.children || []).map((child: Server_String) =>
    rehydrateFromObject(ns, child),
  );
  return new Server_String(
    ns,
    obj.name,
    obj.ip,
    obj.cores,
    obj.level,
    obj.security,
    obj.ram,
    obj.money,
    obj.ports,
    children,
  );
}
