import { NS } from "@ns";
import { Base, i_Base, extender } from "/mixins/extender";
import { StateMachine, i_StateMachine, Transitions } from "/mixins/state_machine";
import { Logger, i_Logger } from "/mixins/logger";

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

interface MyTest extends i_Base, i_StateMachine, i_Logger {}

class MyTest extends extender(Base, StateMachine(myTransitions, "initial"), Logger) {
  constructor(ns: NS) {
    super(ns);
  }
}

export function main(ns: NS) {
  ns.ui.setTailTitle(`Test | ${ns.formatRam(ns.getScriptRam('managers/test_manager.js'))}`);

  ns.clearLog();

  const TestClass = new MyTest(ns);
  ns.print(TestClass.state);
  TestClass.logging.info = true;
  TestClass.transition('scan_network');
  ns.print(TestClass.state);
}
