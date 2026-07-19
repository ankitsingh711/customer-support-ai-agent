import { env } from "../config/env.js";

const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";

type VoyageResponse = {
  data: { embedding: number[]; index: number }[];
};

async function embed(texts: string[], inputType: "query" | "document"): Promise<number[][]> {
  const res = await fetch(VOYAGE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: env.VOYAGE_MODEL,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embeddings request failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as VoyageResponse;
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export const embeddingService = {
  embedQuery: async (text: string): Promise<number[]> => {
    const [vector] = await embed([text], "query");
    return vector;
  },
  embedDocuments: async (texts: string[]): Promise<number[][]> => {
    return embed(texts, "document");
  },
};
