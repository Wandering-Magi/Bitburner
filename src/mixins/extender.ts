import { NS } from "@ns";
import { Logger } from "./logger";

// Define a constructor type that takes any arguments and returns an instance type T
export type Constructor<T = object> = new (...args: any[]) => T;

// Type for mixin functions: takes a base class and returns an extended class
type Mixin<TBase extends Constructor, TExtended extends Constructor> = (
  base: TBase,
) => TExtended;

// Reducer function type
type MixinReducer<TBase extends Constructor> = (
  accumulated: TBase,
  mixin: Mixin<TBase, Constructor>,
) => Constructor;

type MixinChain<TBase, TMixins extends any[]> = TMixins extends [
  infer First,
  ...infer Rest,
]
  ? First extends (base: any) => infer Next
    ? MixinChain<Next, Rest>
    : never
  : TBase;

/**
 * The prime node without anything. Completely bare.
 * Mind: Empty
 * @param {NS} ns - The Bitburner NetScape object, required by everything
 */
export class Prime {
 readonly ns: NS;
  constructor(ns: NS) {
    this.ns = ns;
  }
}

/**
 * "And the Base shall inherit the Class"
 *    - A Wise Man (Probably)
 * This is the Base class that all other mixins are built on
 * This implicitely includes all Logging functionality from the Logger mixin.
 * @param {NS} ns - The Bitburner NetScape object, required by all mixins for safety
 */
export const Base = Logger(Prime);
export interface Base extends Logger {
 readonly ns: NS;
}

//export const extender = (...parts: any[]) => parts.reduce(creator, Base_Class);
export function extender<
  TBase extends Constructor,
  TMixins extends Array<Mixin<any, any>>,
>(Base: TBase, ...mixins: TMixins): MixinChain<TBase, TMixins> {
  return mixins.reduce(creator, Base) as MixinChain<TBase, TMixins>;
}
/**
 * allMixins is the accumulator
 * elem is the element of the array
 */
export const creator: MixinReducer<any> = (allMixins, each_class) =>
  each_class(allMixins);
