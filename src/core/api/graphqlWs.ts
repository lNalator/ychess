type SubscribeOptions<TData> = {
  query: string;
  variables?: Record<string, unknown>;
  onData: (data: TData) => void;
  onError?: (error: unknown) => void;
  connectionParams?: Record<string, unknown>;
};

type GraphqlWsMessage = {
  type: string;
  id?: string;
  payload?: unknown;
};

export function getGraphQLWsUrl(): string {
  const env = process.env.NEXT_PUBLIC_CHESS_WS_URL;
  if (env) return env;

  const httpUrl = process.env.NEXT_PUBLIC_CHESS_HTTP_URL;
  if (httpUrl?.startsWith("https://")) return httpUrl.replace("https://", "wss://");
  if (httpUrl?.startsWith("http://")) return httpUrl.replace("http://", "ws://");

  return "ws://localhost:3001/graphql";
}

export function graphqlSubscribe<TData>(
  options: SubscribeOptions<TData>
): () => void {
  const ws = new WebSocket(getGraphQLWsUrl(), "graphql-transport-ws");

  const subscriptionId = "1";
  let didSubscribe = false;

  const send = (message: unknown) => ws.send(JSON.stringify(message));

  ws.onopen = () => {
    send({
      type: "connection_init",
      payload: options.connectionParams ?? {},
    });
  };

  ws.onmessage = (event) => {
    const parsed = JSON.parse(event.data as string) as unknown;
    if (!parsed || typeof parsed !== "object") return;
    const msg = parsed as GraphqlWsMessage;
    if (msg.type === "connection_ack") {
      if (didSubscribe) return;
      didSubscribe = true;
      send({
        id: subscriptionId,
        type: "subscribe",
        payload: {
          query: options.query,
          variables: options.variables ?? {},
        },
      });
      return;
    }

    if (msg.type === "next") {
      const payload = msg.payload as { data?: TData } | undefined;
      if (payload?.data) options.onData(payload.data);
      return;
    }

    if (msg.type === "error") {
      options.onError?.(msg.payload);
      return;
    }

    if (msg.type === "complete") {
      ws.close();
      return;
    }

    if (msg.type === "ping") {
      send({ type: "pong" });
    }
  };

  ws.onerror = (event) => {
    options.onError?.(event);
  };

  return () => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        send({ id: subscriptionId, type: "complete" });
      }
    } finally {
      ws.close();
    }
  };
}
