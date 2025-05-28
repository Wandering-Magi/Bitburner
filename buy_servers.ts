import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
  const ram = 8;
  let i = 0;
  while(i < ns.getPurchasedServerLimit()){
    if(ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)){
      const hostname = "mnt";
      ns.purchaseServer(hostname, ram);
      ++i;
    }
    await ns.sleep(1000);
  }
}
