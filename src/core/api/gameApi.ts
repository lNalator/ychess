import { graphqlRequest } from "./graphqlClient";
import Player from "../entities/player.model";
import Piece from "../entities/piece.model";
import PiecesHelper from "../helpers/pieces.helper";
import PlayerHelper from "../helpers/player.helper";
import { ColorEnum } from "../enums/color.enum";
import { GameState } from "../data/gameState";

export type GqlPosition = { vertical: number; horizontal: number };

export type GqlTimeControl = {
  initialSeconds: number;
  incrementSeconds: number;
};

export type GqlMove = {
  from: GqlPosition;
  to: GqlPosition;
  promotion?: string | null;
  by: string;
  playedAt: string;
};

export type GqlClock = {
  whiteSeconds: number;
  blackSeconds: number;
};

export type GqlPlayer = {
  id: string;
  name: string;
  color: string;
  isPlaying: boolean;
};

export type GqlGameView = {
  id: string;
  status: string;
  players: GqlPlayer[];
  timeControl: GqlTimeControl;
  clock: GqlClock;
  moves: GqlMove[];
  winnerClientId?: string | null;
  endReason?: string | null;
};

export type GqlGameSession = {
  gameId: string;
  code?: string | null;
  playerColor: string;
  game: GqlGameView;
};

export type GqlMatchmakingEvent = {
  type: "PLAYER_ENQUEUED" | "PLAYER_DEQUEUED" | "MATCH_PROPOSED" | "MATCH_FAILED" | "ERROR_OCCURRED" | "MATCH_CONFIRMED";
  at: string;
  clientId: string;
  matchId?: string | null;
  gameId?: string | null;
  playerColor?: string | null;
  timeControl?: GqlTimeControl | null;
  deadlineAt?: string | null;
  message?: string | null;
  errorCode?: string | null;
};

export type GqlGameEvent = {
  type:
    | "SESSION_CREATED"
    | "PLAYER_JOINED"
    | "READY_CHECK_STARTED"
    | "PLAYER_READY"
    | "GAME_STARTED"
    | "MOVE_APPLIED"
    | "CLOCK_UPDATED"
    | "GAME_ENDED"
    | "ERROR_OCCURRED"
    | "PLAYER_DISCONNECTED"
    | "PLAYER_RECONNECTED"
    | "DRAW_OFFERED";
  gameId: string;
  at: string;
  message?: string | null;
  errorCode?: string | null;
  targetClientId?: string | null;
  playerId?: string | null;
  playerColor?: string | null;
  move?: GqlMove | null;
  clock?: GqlClock | null;
  deadlineAt?: string | null;
};

export const GAME_FIELDS = `
  id
  status
  players { id name color isPlaying }
  timeControl { initialSeconds incrementSeconds }
  clock { whiteSeconds blackSeconds }
  moves { from { vertical horizontal } to { vertical horizontal } promotion by playedAt }
  winnerClientId
  endReason
`;

export async function createInviteGame(input: {
  clientId: string;
  name?: string;
  timeControl: { initialSeconds: number; incrementSeconds: number };
}): Promise<{ gameId: string; code: string; playerColor: string }> {
  const query = `
    mutation CreateInviteGame($input: CreateInviteGameInputDTO!) {
      createInviteGame(input: $input) {
        gameId
        code
        playerColor
      }
    }
  `;
  const data = await graphqlRequest<{ createInviteGame: { gameId: string; code: string; playerColor: string } }>(query, { input });
  return data.createInviteGame;
}

export async function joinInviteGame(input: {
  clientId: string;
  code: string;
  name?: string;
}): Promise<{ gameId: string; playerColor: string }> {
  const query = `
    mutation JoinInviteGame($input: JoinInviteGameInputDTO!) {
      joinInviteGame(input: $input) {
        gameId
        playerColor
      }
    }
  `;
  const data = await graphqlRequest<{ joinInviteGame: { gameId: string; playerColor: string } }>(query, { input });
  return data.joinInviteGame;
}

export async function enqueueMatchmaking(input: {
  clientId: string;
  name?: string;
  timeControl: { initialSeconds: number; incrementSeconds: number };
}): Promise<{ queued: boolean }> {
  const query = `
    mutation EnqueueMatchmaking($input: EnqueueMatchmakingInputDTO!) {
      enqueueMatchmaking(input: $input) { queued }
    }
  `;
  const data = await graphqlRequest<{ enqueueMatchmaking: { queued: boolean } }>(query, { input });
  return data.enqueueMatchmaking;
}

export async function dequeueMatchmaking(input: { clientId: string }): Promise<{ dequeued: boolean }> {
  const query = `
    mutation DequeueMatchmaking($input: DequeueMatchmakingInputDTO!) {
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
}): Promise<{ ok: boolean; game: GqlGameView | null }> {
  const query = `
    mutation MakeMove($input: MakeMoveInputDTO!) {
      makeMove(input: $input) { ok game { ${GAME_FIELDS} } }
    }
  `;
  const data = await graphqlRequest<{ makeMove: { ok: boolean; game: GqlGameView | null } }>(query, { input });
  return data.makeMove;
}

export async function clientReady(input: { clientId: string; gameId: string }): Promise<{ ok: boolean }> {
  const query = `
    mutation ClientReady($input: ClientReadyInputDTO!) {
      clientReady(input: $input) { ok }
    }
  `;
  const data = await graphqlRequest<{ clientReady: { ok: boolean } }>(query, { input });
  return data.clientReady;
}

export async function resign(input: { clientId: string; gameId: string }): Promise<{ ok: boolean }> {
  const query = `
    mutation Resign($input: ResignInputDTO!) {
      resign(input: $input) { ok }
    }
  `;
  const data = await graphqlRequest<{ resign: { ok: boolean } }>(query, { input });
  return data.resign;
}

export async function getGameSession(input: {
  gameId: string;
  clientId: string;
}): Promise<GqlGameSession> {
  const query = `
    query Game($gameId: ID!, $clientId: ID!) {
      gameState(gameId: $gameId, clientId: $clientId) {
        gameId
        code
        playerColor
        game { ${GAME_FIELDS} }
      }
    }
  `;
  const data = await graphqlRequest<{ gameState: GqlGameSession }>(query, input);
  return data.gameState;
}

export async function notifyDisconnect(input: { clientId: string; gameId: string }): Promise<{ ok: boolean }> {
  const query = `
    mutation NotifyDisconnect($input: NotifyDisconnectInputDTO!) {
      notifyDisconnect(input: $input) { ok }
    }
  `;
  const data = await graphqlRequest<{ notifyDisconnect: { ok: boolean } }>(query, { input });
  return data.notifyDisconnect;
}

export async function notifyReconnect(input: { clientId: string; gameId: string }): Promise<{ ok: boolean }> {
  const query = `
    mutation NotifyReconnect($input: NotifyReconnectInputDTO!) {
      notifyReconnect(input: $input) { ok }
    }
  `;
  const data = await graphqlRequest<{ notifyReconnect: { ok: boolean } }>(query, { input });
  return data.notifyReconnect;
}

export async function offerDraw(input: { clientId: string; gameId: string }): Promise<{ ok: boolean; accepted: boolean }> {
  const query = `
    mutation OfferDraw($input: OfferDrawInputDTO!) {
      offerDraw(input: $input) { ok accepted }
    }
  `;
  const data = await graphqlRequest<{ offerDraw: { ok: boolean; accepted: boolean } }>(query, { input });
  return data.offerDraw;
}

export function buildGameStateFromGame(game: GqlGameView): GameState {
  const white = new Player("WHITE", "White", ColorEnum.WHITE, true, game.clock.whiteSeconds);
  const black = new Player("BLACK", "Black", ColorEnum.BLACK, false, game.clock.blackSeconds);
  const players: Player[] = [white, black];

  players.forEach((p) => {
    const serverPlayer = game.players.find((g) => g.color === p.color);
    p.id = serverPlayer?.id ?? p.id;
    p.name = serverPlayer?.name ?? p.name;
    p.pieces = PiecesHelper.createTeam(p.color as ColorEnum);
    p.eatenPieces = [];
  });

  const sortedMoves = [...(game.moves ?? [])].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
  );

  for (const mv of sortedMoves) {
    const allPieces: Piece[] = PlayerHelper.getAllPieces(players);
    const piece = allPieces.find(
      (p) => p.position.vertical === mv.from.vertical && p.position.horizontal === mv.from.horizontal
    );
    if (!piece) continue;
    const playing = players.find((p) => p.pieces.includes(piece)) ?? players[0];
    const opponent = PlayerHelper.getOpponentPlayer(playing, players);
    const target = allPieces.find(
      (p) => p.position.vertical === mv.to.vertical && p.position.horizontal === mv.to.horizontal
    );
    const after = piece.move({ vertical: mv.to.vertical, horizontal: mv.to.horizontal }, target ?? undefined);
    if (after.hasEaten && after.ate) {
      PlayerHelper.eatPiece(playing, opponent, after.ate);
    }
    if (after.castle) {
      PiecesHelper.moveRookForCastle(playing, piece, after.castle);
    }
    if (after.enPassant) {
      PiecesHelper.eatEnPassant(piece, playing, opponent);
    }
    if (piece.name === "Pawn") {
      const promotionRow = piece.color === ColorEnum.WHITE ? 7 : 0;
      if (mv.to.vertical === promotionRow && mv.promotion) {
        PiecesHelper.pawnPromotion(piece, mv.to, playing);
      }
    }
    PlayerHelper.switchPlayerTurn(players);
  }

  const serverPlayingColor = game.players.find((g) => g.isPlaying)?.color as ColorEnum | undefined;
  if (serverPlayingColor) {
    players.forEach((p) => {
      p.isPlaying = p.color === serverPlayingColor;
    });
  }

  const winner =
    game.winnerClientId && players.find((p) => p.id === game.winnerClientId)
      ? players.find((p) => p.id === game.winnerClientId)!
      : null;

  const reason: Record<string, boolean> = {};
  if (game.endReason) reason[game.endReason.toLowerCase()] = true;

  return {
    players,
    hasGameEnded: game.status === "ENDED",
    winner,
    reason,
  };
}
