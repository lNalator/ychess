import { graphqlRequest } from "./graphqlClient";

export type GqlPosition = { vertical: number; horizontal: number };

export type GqlTimeControl = {
  initialSeconds: number;
  incrementSeconds?: number | null;
};

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
  opponentQuit?: boolean | null;
};

export type GqlGameState = {
  hasGameEnded: boolean;
  reason: GqlReason;
  winner: GqlPlayer | null;
  players: GqlPlayer[];
};

export type GqlGame = {
  id: string;
  code?: string | null;
  status: string;
  turnColor: string;
  timeControl: GqlTimeControl;
  disconnectGraceSeconds: number;
  disconnectingClientId?: string | null;
  disconnectDeadlineAt?: string | null;
  createdAt: string;
  updatedAt: string;
  state: GqlGameState;
};

export type GqlGameSession = {
  gameId: string;
  code?: string | null;
  playerColor: string;
  game: GqlGame;
};

export type GqlMatchmakingEvent = {
  type: "ENQUEUED" | "DEQUEUED" | "MATCH_FOUND";
  at: string;
  clientId: string;
  gameId?: string | null;
  playerColor?: string | null;
  game?: GqlGame | null;
  message?: string | null;
};

export const GAME_FIELDS = `
  id
  code
  status
  turnColor
  timeControl { initialSeconds incrementSeconds }
  disconnectGraceSeconds
  disconnectingClientId
  disconnectDeadlineAt
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
      opponentQuit
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

export async function createInviteGame(input: {
  clientId: string;
  name?: string;
  timeControl: { initialSeconds: number; incrementSeconds?: number | null };
}): Promise<GqlGameSession> {
  const query = `
    mutation CreateInviteGame($input: CreateInviteGameInput!) {
      createInviteGame(input: $input) {
        gameId
        code
        playerColor
        game { ${GAME_FIELDS} }
      }
    }
  `;
  const data = await graphqlRequest<{ createInviteGame: GqlGameSession }>(query, { input });
  return data.createInviteGame;
}

export async function joinInviteGame(input: {
  clientId: string;
  code: string;
  name?: string;
}): Promise<GqlGameSession> {
  const query = `
    mutation JoinInviteGame($input: JoinInviteGameInput!) {
      joinInviteGame(input: $input) {
        gameId
        code
        playerColor
        game { ${GAME_FIELDS} }
      }
    }
  `;
  const data = await graphqlRequest<{ joinInviteGame: GqlGameSession }>(query, { input });
  return data.joinInviteGame;
}

export async function enqueueMatchmaking(input: {
  clientId: string;
  name?: string;
  timeControl: { initialSeconds: number; incrementSeconds?: number | null };
}): Promise<{ enqueued: boolean }> {
  const query = `
    mutation EnqueueMatchmaking($input: EnqueueMatchmakingInput!) {
      enqueueMatchmaking(input: $input) { enqueued }
    }
  `;
  const data = await graphqlRequest<{ enqueueMatchmaking: { enqueued: boolean } }>(query, { input });
  return data.enqueueMatchmaking;
}

export async function dequeueMatchmaking(input: { clientId: string }): Promise<{ dequeued: boolean }> {
  const query = `
    mutation DequeueMatchmaking($input: DequeueMatchmakingInput!) {
      dequeueMatchmaking(input: $input) { dequeued }
    }
  `;
  const data = await graphqlRequest<{ dequeueMatchmaking: { dequeued: boolean } }>(query, { input });
  return data.dequeueMatchmaking;
}

export async function makeMove(input: {
  clientId: string;
  gameId: string;
  from: { vertical: number; horizontal: number };
  to: { vertical: number; horizontal: number };
  promotion?: string;
}): Promise<GqlGame> {
  const query = `
    mutation MakeMove($input: MakeMoveOnlineInput!) {
      makeMove(input: $input) { ${GAME_FIELDS} }
    }
  `;
  const data = await graphqlRequest<{ makeMove: GqlGame }>(query, { input });
  return data.makeMove;
}

export async function requestRematch(input: { clientId: string; gameId: string }): Promise<{ ok: boolean }> {
  const query = `
    mutation RequestRematch($input: RequestRematchInput!) {
      requestRematch(input: $input) { ok }
    }
  `;
  const data = await graphqlRequest<{ requestRematch: { ok: boolean } }>(query, { input });
  return data.requestRematch;
}

export async function respondRematch(input: {
  clientId: string;
  gameId: string;
  accept: boolean;
}): Promise<{ ok: boolean }> {
  const query = `
    mutation RespondRematch($input: RespondRematchInput!) {
      respondRematch(input: $input) { ok }
    }
  `;
  const data = await graphqlRequest<{ respondRematch: { ok: boolean } }>(query, { input });
  return data.respondRematch;
}

export async function quitGame(input: { clientId: string; gameId: string }): Promise<{ ok: boolean }> {
  const query = `
    mutation QuitGame($input: QuitGameInput!) {
      quitGame(input: $input) { ok }
    }
  `;
  const data = await graphqlRequest<{ quitGame: { ok: boolean } }>(query, { input });
  return data.quitGame;
}

export async function getGameSession(input: {
  gameId: string;
  clientId: string;
}): Promise<GqlGameSession> {
  const query = `
    query Game($gameId: ID!, $clientId: ID!) {
      game(gameId: $gameId, clientId: $clientId) {
        gameId
        code
        playerColor
        game { ${GAME_FIELDS} }
      }
    }
  `;
  const data = await graphqlRequest<{ game: GqlGameSession }>(query, input);
  return data.game;
}
