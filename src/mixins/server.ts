import { Base } from "./extender";
import { LogLevel } from "./logger";

type Constructor<T = object> = new (...args: any[]) => T;

/**
 * DESCRIPTION
 */
export const Server_Base = <TBase extends Constructor<Base>>(Base: TBase) =>
  class extends Base {
    constructor(...args: any[]) {
      super(...args);
    }
  };
