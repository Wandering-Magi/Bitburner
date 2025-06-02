import { NS } from "@ns";

export async function main(ns: NS){
  const data = ns.flags([
    ['server', ''],
    ['help', false]
  ]);

  /* Make sure the requested server is a string */
  let target:string;
  if(typeof data.server === "string"){
    target = data.server;
  } else {
    ns.tprint(`Incorrect server type.`);
    return;
  }

  /* Check to make sure it is a valid server */
  if(!ns.serverExists(target)) {
    ns.tprint(`Server ${target} does not exist. Aborting.`);
    return;
  }

  const min_security:number = ns.getServerMinSecurityLevel(target);
  const max_money:number = ns.getServerMaxMoney(target);

  let loop_counter = 0;
  while(true){
    ns.print(" ");
    ns.print(" ");
    ns.print(`INFO Now starting loop ${loop_counter}`);
    let current_security:number = ns.getServerSecurityLevel(target);
    let current_money:number = ns.getServerMoneyAvailable(target);

    if(current_security > min_security){
      /* Break the security level on the server until it's the mininmum */
      ns.print(`INFO Security level ${current_security}/${min_security}. Bring it down.`);
      await ns.weaken(target);
    } else if (current_money < max_money){
      /* Increase the server money until it is maxed out */
      ns.print(`INFO Money ${current_money}/${max_money}. We must keep biggering.`);
      await ns.grow(target);
    } else {
      /* Time to do crimes */
      ns.print(`INFO And now it's mine!`);
      await ns.hack(target);
    }

    loop_counter += 1;
  }
}
