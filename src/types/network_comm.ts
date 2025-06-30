export type Network_Comms = {
  TELECOM: Comm_Structure
}

type Comm_Structure = {
  header: Header,
  body?: Body,
  footer?: Footer,
}

type Address = {
  addr: string,
  pid: number,
}

type Header = {
  from: Address,
  to: Address,
}

type Body = {
  commands?: Commands,
  responses?: Responses,
  /**
   * A network packet constructed by the Server_String class
   * @requires Server_Sting base class
   */
  network_packet?: string,
}

type Commands = {
  ping?: string,
  shutdown?: boolean,
  HWG?: HWG,
}

type Responses = {
  ping?: DateConstructor,
  complete?: boolean,
  online?: boolean,
}

export type ValidAttacks = 
  | "Hack"
  | "Weak"
  | "Grow"
type HWG = {
  type: ValidAttacks,
  target: string,
  threads: number,
}

type Footer = {}
