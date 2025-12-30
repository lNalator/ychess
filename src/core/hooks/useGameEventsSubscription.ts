"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { gameStateAtom, GameState, reviveGameState } from "../data/gameState";
import { onlineGameAtom } from "../data/onlineGame";
import { graphqlSubscribe } from "../api/graphqlWs";
import { GAME_FIELDS, GqlGame, GqlGameState } from "../api/gameApi";
import { ColorEnum } from "../enums/color.enum";

type GameEventData = {
  gameEvents: {
    type: string;
    gameId: string;
    at: string;
    game: GqlGame;
    move?: {
      byPlayerId: string;
      playedAt: string;
      from: { vertical: number; horizontal: number };
      to: { vertical: number; horizontal: number };
      promotion?: string | null;
    };
    player?: { id: string; name: string; color: string };
  };
};

function mergeLocalTimes(local: GameState, remote: GqlGameState): GqlGameState {
  const timeById = new Map(local.players.map((p) => [p.id, p.time]));

  remote.players.forEach((p) => {
    const t = timeById.get(p.id);
    if (typeof t === "number") p.time = t;
  });

  if (remote.winner) {
    const t = timeById.get(remote.winner.id);
    if (typeof t === "number") remote.winner.time = t;
  }

  return remote;
}

export function useGameEventsSubscription() {
  const [online, setOnline] = useAtom(onlineGameAtom);
  const [gameState, setGameState] = useAtom(gameStateAtom);

  useEffect(() => {
    if (!online.enabled || !online.gameId) return;

    const query = `
      subscription GameEvents($gameId: ID!) {
        gameEvents(gameId: $gameId) {
          type
          gameId
          at
          move { byPlayerId playedAt from { vertical horizontal } to { vertical horizontal } promotion }
          player { id name color }
          game { ${GAME_FIELDS} }
        }
      }
    `;

    const unsubscribe = graphqlSubscribe<GameEventData>({
      query,
      variables: { gameId: online.gameId },
      connectionParams: { playerId: online.playerId },
      onData: (data) => {
        const event = data.gameEvents;
        const nextState = event.game.state;
        if (nextState) {
          setGameState((prev) => {
            const merged = mergeLocalTimes(prev, nextState);
            return reviveGameState(merged);
          });

          const me = nextState.players.find((p) => p.id === online.playerId);
          const myColor = me?.color as ColorEnum | undefined;
          if (myColor && online.playerColor !== myColor) {
            setOnline((prev) => ({ ...prev, playerColor: myColor }));
          }
        }
      },
      onError: (err) => {
        console.warn("subscription error", err);
      },
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online.enabled, online.gameId, online.playerId]);

  return { online, gameState };
}
