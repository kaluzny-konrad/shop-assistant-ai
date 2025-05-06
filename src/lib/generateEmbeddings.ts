import openai from "openai";
import { createClient } from "@/lib/supabase";
import getDocuments from "@/lib/getDocuments";

async function generateEmbeddings() {
  const openAi = new openai({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = await createClient();

  const documents = getDocuments();

  for (const document of documents) {
    const input = document.replace(/\n/g, " ");

    const embeddingResponse = await openAi.embeddings.create({
      model: "text-embedding-ada-002",
      input,
    });

    const [{ embedding }] = embeddingResponse.data;

    await supabase.from("documents").insert({
      content: document,
      embedding,
    });
  }
}

export { generateEmbeddings };
