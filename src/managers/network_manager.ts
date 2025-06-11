import {NS} from '@ns';
import {Server_Nuke} from '../utils/server/nuke';
import {build_network_tree} from '../utils/network_builder';

type Target = {
  node: Server_Nuke;
  scheduler_pid?: number;
}

class StateMachine {
  private ns: NS;
  network: {
    old: Server_Nuke,
    new: Server_Nuke
  };
  runtime: {
    start: number,
    end: number,
  }
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
          this.runtime.end = Date.now();
          this.DEBUG(`Runtime: ${this.runtime.total} ms`);
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

  private DEBUG(buffer: string){
    if (this.debug) this.ns.print('INFO DEBUG - ',buffer);
  };

  CHECKPOINT(){
    this.runtime.end = Date.now();
    this.DEBUG(`CHECKPOINT - @${this.runtime.total}ms`);
  };

  change_state(next_state: string){
    if (this.debug) this.ns.print(`INFO CHANGE - ${this.state} => ${next_state}`);
    this.state = next_state;
  };

  start_state(){
    this.runtime.end = Date.now();
    if (this.debug) this.ns.print(`INFO START - @${this.runtime.total}ms - ${this.state}`);
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
    this.valid_targets = network_arr.splice(this.max_targets-1);
  }

  write_network(): boolean {
    const pid = this.ns.pid;
    this.ns.clearPort(pid);
    const write = this.ns.tryWritePort(pid, JSON.stringify(this.network.new));
    const write1 = this.ns.tryWritePort(pid, JSON.stringify(this.network.new));
    //const write2 = this.ns.tryWritePort(pid, JSON.stringify(this.network.new));
    //const write3 = this.ns.tryWritePort(pid, JSON.stringify(this.network.new));
    if (!write) throw new Error (`Failed to write to port ${pid}`);
    this.DEBUG(`Wrote network.new to Port ${pid}`);
    return true;
  }
}


export async function main(ns: NS): Promise<void>
{
  ns.ui.setTailTitle(`Network Manager | ${ns.formatRam(ns.getScriptRam('managers/network_manager.js'))}`);

  let server = new StateMachine(ns);
  while(true){
    await server.process();
  }
}
