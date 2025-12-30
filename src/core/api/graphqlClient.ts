type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export function getGraphQLHttpUrl(): string {
  return (
    process.env.NEXT_PUBLIC_CHESS_HTTP_URL ?? "http://localhost:3001/graphql"
  );
}

export async function graphqlRequest<TData>(
  query: string,
  variables?: Record<string, unknown>
): Promise<TData> {
  const res = await fetch(getGraphQLHttpUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}`);
  }

  const json = (await res.json()) as GraphQLResponse<TData>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("\n"));
  }
  if (!json.data) {
    throw new Error("GraphQL response missing data");
  }
  return json.data;
}

