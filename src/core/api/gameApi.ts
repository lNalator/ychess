import { graphqlRequest } from "./graphqlClient";

export type GqlPosition = { vertical: number; horizontal: number };

export type GqlPiece = {
  id: string;
  name: string;
  color: string;
  isAlive: boolean;
  value?: number | null;
  isFirstMove?: boolean | null;
  doubleJump?: boolean | null;
  isChecked?: boolean | null;
  position: GqlPosition;
};

export type GqlPlayer = {
  id: string;
  name: string;
  color: string;
  score: number;
  isPlaying: boolean;
  time: number;
  askedDraw: boolean;
  pieces: GqlPiece[];
  eatenPieces: GqlPiece[];
};

export type GqlReason = {
  checkmate?: boolean | null;
  stalemate?: boolean | null;
  insufficientMaterial?: boolean | null;
  repetition?: boolean | null;
  draw?: boolean | null;
  resign?: boolean | null;
  timeout?: boolean | null;
  agreement?: boolean | null;
};

export type GqlGameState = {
  hasGameEnded: boolean;
  reason: GqlReason;
  winner: GqlPlayer | null;
  players: GqlPlayer[];
};

export type GqlGame = {
  id: string;
  status: string;
  turnColor: string;
  createdAt: string;
  updatedAt: string;
  state: GqlGameState;
};

export const GAME_FIELDS = `
  id
  status
  turnColor
  createdAt
  updatedAt
  state {
    hasGameEnded
    reason {
      checkmate
      stalemate
      insufficientMaterial
      repetition
      draw
      resign
      timeout
      agreement
    }
    winner {
      id
      name
      color
      score
      isPlaying
      time
      askedDraw
      pieces { id name color isAlive value isFirstMove doubleJump isChecked position { vertical horizontal } }
      eatenPieces { id name color isAlive value isFirstMove doubleJump isChecked position { vertical horizontal } }
    }
    players {
      id
      name
      color
      score
      isPlaying
      time
      askedDraw
      pieces { id name color isAlive value isFirstMove doubleJump isChecked position { vertical horizontal } }
      eatenPieces { id name color isAlive value isFirstMove doubleJump isChecked position { vertical horizontal } }
    }
  }
`;

export async function createGame(input: {
  playerId: string;
  name?: string;
  timeLimitSeconds?: number;
}): Promise<GqlGame> {
  const query = `
    mutation CreateGame($input: CreateGameInput!) {
      createGame(input: $input) { ${GAME_FIELDS} }
    }
  `;
  const data = await graphqlRequest<{ createGame: GqlGame }>(query, { input });
  return data.createGame;
}

export async function joinGame(
  gameId: string,
  input: { playerId: string; name?: string }
): Promise<GqlGame> {
  const query = `
    mutation JoinGame($gameId: ID!, $input: JoinGameInput!) {
      joinGame(gameId: $gameId, input: $input) { ${GAME_FIELDS} }
    }
  `;
  const data = await graphqlRequest<{ joinGame: GqlGame }>(query, { gameId, input });
  return data.joinGame;
}

export async function leaveGame(
  gameId: string,
  input: { playerId: string }
): Promise<{ id: string; status: string }> {
  const query = `
    mutation LeaveGame($gameId: ID!, $input: LeaveGameInput!) {
      leaveGame(gameId: $gameId, input: $input) { id status }
    }
  `;
  const data = await graphqlRequest<{ leaveGame: { id: string; status: string } }>(query, { gameId, input });
  return data.leaveGame;
}

export async function makeMove(
  gameId: string,
  input: {
    playerId: string;
    from: { vertical: number; horizontal: number };
    to: { vertical: number; horizontal: number };
    promotion?: string;
  }
): Promise<GqlGame> {
  const query = `
    mutation MakeMove($gameId: ID!, $input: MoveInput!) {
      makeMove(gameId: $gameId, input: $input) { ${GAME_FIELDS} }
    }
  `;
  const data = await graphqlRequest<{ makeMove: GqlGame }>(query, { gameId, input });
  return data.makeMove;
}

export async function getGame(gameId: string): Promise<GqlGame> {
  const query = `
    query Game($gameId: ID!) {
      game(gameId: $gameId) { ${GAME_FIELDS} }
    }
  `;
  const data = await graphqlRequest<{ game: GqlGame }>(query, { gameId });
  return data.game;
}
