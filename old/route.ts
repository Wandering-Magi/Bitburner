import {NS} from '@ns';

function build_route(ns: NS, target: string, acc: Array<string>)
{
  if(target == 'home') return acc;
  acc.push(ns.scan(target)[0]);
  build_route(ns, acc[acc.length-1], acc);
}

function connect_string(ns, list: Array<string>)
{
  let buffer = ``;
  for(let i=list.length-1; i>=0; i--){
    buffer += `connect ${list[i]}; `;
  }
  return buffer;
}

export async function main(ns: NS): Promise<void> 
{
  let args = ns.args;
  try {
    ns.serverExists(args[0]);
    let arr = [args[0]];
    build_route(ns, arr[0] , arr);
    ns.tprint(connect_string(ns, arr));
  }
  catch {
    ns.tprint(`ERROR - Server ${args[0]} does not exist.`);
  }
}
