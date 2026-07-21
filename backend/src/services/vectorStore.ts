import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";

const client = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
});

const VECTOR_SIZE = 512; // voyage-3-lite output dimension

export type KbChunk = {
  text: string;
  source: string;
  title: string;
  chunkIndex: number;
};

export type RetrievedChunk = KbChunk & { score: number };

async function ensureCollection() {
  const collections = await client.getCollections();
  const exists = collections.collections.some((c) => c.name === env.QDRANT_COLLECTION);
  if (!exists) {
    await client.createCollection(env.QDRANT_COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
  }
}

export const vectorStore = {
  ensureCollection,

  upsertChunks: async (chunks: KbChunk[], vectors: number[][]) => {
    await ensureCollection();
    const points = chunks.map((chunk, i) => ({
      id: uuidv4(),
      vector: vectors[i],
      payload: { ...chunk },
    }));
    await client.upsert(env.QDRANT_COLLECTION, { wait: true, points });
  },

  search: async (queryVector: number[], topK: number): Promise<RetrievedChunk[]> => {
    await ensureCollection();
    const result = await client.search(env.QDRANT_COLLECTION, {
      vector: queryVector,
      limit: topK,
      with_payload: true,
    });
    return result.map((r) => ({
      ...(r.payload as KbChunk),
      score: r.score,
    }));
  },

  clearCollection: async () => {
    const collections = await client.getCollections();
    if (collections.collections.some((c) => c.name === env.QDRANT_COLLECTION)) {
      await client.deleteCollection(env.QDRANT_COLLECTION);
    }
    await ensureCollection();
  },
};
