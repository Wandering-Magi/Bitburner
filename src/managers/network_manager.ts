import {NS} from '@ns';
import {Server_Nuke} from '../utils/server/nuke';
import {build_network_tree} from '../utils/network_builder';

type Target = {
  node: Server_Nuke;
  scheduler_pid?: number;
}

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

const allowedTransitions = {
  initial: ['scan_network'],
  scan_network: ['write_port'],
  write_port: ['update_network'],
  update_network: ['validate_targets'],
  validate_targets: ['idle'],
  idle: ['scan_network', 'kill'],
  error: ['idle'],
  kill: []
};

class StateMachine {
  private ns: NS;
  network: {
    old: Server_Nuke,
    new: Server_Nuke
  };
  runtime: {
    start: number,
    end: number,
  };
  logging: {
    debug: boolean,
    info: boolean,
    log: boolean,
    verbose: boolean,
  };
  managed_targets: Array<Target>;
  valid_targets: Array<Server_Nuke>;
  max_targets: number;
  state: string;
  error: string;
  debug: boolean;

  constructor(ns: NS) {
    this.ns = ns;
    this.network = {
      old: null,
      new: null
    };
    this.runtime = {
      start: Date.now(),
      end: Date.now()
    };
    Object.defineProperty(this.runtime, 'total', {
      get: function() {
        return this.end - this.start;
      }
    });
    this.logging = {
      debug: true,
      info: true,
      log: false,
      verbose: false
    };
    this.managed_targets = [];
    this.valid_targets = [];
    this.max_targets = 5;
    this.state = 'initial';
    this.error = '';
    this.debug = true;
  };


  async process() {
    while (this.state !== 'kill') {
      try {
      switch (this.state) {
        case '':
          this.start_state();
          this.change_state('idle');
          break;

        case 'initial':
          this.ns.disableLog('scan');
          this.ns.disableLog('sleep');
          this.ns.clearLog();
          this.start_state();         
          this.change_state('scan_network')
          break;

        case 'scan_network':
          this.start_state();
          this.network.new = build_network_tree(this.ns, 'home');
          this.change_state('write_port');
          break;

        case 'write_port':
          this.start_state();
          this.write_network();
          this.change_state('update_network');
          break;

        case 'update_network':
          this.start_state();
          this.network.old = this.network.new;
          this.change_state('validate_targets');
          break;

        case 'validate_targets':
          this.start_state();
          this.find_valid_targets();
          this.change_state('idle');
          break;

        case 'idle':
          this.start_state();
          this.DEBUG(LogLevel.INFO, 'run', `Total Runtime`);
          await this.ns.sleep(100);
          this.runtime.start = Date.now();
          this.ns.clearLog();
          this.change_state('scan_network');
          break;

        case 'error':
          this.start_state();
          this.change_state('idle');
          break;

        case 'kill':
          break;

        default:
          throw new Error(`${this.state} is not a valid state`);
        }         
      } catch (error) {
          this.state = 'error';
          this.ns.tprint(`ERROR Network Manager encountered an error: `, error.message);
      }
    }
  }

  private DEBUG(level: LogLevel, label: string, ...args: any[]){
    /* Early exit when not logging */
    if(!this.logging[level.toLowerCase()]) return;

    this.runtime.end = Date.now();
    const now = new Date();
    const timestamp = now.toISOString().slice(11, 23); //HH:mm:ss.sss
    const s_label = label.length > 5? label.slice(0,6).toUpperCase() : label.padEnd(5, ' ').toUpperCase();
    const s_time = `@${this.runtime.total}ms`.padEnd(6, ' ');

    const s_args = args.map(a => (typeof a === 'object'? JSON.stringify(a) : String(a))).join(' | ');

    this.ns.print(`INFO | ${timestamp} | ${s_label} | ${s_time} | ${s_args}`);
  }

  change_state(next_state: string) {
    const allowed = allowedTransitions[this.state] || [];
    if (!allowed.includes(next_state)) {
      this.DEBUG(LogLevel.ERROR, 'INVALID', `Cannot transition from ${this.state} to ${next_state}`);
      throw new Error(`Invalid state transition: ${this.state} -> ${next_state}`);
    }
    this.DEBUG(LogLevel.INFO, 'CHNGE', `${this.state} => ${next_state}`);
    this.state = next_state;
  }

  start_state(){
    this.DEBUG(LogLevel.INFO, `START`, `${this.state}`);
  };

  find_valid_targets() {
    let network_arr: Array<Server_Nuke> = [];
    function traverse(node: Server_Nuke) {
      if(node.root && node.points > 0) network_arr.push(node);
      if(node.children && node.children.length > 0) {
        node.children.forEach(child => traverse(child));
      }
    }
    traverse(this.network.new);
    this.valid_targets = network_arr.slice(0, this.max_targets);
  }

  write_network(): boolean {
    const pid = this.ns.pid;
    this.ns.clearPort(pid);
    this.DEBUG(LogLevel.INFO, `DEBUG`, `clearPort(${pid}) complete`);
    //const buffer = JSON.stringify(this.network.new);
    const buffer = this.network.new.network_packet;
    this.DEBUG(LogLevel.INFO, `DEBUG`, `JSON.stringify() complete`);
    const write = this.ns.tryWritePort(pid, buffer);
    this.DEBUG(LogLevel.INFO, `DEBUG`, `tryWritePort() complete`);
    if (!write) throw new Error (`Failed to write to port ${pid}`);
    this.DEBUG(LogLevel.INFO, `DEBUG`, `Wrote network.new to Port ${pid}`);
    return true;
  }
}

export async function main(ns: NS): Promise<void>
{
  ns.ui.setTailTitle(`Network Manager | ${ns.formatRam(ns.getScriptRam('managers/network_manager.js'))}`);
  const data = ns.flags([
    ['debug',   false], // output debug logs to tail
    ['log',     false], // output info to a log
    ['help',    false], // dislpay a help message
    ['verbose', false], // output all logs
    ['v',       false]  // verbose shortform
  ]);

  let server = new StateMachine(ns);
  await server.process();
}
