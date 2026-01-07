export type HomeView =
  | "root"
  | "local"
  | "online"
  | "online-code"
  | "online-matchmaking";

export type TimeControlChoice = { initialSeconds: number; incrementSeconds: number };
