import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma.js";
import { chunkMarkdown, extractTitle } from "../src/services/ingestionService.js";
import { embeddingService } from "../src/services/embeddingService.js";
import { vectorStore } from "../src/services/vectorStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(__dirname, "..", "data", "kb");

async function main() {
  console.log("Clearing existing Qdrant collection...");
  await vectorStore.clearCollection();

  const files = (await readdir(KB_DIR)).filter((f) => f.endsWith(".md"));
  console.log(`Found ${files.length} knowledge base documents`);

  for (const file of files) {
    const fullPath = path.join(KB_DIR, file);
    const content = await readFile(fullPath, "utf-8");
    const title = extractTitle(content, file);
    const chunks = chunkMarkdown(content);

    console.log(`Embedding "${title}" (${chunks.length} chunks)...`);
    const vectors = await embeddingService.embedDocuments(chunks);

    await vectorStore.upsertChunks(
      chunks.map((text, i) => ({ text, source: file, title, chunkIndex: i })),
      vectors
    );

    const existing = await prisma.kbDocument.findFirst({ where: { sourcePath: file } });
    if (existing) {
      await prisma.kbDocument.update({
        where: { id: existing.id },
        data: { title, chunkCount: chunks.length },
      });
    } else {
      await prisma.kbDocument.create({
        data: { title, sourcePath: file, chunkCount: chunks.length },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
