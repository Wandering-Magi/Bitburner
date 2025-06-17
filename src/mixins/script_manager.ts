import { Base } from "./extender";
import { LogLevel } from "./logger";

type Constructor<T = object> = new (...args: any[]) => T;

type Script = {
  hostname: string;
  host_pid: number;
  script: string;
};
interface ScriptManager {
  managed_scripts: Array<Script>;
}

/**
 * mixin for classes that will have to launch and manage other scripts
 * such as schedulers
 */
export const ScriptManager = <TBase extends Constructor<Base>>(Base: TBase) =>
  class extends Base {
    managed_scripts: Array<Script>;
    constructor(...args: any[]) {
      super(...args);
      this.managed_scripts = [];
    }
  };
