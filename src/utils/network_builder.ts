import {NS} from '@ns';
import {Server_Break} from './server/break';

/**
 * Recursive function meant to produce a depth-first tree of the network
 * Uses Server_Nuke class objects
 * @param {NS} ns - netscape object for ns.X functions.
 * @param {stirng} target - the target server name as a string
 * @returns a Server type object
 */
export function build_network_tree(ns: NS, target: string)
{
  const server = new Server_Break(ns, target);
  
  /* Open as many ports as possible and try to nuke the server */
  server.break();

  /* Get the array of connected servers, remove the parent node */
  const arr_children = ns.scan(target);
  /* Stop it from infinite recursion */
  if(target != 'home') arr_children.shift();

  /* Build a server obj for each child */
  arr_children.forEach((child: string) => {
    server.children.push(
      build_network_tree(ns, child)
    );
  })

  return server;
}
