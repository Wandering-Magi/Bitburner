


export type Treenode = {
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

export const VALID_KEYS = [
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
