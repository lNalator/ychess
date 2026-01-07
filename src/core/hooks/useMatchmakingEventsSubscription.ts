"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { onlineGameAtom } from "../data/onlineGame";
import { graphqlSubscribe } from "../api/graphqlWs";
import { GqlMatchmakingEvent, getGameSession, buildGameStateFromGame, clientReady } from "../api/gameApi";
import { gameStateAtom } from "../data/gameState";
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

    const deriveRealtimeStatus = (status: string | null | undefined) => {
      switch (status) {
        case "RUNNING":
          return "in_game";
        case "READY_CHECK":
        case "WAITING_FOR_PLAYER":
        case "CREATED":
          return "waiting_ready";
        case "ENDED":
          return "in_game";
        default:
          return "waiting_ready";
      }
    };

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
          timeControl { initialSeconds incrementSeconds }
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

        if (event.type === "ERROR_OCCURRED") {
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

        if (event.type === "MATCH_PROPOSED" && event.gameId) {
          setOnline((prev) => ({
            ...prev,
            realtimeStatus: "match_found",
            matchmakingMatchId: event.matchId ?? null,
            matchmakingQueued: false,
            enabled: true,
            gameId: event.gameId ?? null,
            playerColor: (event.playerColor as ColorEnum) ?? null,
            viewColor: (event.playerColor as ColorEnum) ?? null,
            lastRealtimeError: null,
            timeControlInitialSeconds: event.timeControl?.initialSeconds ?? prev.timeControlInitialSeconds,
            timeControlIncrementSeconds: event.timeControl?.incrementSeconds ?? prev.timeControlIncrementSeconds,
            drawOfferedByMe: false,
            drawOfferedByOpponent: false,
          }));

          getGameSession({ gameId: event.gameId, clientId: online.clientId })
            .then((session) => {
              setOnline((prev) => ({
                ...prev,
                enabled: true,
                matchmakingQueued: false,
                gameId: session.gameId,
                playerColor: session.playerColor as ColorEnum,
                viewColor: session.playerColor as ColorEnum,
                realtimeStatus: deriveRealtimeStatus(session.game.status),
                gameStatus: session.game.status,
              }));
              setGameState(buildGameStateFromGame(session.game));
              if (session.game.status === "READY_CHECK") {
                clientReady({ gameId: session.gameId, clientId: online.clientId }).catch(() => undefined);
              }
            })
            .catch((e) =>
              setOnline((prev) => ({
                ...prev,
                realtimeStatus: "error",
                lastRealtimeError: String(e),
              }))
            );
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
