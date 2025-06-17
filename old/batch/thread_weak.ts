import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
  let target = ns.args[0];
  let action_length = ns.args[1];
  let target_time = ns.args[2];

  try{
    let response = {
      true_start: Date.now(),
      true_end: 0
    }

    let delay = target_time - response.true_start - action_length;

    ns.tprint(`Attempting to weaken ${target}`);
    await ns.weaken(target, {additionalMsec: delay});
    ns.writePort(ns.pid, JSON.stringify(response));
  } catch {
    ns.writePort(ns.pid, "{FAIL: FAIL}");
  }
}
