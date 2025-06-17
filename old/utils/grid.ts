import { ServerImp } from "./server";

function build_line(
  prefix: string,
  divider:string,
  suffix: string,
  h_line: string,
  keys: Array<string>,
  col_length: JSON)
{
  let line = prefix;
  keys.forEach((key, i) => {
    line += h_line.repeat(col_length[key]);
    line += (i < keys.length - 1) ? divider : suffix;
  });
  return line + '\n';
}

function build_row(
  v_line: string,
  data: JSON,
  col_length: JSON,
  keys: Array<string>,
){
  let row = v_line;
  keys.forEach((key) => {
    row += data[key].toString().padEnd(col_length[key], ' ') + v_line;
  })
  return row + '\n';
}

/**
 * @param {NS} ns - The netscape object
 * @param {Array<Object>} arr - The columns to display.
 * To be given in an array of key:value pairs objects.
 * @param {number} sort_key - The chosen column to sort from. 
 * Default: ''
 * @param {stirng} direction - The direction to sort.
 * Valid keys: increase, decrease, inc, dec, up, down 
 * Default: Increase
 *
 * Example:
 *  display(2, 'inc', [{Name: 'Todd', Age: 24, Hair: 'Brown'}, {Name: 'Alice', Age: 31, Hair: 'Red'}]);
 * 
 * Output:
 *
 */ 
export function print_grid(
  ns: NS,
  arr: Array<string>,
  sort_key: string = '',
  direction: string = 'increase'
){

  const top = ['┏', '┳', '┓']
  const sep = ['┣', '╋', '┫'];
  const bot = ['┗', '┻', '┛']
  const h_line = '━';
  const v_line = '┃';

  /* Break up the array into json objects */
  const table = arr;
  const table_json = table.map(json => JSON.parse(json));
  const keys = Object.keys(table_json[0]);
  const table_head = keys.reduce((acc, key) => ({ ...acc, [key]: key }), {});
  let col_length = keys.reduce((acc, key) => ({ ...acc, [key]: key.length }), {});
;
  
  /* Sort the array , if it hase to be */
  const valid_direction = ['increase', 'decrease', 'inc', 'dec', 'up', 'down'];
  if(!valid_direction.includes(direction)){
    throw new Error('Invalid direction');
  }
  
  if(sort_key !== '' && table.length > 1){
    switch(direction){
      case 'increase':
      case 'inc':
      case 'up':
        table.sort((a,b) => a[sort_key] - b[sort_key]);
        break;
      case 'decrease':
      case 'dec':
      case 'down':
        table.sort((a,b) => b[sort_key] - a[sort_key]);
        break;
    }
  }
  
  /**
   * Iterate through the elements and get the longest string for each key
   * This includes the keys themselves
   */
  table_json.forEach((elem) => {
    keys.forEach((key) => {
      col_length[key] = Math.max(col_length[key], elem[key].toString().length);
    })
  })
  
  /**
   * Build the output string   
   */
  let out_str = '';
  
  /* Top Border */
  out_str += build_line(top[0], top[1], top[2], h_line, keys, col_length);
  /* Header */
  out_str += build_row(v_line, table_head, col_length, keys);
  /* Separator */
  out_str += build_line(sep[0], sep[1], sep[2], h_line, keys, col_length);

  /* Data */
  table_json.forEach((elem) => {
    out_str += build_row(v_line, elem, col_length, keys);
  })

  /* Bottom */
  out_str += build_line(bot[0], bot[1], bot[2], h_line, keys, col_length);

  ns.print(out_str);
}

