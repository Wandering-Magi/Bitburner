import {NS} from "@ns";

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
  ratio?: number,
  value?: number,
  upgrade_cost?: number,
  properties?: any[],
};

export Class Treenode = {
  constructor(name) {
    this.name = name,
    this.root = 
  }
}

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
  'ratio',
  'value',
  'upgrade_cost',
  'properties',
];
