import {NS} from '@ns';

function get_server(ns: NS, host: string, parent: string)
{
  const children = ns.scan(host);
  for(let i=0; i<children.length; i++ ){
    let server = children[i];
    if(server === parent) continue;
    let scan = ns.getServer(server);
    //ns.print(`Host: ${host} | Parent ${parent} | Server ${server}`);
    if(scan.hasAdminRights && !scan.backdoorInstalled){
      ns.print(`connect ${host}; connect ${server}; backdoor;`);
      return true;
    } else {
      if(get_server(ns, server, host)) {
        return true;
      }
    }
  }
  return false;
}

export async function main(ns: NS): Promise<void> {
  /* Build the server list */
  ns.disableLog('scan');
  ns.clearLog(); 
  get_server(ns, 'home', 'home');
}
