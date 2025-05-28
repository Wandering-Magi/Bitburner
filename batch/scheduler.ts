import { NS } from "@ns";
import { Treenode } from '../batch/helper.js';

type Action = {
  target: string,
  command: string,
  sched_pid: number,
  expected_start: number,
  expected_end: number,
  batch_final?: Boolean,
}

type Result = {
  true_start: number,
  true_end: number,
}

/**
  * Assesses the state of the target and returns the chosen command tree based on if the target
  * is in a primed state
  * @param {NS} - ns - import ns for .ns methods
  * @param {Treenode} - target - the target as a treenode formatted dict
  * @return {String} - the chosen type of attack. 'Weaken', 'Grow', 'Hack'
  */
function assess_server(ns: NS, target: Treenode)
{
  /* Check security */
  let sec = target.security > target.min_sec + 2;
  if(sec) return 'weaken';

  /* Check money */
  let mon = target.money < target.max_money * 0.8;
  if(mon) return 'grow';
  
  /* If everything else is good, start hacking */
  return 'hack';
}

function schedule_batch(ns: NS, type: string, target: Treenode, schedule: Array<Action>)
{
  let margin = 5; // Time in milliseconds actiosns should finish after each other

  let hack_time = ns.getHackTime(ns.getHostname());
  let grow_time = hack_time * 3.2;
  let weak_time = hack_time * 4;

  const weak_ram = ns.getScriptRam('batch/thread_weak.js', ns.getHostname());
  const grow_ram = ns.getScriptRam('batch/thread_grow.js', ns.getHostname());
  const hack_ram = ns.getScriptRam('batch/thread_hack.js', ns.getHostname());

  ns.print(`Hack: ${hack_time} | Ram: ${ns.formatRam(hack_ram)}`);
  ns.print(`Weak: ${weak_time} | Ram: ${ns.formatRam(weak_ram)}`);
  ns.print(`Grow: ${grow_time} | Ram: ${ns.formatRam(grow_ram)}`);


  /* Calculate the ram cost*/
  let batch_cost = 0;
  if(type === 'hack'){
    /* Standard HWGW batch */
    ns.print(`Scheduling HWGW batch`);
    batch_cost += (hack_ram+ weak_ram+ grow_ram+ weak_ram);
    ns.print(`Batch cost ${ns.formatRam(batch_cost)}`);
    if(target.free > batch_cost){
      target.free -= batch_cost;

      const curr_time = Date.now();
      const order = ['hack', 'weak', 'grow', 'weak']
      const times = [hack_time, weak_time, grow_time, weak_time];
      let next_time = curr_time + hack_time;

      for(let i=0; i<order.length; i++){
        schedule.push({
          target: target.name,
          command: order[i],
          sched_pid: ns.pid,
          expected_end: next_time,
          expected_start: next_time - times[i],
          batch_final: i == order.length - 1,
        })

        next_time += margin;
      }
    }
  }

  schedule.sort((a, b) => a.expected_start - b.expected_start);
}

export async function main(ns: NS): Promise<void> {

  const target: Treenode = JSON.parse(ns.args[0]);
  const manager_PID = ns.args[1];
  let schedule: Array<Action> = [];
  let running: Array<Action> = [];

  ns.scp(['/batch/scheduler.js', '/batch/thread_weak.js', '/batch/thread_grow.js', '/batch/thread_hack.js'], target.name);
  
  let first = true;
  while(true){
    let report: Response;
    if(!first) report = JSON.parse(ns.readPort(ns.pid));

    const start_time = Date.now();
    ns.ui.openTail();
    ns.clearLog();

    let assess = assess_server(ns, target);
    ns.print(`Assessed server at ${Date.now() - start_time} ms`);
    ns.ui.setTailTitle(`Scheduler: ${target.name} | ${assess.toUpperCase()}`);

    schedule_batch(ns, assess.toLowerCase(), target, schedule);
    schedule.forEach((time) => {
      ns.print(`${time.target} ${time.command} @ ${time.expected_start} => ${time.expected_end}`);
    });

    const runtime = Date.now() - start_time;
    ns.print(`Runtime: ${runtime}`);
    /* Wake back up on the next PID alert */
    //await ns.nextPortWrite(ns.pid);
    /* Simulate PID activity */
    await ns.sleep(schedule[3].expected_end - Date.now());
    for(let i=0;i<4;i++) schedule.shift();
    target.free = target.ram;
  }
}
