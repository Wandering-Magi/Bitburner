import {NS} from "@ns";

export function steal_lit(ns: NS, target: string)
{
  const files = ns.ls(target, ".lit");
  /* Get the array of connected servers, remove the parent node */
  const arr_children = ns.scan(target);
  /* Stop it from infinite recursion */
  if(target != 'home') arr_children.shift();
  
  files.forEach((file) => ns.scp(file, `n00dles`, target));

  /* Build a server obj for each child */
  arr_children.forEach((child: string) => {
    steal_lit(ns, child)
  })
}

export function main(ns: NS){
  steal_lit(ns, "home");
}
