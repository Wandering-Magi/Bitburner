/*  
private calc_batch() {
    this.start_state();

    const hack = {
      time: this.ns.getHackTime(this.targets.valid[0].name),
      amount: this.ns.hackAnalyze(this.targets.valid[0].name),
    };

    this.ns.print(`Time: ${hack.time}ms\nAmount: ${hack.amount}`);

    this.transition("idle");
  }
*/

import { NS } from "@ns";
import { Base, extender } from "/mixins/extender";
import { Logger } from "/mixins/logger";
import { Runtime } from "/mixins/runtime";
import { StateMachine } from "/mixins/state_machine";
import { Telecoms } from "/mixins/telecom";

interface Scheduler extends Logger, Telecoms, Runtime, StateMachine {}

class Scheduler extends extender(Base, Logger, Telecoms, Runtime, StateMachine) implements Scheduler{
  transitions = {
    startup: ["idle"],
    idle: ["idle", "end"],
    end: [],
  } as const;

  state_handlers = {
    startup: this.startup.bind(this),
    idle: this.idle.bind(this),
    end: this.end.bind(this),
  } as const;

  constructor(ns: NS, name: string) {
    super(ns, name);
  }

  /**==========================================================================
   *                           Gets
   *===========================================================================
   */

  /**==========================================================================
   *                            States
   *===========================================================================
   */
  private startup() {
    this.start_state();
    /* launch the scheduler */
    this.transition("idle");
  }

  private end() {
    this.start_state();
  }

  private async idle(): Promise<void> {
    this.start_state();
    const msg_pid = await this.listen([], 1000);
    this.transition("idle");
  }
}

export async function main(ns: NS) {
  ns.ui.setTailTitle(
    `Scheduler | ${ns.formatRam(ns.getScriptRam(ns.getScriptName()))}`,
  );
  ns.disableLog(`ALL`);

  const scheduler = new Scheduler(ns, "home");
  ns.write("/logs/home/managers/scheduler.txt", "", "w");
  ns.clearLog();

  await scheduler.process();
}
