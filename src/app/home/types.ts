export type HomeView =
  | "root"
  | "local"
  | "online"
  | "online-code"
  | "online-matchmaking"
  | "puzzles";

export type TimeControlChoice = { initialSeconds: number; incrementSeconds: number };
