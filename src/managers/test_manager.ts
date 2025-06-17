import { NS } from "@ns";
import { Base, extender } from "/mixins/extender";
import { LogLevel } from "/mixins/logger";
import { StateMachine, Transitions } from "/mixins/state_machine";
import { Telecoms } from "/mixins/telecom";

type MyState =
  | "initial"
  | "scan_network"
  | "write_port"
  | "update_network"
  | "validate_targets"
  | "idle"
  | "error"
  | "kill";

const myTransitions: Transitions<MyState> = {
  initial: ["scan_network"],
  scan_network: ["write_port"],
  write_port: ["update_network"],
  update_network: ["validate_targets"],
  validate_targets: ["idle"],
  idle: ["scan_network", "kill"],
  error: ["idle"],
  kill: [],
};

interface MyTest extends Base, Telecoms, StateMachine<MyState> { }

class MyTest extends extender(Base, Telecoms, StateMachine(myTransitions, "initial")) {
  constructor(ns: NS) {
    super(ns);
  }
}

export async function main(ns: NS) {
  ns.ui.setTailTitle(`Test | ${ns.formatRam(ns.getScriptRam('managers/test_manager.js'))}`);

  ns.disableLog('sleep');
  ns.clearLog();

  const TestClass = new MyTest(ns);
  
  ns.write(TestClass.logFile, '', 'w');
  ns.print(TestClass.state);
  //TestClass.logging.verbose = true;
  TestClass.set_logging({info: true, debug: true});
  const start = Date.now();
  await TestClass.listen([100], 5000);
  const runtime = Date.now() - start;
  TestClass.LOG(LogLevel.INFO, 'MASTR', `Listen Runtime: ${runtime}`);
  TestClass.transition('scan_network');
  //await TestClass.min_listen(ns);
} 
