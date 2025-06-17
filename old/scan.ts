import { NS } from "@ns";

// clear; run scan.ts --fields ram root nuke level money max_money security min_sec --depth 20;mem scan.ts

const PORT_HACKS = 5;

type Treenode = {
  name: string,
  children?: Treenode[],
  cct?: any[],
  root?: boolean,
  ram?: number,
  free?: number,
  level?: number,
  nuke?: number,
  money?: number,
  max_money?: number,
  security?: number,
  min_sec?: number,
  properties?: any[],
};

const VALID_KEYS = [
  'name',
  'children',
  'cct',
  'root',
  'ram',
  'free',
  'level', 
  'nuke',
  'money',
  'max_money',
  'security',
  'min_sec',
  'properties',
];

function vaidate_keys(ns: NS, flags: Array<string>)
{
  let fail = true;
  for(let flag in flags) {
//    ns.tprint(`INFO checking ${flags[flag]}:${(VALID_KEYS.includes(flags[flag].toLowerCase()))}`)
    if(!(VALID_KEYS.includes(flags[flag].toLowerCase()))){
      fail = false;
      ns.tprint(`ERROR ${flags[flag]} is not a valid flag.`);
    }  
  }
//  ns.tprint(`INFO fail? ${fail}`);
  return true;
}

function steal_files(ns: NS, server: string)
{
  const lit_txt: Array<string> = ['lit', 'txt'];
  let files: Array<string> = ns.ls(server);
  if(files.length == 0) return;

  files.forEach((file) => {
    let filetype = file.split('.')[1];
    if(!(filetype in lit_txt)) return;

    ns.scp(file, 'home', server);
  })
}

function nuke_node(ns: NS, node: string)
{
  if(PORT_HACKS >= 1) ns.brutessh(node);
  if(PORT_HACKS >= 2) ns.ftpcrack(node);
  if(PORT_HACKS >= 3) ns.relaysmtp(node)
  if(PORT_HACKS >= 4) ns.httpworm(node);
  if(PORT_HACKS >= 5) ns.sqlinject(node);
  ns.nuke(node);
}

function scan_children(
  ns: NS, 
  node_arr: Array<Treenode>,
  parent: string, 
  server: string, 
  depth: number, 
  max_depth: number,
  node: Treenode
){
  /* stop at max depth */
  if(depth > max_depth) return;

  const server_list:Array<string> = ns.scan(server);
  server_list.forEach((child) => {
    /* stop infinite looping */
    if(child === parent) return;
    
    /* create a node for the child */
    const child_node: Treenode = {name: child};

    /* add it to the current nodes children */
    if(!node.children) node.children = [];
    node.children.push(child_node);
    
    /* steal all of the files from the child server*/
    steal_files(ns, child);

    /* add the available cct's */
    const cct: Array<string> = ns.ls(child, '.cct');
    if(cct.length > 0){
      if(!child_node.cct) child_node.cct = [];
      child_node.cct.push(cct);
    } 

    /* ram */
    child_node.ram = ns.getServerMaxRam(child_node.name);
    child_node.free = child_node.ram - ns.getServerUsedRam(child_node.name);

    /* hacking level */
    child_node.level = ns.getServerRequiredHackingLevel(child_node.name);
    
    /* ports */
    child_node.nuke = ns.getServerNumPortsRequired(child_node.name);
    
    /* check root access */
    child_node.root = ns.hasRootAccess(child_node.name);

    /* M O N E Y */
    child_node.money = ns.getServerMoneyAvailable(child_node.name);
    child_node.max_money = ns.getServerMaxMoney(child_node.name);
    
    /* Security */
    child_node.security = ns.getServerSecurityLevel(child_node.name);
    child_node.min_sec = ns.getServerMinSecurityLevel(child_node.name);

    /* Finaly, add the completed node to the array */
    node_arr.push(child_node);

    /* Recursively build the tree */
    scan_children(ns, node_arr, server, child, depth + 1, max_depth, child_node);
  })
}

function print_tree(
  ns: NS,
  node: Treenode,
  prefix: string = "",
  isLast: boolean = true,
  list_properties: boolean = false,
  index:number = 0,
){
  const connector = prefix === "" ? "┗ " : (isLast ? "┗ " : "┣ ");

  let props:string = '';
  if(node.properties && list_properties) {
    props = ' ['+node.properties+']';
  }
  ns.tprint(prefix + connector + node.name + props);

  const childPrefix = prefix + (isLast ? "  " : "┃ ");
  const children = node.children || [];
  children.forEach((child, idx) =>
    print_tree(ns, child, childPrefix, idx === children.length - 1, list_properties, index + 1)
  );
}

function color_text_confirm(text: string){

  return `\x1b[38;5;34m${text}\x1b[m`;
}

function print_network(
  ns: NS,
  nodes: Array<Treenode>,
  fields: Array<string>,
){
  let out_lines = [];

  let string_len = {};

  /* Iterate through all of the nodes to get max string lengths */
  nodes.forEach((node) => {
    for(const [key, value] of Object.entries(node)){
      if(string_len[key] === undefined) string_len[key] = key.length;
      let format_value = undefined;
      switch(key){
        case 'free':
        case 'ram':
          format_value = ns.formatRam(value).length;
          break;
        case 'max_money':
        case 'money':
          format_value = ('$'+ns.formatNumber(value, 3, undefined, true)).length;
        default:
      };
      string_len[key] = Math.max(format_value ?? value.toString().length, string_len[key]);
    }
  })

  /* Header Start */
  let top_line = '┏';
  let labels = '┃';
  let bottom_line = '┣'

  /* Always list names */
  top_line += `${'━'.repeat(string_len.name+2)}`;
  labels += ` ${'HOST NAME'.padStart(string_len.name)} `;
  bottom_line += `${'━'.repeat(string_len.name+2)}`;

  /* Iterate for each requested field */
  fields.forEach((flag) => {
    top_line += `┳${'━'.repeat(string_len[flag]+2)}`;
    labels += `┃ ${flag.toUpperCase().padStart(string_len[flag])} `;
    bottom_line += `╋${'━'.repeat(string_len[flag]+2)}`;
  })

  /* Header end */
  top_line += `┓`;
  labels += `┃`;
  bottom_line += `┫`;

  /* Send to terminal */
  out_lines.push(top_line, labels, bottom_line);

  /* Iterate through the nodes */
  nodes.forEach((node) => {
    let node_str:string = `┃ ${node.name}${' '.repeat(string_len.name - node.name.length)} `;
    
    /* Format output strings */
    fields.forEach((flag) => {
      let flag_str:string;
      switch(flag){
        case 'free':
        case 'ram':
          flag_str = ns.formatRam(node[flag]).padStart(string_len[flag]);
          break;
        case 'root':
          if(node.root) flag_str = "Y".padStart(string_len[flag]);
          else flag_str = "N".padStart(string_len[flag]);
          break;
        case 'level':
          if(node.level <= ns.getHackingLevel()){
            flag_str = color_text_confirm(node.level.toString().padEnd(string_len.level))
          } else {
            flag_str = node.level.toString().padEnd(string_len.level);
          }
          break;
        case 'nuke':
          if(node.nuke <= PORT_HACKS) {
            flag_str =  color_text_confirm((node.nuke.toString()).padEnd(string_len.nuke))
          } else {
            flag_str = (node.nuke.toString()).padEnd(string_len.nuke);
          }
          break;
        case 'max_money':
        case 'money':
          flag_str = ('$'+ns.formatNumber(node[flag], 3, undefined, true)).padStart(string_len[flag]);
          break;
        default:
          flag_str = node[flag].toString().padStart(string_len[flag]);
      }
      node_str += `┃ ${flag_str} `;
    })

    node_str += '┃';
    
    out_lines.push(node_str);
  })

  /* Footer */
  let footer_str = `┗${'━'.repeat(string_len.name+2)}`;
  fields.forEach((flag) => {
    footer_str += `${'┻'}${'━'.repeat(string_len[flag]+2)}`;
  })
  footer_str += '┛';
  out_lines.push(footer_str);
  
  ns.clearLog();
  out_lines.forEach((line) => {
    ns.print(line);
  });
}


interface ScanFlags {
    help: boolean;
    depth: number;
    tree: boolean;
    fields: boolean;
    _: string[];
}

export async function main(ns: NS){
  const data = ns.flags([
    ['help', false],
    ['depth', 0],
    ['tree', false],
    ['fields', false],
  ]) as unknown as ScanFlags;

  if(!vaidate_keys(ns, data._)) return;

  ns.ui.openTail();
  ns.ui.setTailTitle("Network Scan");
  while(true){
    let node_list: Array<Treenode> = [];
    let nodes:Treenode = {name: "home"};

    scan_children(ns, node_list, "", "home", 1, data.depth, nodes);
    
    if(data.tree) print_tree(ns, nodes, undefined, undefined, data.tree);
    print_network(ns, node_list, data._);

    ns.writePort(1, JSON.stringify(node_list));

    await ns.sleep(1000);
  }
}
