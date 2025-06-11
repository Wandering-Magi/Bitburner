import {Server_Nuke} from './server/nuke';

/**
 * Recursive function meant to produce a depth-first tree of the network
 * Uses Server_Nuke class objects
 * @param {NS} ns - netscape object for ns.X functions.
 * @param {stirng} target - the target server name as a string
 * @returns a Server type object
 */
export function build_network_tree(ns: NS, target: string)
{
  let server = new Server_Nuke(ns, target);

  /* Attempt to open all ports */
  if(server.ports_open < 5) server.open_ports();
  /* Attempt to nuke the server */
  if(!server.root) server.nuke();

  /* Get the array of connected servers, remove the parent node */
  let arr_children = ns.scan(target);
  /* Stop it from infinite recursion */
  if(target != 'home') arr_children.shift();

  /* Build a server obj for each child */
  arr_children.forEach((child) => {
    server.children.push(
      build_network_tree(ns, child)
    );
  })

  return server;
}
