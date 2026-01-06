"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { onlineGameAtom } from "../data/onlineGame";
import { graphqlSubscribe } from "../api/graphqlWs";
import { acceptMatch, GAME_FIELDS, GqlMatchmakingEvent } from "../api/gameApi";
import { gameStateAtom, reviveGameState } from "../data/gameState";
import { ColorEnum } from "../enums/color.enum";

type MatchmakingData = {
  matchmakingEvents: GqlMatchmakingEvent;
};

function isMatchmakingData(value: unknown): value is MatchmakingData {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  const obj = value as Record<string, unknown>;
  if (!isRecord(obj)) return false;
  const matchmakingEvents = obj["matchmakingEvents"];
  if (!isRecord(matchmakingEvents)) return false;
  return (
    typeof matchmakingEvents["type"] === "string" &&
    typeof matchmakingEvents["clientId"] === "string"
  );
}

export function useMatchmakingEventsSubscription() {
  const [online, setOnline] = useAtom(onlineGameAtom);
  const [, setGameState] = useAtom(gameStateAtom);

  useEffect(() => {
    if (!online.matchmakingQueued) return;

    const query = `
      subscription MatchmakingEvents($clientId: ID!) {
        matchmakingEvents(clientId: $clientId) {
          type
          at
          clientId
          matchId
          gameId
          playerColor
          deadlineAt
          errorCode
          message
          game { ${GAME_FIELDS} }
        }
      }
    `;

    const unsubscribe = graphqlSubscribe<MatchmakingData>({
      query,
      variables: { clientId: online.clientId },
      connectionParams: { clientId: online.clientId },
      onData: (data) => {
        if (!isMatchmakingData(data)) {
          setOnline((prev) => ({
            ...prev,
            realtimeStatus: "error",
            lastRealtimeError: "Invalid matchmaking payload",
          }));
          return;
        }

        const event = data.matchmakingEvents;

        if (event.type === "ERROR") {
          setOnline((prev) => ({
            ...prev,
            realtimeStatus: "error",
            lastRealtimeError: event.message ?? event.errorCode ?? "Matchmaking error",
          }));
          return;
        }

        if (event.type === "MATCH_FAILED") {
          setOnline((prev) => ({
            ...prev,
            realtimeStatus: "matchmaking",
            lastRealtimeError: event.message ?? "Match failed; continuing search",
            matchmakingMatchId: null,
          }));
          return;
        }

        if (event.type === "MATCH_FOUND" && event.matchId) {
          setOnline((prev) => ({
            ...prev,
            realtimeStatus: "match_found",
            matchmakingMatchId: event.matchId ?? null,
            lastRealtimeError: null,
          }));

          acceptMatch({ clientId: online.clientId, matchId: event.matchId }).catch((e) =>
            setOnline((prev) => ({
              ...prev,
              realtimeStatus: "error",
              lastRealtimeError: String(e),
            }))
          );
          return;
        }

        if (event.type === "MATCH_CONFIRMED" && event.gameId && event.game) {
          setOnline((prev) => ({
            ...prev,
            enabled: true,
            readOnly: false,
            matchmakingQueued: false,
            matchmakingMatchId: null,
            gameId: event.gameId!,
            code: event.game.code ?? null,
            playerColor: (event.playerColor as ColorEnum) ?? null,
            viewColor: (event.playerColor as ColorEnum) ?? null,
            gameStatus: event.game.status,
            realtimeStatus: event.game.status === "IN_PROGRESS" ? "in_game" : "waiting_ready",
            lastRealtimeError: null,
            timeControlInitialSeconds: event.game.timeControl.initialSeconds,
            timeControlIncrementSeconds:
              event.game.timeControl.incrementSeconds ?? 0,
            rematchOpponentRequested: false,
            rematchRequestedByMe: false,
            disconnect: null,
          }));
          setGameState(reviveGameState(event.game.state));
        }
      },
      onError: (err) => {
        console.warn("matchmaking subscription error", err);
        setOnline((prev) => ({
          ...prev,
          realtimeStatus: "error",
          lastRealtimeError: String(err),
        }));
      },
    });

    return () => unsubscribe();
  }, [online.matchmakingQueued, online.clientId, setOnline, setGameState]);
}
