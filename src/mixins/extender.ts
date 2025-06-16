import { NS } from '@ns';

// Define a constructor type that takes any arguments and returns an instance type T
export type Constructor<T = object> = new (...args: any[]) => T;

// Type for mixin functions: takes a base class and returns an extended class
type Mixin<TBase extends Constructor, TExtended extends Constructor> =
  (base: TBase) => TExtended;

// Reducer function type
type MixinReducer<TBase extends Constructor> = (
  accumulated: TBase,
  mixin: Mixin<TBase, Constructor>
) => Constructor;


export interface i_Base {
  ns: NS;
}
/**
 * "And the Base shall inherit the Class"
 *    - A Wise Man (Probably)
 * This is the Base class that all other mixins are built on
 * @param {NS} ns - The Bitburner NetScape object, required by all mixins for safety
 */
export class Base {
  ns: NS;
  constructor(ns: NS) {
    this.ns = ns;
  }
}

//export const extender = (...parts: any[]) => parts.reduce(creator, Base_Class);
export function extender<
TBase extends Constructor, 
TMixins extends Array<Mixin<any, any>> 
>(
  Base: TBase,
  ...mixins: TMixins
): TMixins extends Array<Mixin<any, infer TLast>> ? TLast : TBase {
  return mixins.reduce(creator, Base) as any;
}
/** 
 * allMixins is the accumulator 
 * elem is the element of the array
 */
export const creator: MixinReducer<any> = (allMixins, each_class) => each_class(allMixins);
