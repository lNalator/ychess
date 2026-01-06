type SubscribeOptions<TData> = {
  query: string;
  variables?: Record<string, unknown>;
  onData: (data: TData) => void;
  onError?: (error: unknown) => void;
  connectionParams?: Record<string, unknown>;
  onConnected?: () => void;
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

type ConnectionKey = string;

type SubscriptionRecord = {
  id: string;
  query: string;
  variables: Record<string, unknown>;
  onData: (data: unknown) => void;
  onError?: (error: unknown) => void;
  onConnected?: () => void;
};

type SharedConnection = {
  key: ConnectionKey;
  ws: WebSocket;
  connectionParams: Record<string, unknown>;
  didAck: boolean;
  nextId: number;
  subscriptions: Map<string, SubscriptionRecord>;
  closeTimer: ReturnType<typeof setTimeout> | null;
  closeWhenReady: boolean;
  manualClose: boolean;
};

const sharedConnections = new Map<ConnectionKey, SharedConnection>();
const CLOSE_GRACE_MS = 400;

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
  } catch {
    return "";
  }
}

function makeConnectionKey(url: string, connectionParams: Record<string, unknown>) {
  return `${url}::${stableStringify(connectionParams)}`;
}

function send(ws: WebSocket, message: unknown) {
  ws.send(JSON.stringify(message));
}

function ensureConnection(connectionParams: Record<string, unknown>): SharedConnection {
  const url = getGraphQLWsUrl();
  const key = makeConnectionKey(url, connectionParams);
  const existing = sharedConnections.get(key);
  if (existing && existing.ws.readyState !== WebSocket.CLOSED) return existing;

  const ws = new WebSocket(url, "graphql-transport-ws");
  const conn: SharedConnection = {
    key,
    ws,
    connectionParams,
    didAck: false,
    nextId: 1,
    subscriptions: new Map(),
    closeTimer: null,
    closeWhenReady: false,
    manualClose: false,
  };
  sharedConnections.set(key, conn);

  ws.onopen = () => {
    send(ws, { type: "connection_init", payload: conn.connectionParams });
    if (conn.closeWhenReady && conn.subscriptions.size === 0) {
      // Avoid closing before the connection is established (browser noisy error in dev/StrictMode).
      conn.manualClose = true;
      ws.close();
    }
  };

  ws.onmessage = (event) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data as string) as unknown;
    } catch (e) {
      for (const sub of conn.subscriptions.values()) sub.onError?.(e);
      return;
    }

    if (!parsed || typeof parsed !== "object") return;
    const msg = parsed as GraphqlWsMessage;
    if (typeof msg.type !== "string") return;

    if (msg.type === "connection_ack") {
      conn.didAck = true;
      for (const sub of conn.subscriptions.values()) {
        send(ws, {
          id: sub.id,
          type: "subscribe",
          payload: { query: sub.query, variables: sub.variables },
        });
        sub.onConnected?.();
      }
      return;
    }

    if (msg.type === "next" && typeof msg.id === "string") {
      const sub = conn.subscriptions.get(msg.id);
      if (!sub) return;
      const payload = msg.payload as { data?: unknown } | undefined;
      if (payload?.data) sub.onData(payload.data);
      return;
    }

    if (msg.type === "error") {
      if (typeof msg.id === "string") {
        conn.subscriptions.get(msg.id)?.onError?.(msg.payload);
      } else {
        for (const sub of conn.subscriptions.values()) sub.onError?.(msg.payload);
      }
      return;
    }

    if (msg.type === "complete" && typeof msg.id === "string") {
      conn.subscriptions.delete(msg.id);
      return;
    }

    if (msg.type === "ping") {
      send(ws, { type: "pong" });
      return;
    }
  };

  ws.onerror = (event) => {
    // In dev/StrictMode, effects can mount/unmount rapidly; don't surface errors if we are closing intentionally.
    if (conn.manualClose) return;
    for (const sub of conn.subscriptions.values()) sub.onError?.(event);
  };

  ws.onclose = () => {
    const shouldNotify = !conn.manualClose && conn.subscriptions.size > 0;
    if (shouldNotify) {
      for (const sub of conn.subscriptions.values()) {
        sub.onError?.(new Error("WebSocket closed"));
      }
    }
    conn.subscriptions.clear();
    sharedConnections.delete(conn.key);
  };

  return conn;
}

function scheduleMaybeClose(conn: SharedConnection) {
  if (conn.closeTimer) clearTimeout(conn.closeTimer);
  conn.closeTimer = setTimeout(() => {
    conn.closeTimer = null;
    if (conn.subscriptions.size !== 0) return;

    if (conn.ws.readyState === WebSocket.CONNECTING) {
      conn.closeWhenReady = true;
      return;
    }

    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.manualClose = true;
      conn.ws.close();
    }
  }, CLOSE_GRACE_MS);
}

export function graphqlSubscribe<TData>(options: SubscribeOptions<TData>): () => void {
  const conn = ensureConnection(options.connectionParams ?? {});

  if (conn.closeTimer) {
    clearTimeout(conn.closeTimer);
    conn.closeTimer = null;
  }
  conn.closeWhenReady = false;
  conn.manualClose = false;

  const id = String(conn.nextId++);
  const record: SubscriptionRecord = {
    id,
    query: options.query,
    variables: options.variables ?? {},
    onData: (data) => options.onData(data as TData),
    onError: options.onError,
    onConnected: options.onConnected,
  };
  conn.subscriptions.set(id, record);

  if (conn.didAck && conn.ws.readyState === WebSocket.OPEN) {
    send(conn.ws, {
      id,
      type: "subscribe",
      payload: { query: record.query, variables: record.variables },
    });
    record.onConnected?.();
  }

  return () => {
    conn.subscriptions.delete(id);

    try {
      if (conn.ws.readyState === WebSocket.OPEN) {
        send(conn.ws, { id, type: "complete" });
      }
    } finally {
      if (conn.subscriptions.size === 0) scheduleMaybeClose(conn);
    }
  };
}
