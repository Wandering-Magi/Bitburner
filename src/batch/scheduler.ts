import { NS } from "@ns";
import { Treenode } from 'utils/treenode';

type Action = {
  target: string,
  script: string,
  sched_pid: number,
  expected_start: number,
  expected_end: number,
  threads: number,
  ram_cost: number,
  batch_final?: Boolean,
}

type Result = {
  true_start: number,
  true_end: number,
}

type HGW = {
  hack_time: number,
  weak_time: number,
  grow_time: number,
  hack_ram: number,
  weak_ram: number,
  grow_ram: number,
}

let MARGIN = 5; // Time in milliseconds actiosns should finish after each other

function build_HGW(ns: NS, target: Treenode): HGW
{
  let hack_time = ns.getHackTime(ns.getHostname());
  let hgw = {
    hack_time: hack_time, 
    grow_time: hack_time * 3.2, 
    weak_time: hack_time * 4, 
    weak_ram: ns.getScriptRam('/batch/thread_weak.js', ns.getHostname()), 
    grow_ram: ns.getScriptRam('/batch/thread_grow.js', ns.getHostname()), 
    hack_ram: ns.getScriptRam('/batch/thread_hack.js', ns.getHostname()), 
  }
  return hgw;
}

/**
  * Assesses the state of the target and returns the chosen command tree based on if the target
  * is in a primed state
  * @param {NS} ns - import ns for .ns methods
  * @param {Treenode} target - the target as a treenode formatted dict
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

function get_last_time(schedule: Array<Action>)
{
  if(schedule.length > 0) return schedule[schedule.length-1].expected_end;
  return Date.now();
}

/** Will weaken the target until it is at the minimum security value 
 *
 */
function weaken_target(ns: NS, target: Treenode, schedule: Array<Action>, hgw: HGW)
{
  const weaken_amount = Math.floor((target.security - target.min_sec) / 0.05);

  ns.print(`${target.name} will require ${weaken_amount} threads to weaken ${target.security}=>${target.min_sec}`);
  ns.print(`${target.name} has ${ns.formatRam(target.free)} of RAM remaining`);

  let threads = Math.floor(target.free/hgw.weak_ram);
  ns.print(`${target.name} can support ${threads} threads.`);

  const start = get_last_time(schedule) + MARGIN;
  
  schedule.push({
    target: target.name,
    script: '/batch/thread_weak.js',
    sched_pid: ns.pid,
    expected_start: start,
    expected_end: start + hgw.weak_time,
    threads: threads,
    ram_cost: hgw.weak_ram * threads,
    batch_final: true,
  })
}

function grow_target(ns: NS, target: Treenode, schedule: Array<Action>, hgw: HGW)
{
  let mult = target.max_money / target.money;
  let ga = Math.ceil(ns.growthAnalyze(target.name, mult));
  let th_w = ns.growthAnalyzeSecurity(1);
  ns.print(`Threads required: ${ga}`);
  ns.print(`Security Increase per thread: ${th_w}`);
  let to_w = 0.05 / 0.004;
  ns.print(`Can run ${to_w} threads per weaken`);

}

function hack_target(){
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
      const start_time = get_last_time(schedule);
      const order = ['hack', 'weak', 'grow', 'weak']
      const times = [hack_time, weak_time, grow_time, weak_time];
      let next_time = curr_time + hack_time;

      for(let i=0; i<order.length; i++){
        schedule.push({
          target: target.name,
          script: order[i],
          sched_pid: ns.pid,
          expected_end: next_time,
          expected_start: next_time - times[i],
          batch_final: i == order.length - 1,
          threads: 1,
        })

        next_time += MARGIN;
      }
    }
  }
}

function schedule_batch(ns: NS, type: string, target: Treenode, schedule: Array<Action>, hgw: HGW)
{
  switch(type){
    case 'weaken':
      weaken_target(ns, target, schedule, hgw);
      break;
    case 'grow':
      grow_target(ns, target,schedule, hgw);
      break;
  }
  
  /* Sort the schedule by expected start times, increasing */
  schedule.sort((a, b) => a.expected_start - b.expected_start);
}

export async function main(ns: NS): Promise<void> {


  let target: Treenode = JSON.parse(ns.args[0]);
  let ram_cost = ns.getScriptRam(`/batch/scheduler.js`);
  target.free -= ram_cost;

  ns.ui.openTail();
  ns.ui.setTailTitle(`Scheduler: ${ns.formatRam(ram_cost)} | ${target.name} `);

  const manager_PID = ns.args[1];
  const PID = ns.pid;
  let schedule: Array<Action> = [];
  let running: Array<Action> = [];

  ns.scp(['/batch/scheduler.js', '/batch/thread_weak.js', '/batch/thread_grow.js', '/batch/thread_hack.js'], target.name);
  
  let first = true;
  while(true){
    
    await ns.nextPortWrite(PID);
    const start_time = Date.now();
    const port_report = JSON.parse(ns.readPort(ns.pid));
    if(Object.hasOwn(port_report, 'network_update')){
      target = port_report.network_update.target;
    }
    const hgw = build_HGW(ns, target);

    ns.clearLog();
    
    ns.print(`Hack: ${Math.ceil(hgw.hack_time/1000)}s | Ram: ${ns.formatRam(hgw.hack_ram)}`);
    ns.print(`Weak: ${Math.ceil(hgw.weak_time/1000)}s | Ram: ${ns.formatRam(hgw.weak_ram)}`);
    ns.print(`Grow: ${Math.ceil(hgw.grow_time/1000)}s | Ram: ${ns.formatRam(hgw.grow_ram)}`);

    /* HGW response */
    const assess = assess_server(ns, target);

    schedule_batch(ns, assess.toLowerCase(), target, schedule, hgw);
    /* Wake at the next appointed batch time */
    const runtime = Date.now() - start_time;
    ns.print(`Runtime: ${runtime}`);
    //await ns.sleep(schedule[0].expected_start - Date.now());


    if(schedule.length > 0 && schedule[0].ram_cost <= target.free){
      const scrip = schedule[0];
      ns.print(`${scrip.target} will cost ${ns.formatRam(scrip.ram_cost)} RAM to attack`);
      const new_pid = ns.exec(scrip.script, scrip.target, scrip.threads, scrip.target, scrip.expected_end - scrip.expected_start, scrip.expected_end);
      ns.tprint(`Attempting to run command on ${new_pid}`);
      running.push(scrip);
      schedule.shift()
    }
    
    schedule.forEach((time) => {
      ns.print(`${time.target} ${time.script} @ ${time.expected_start} => ${time.expected_end}`);
    });

    //await ns.sleep(10000);

  }
}
