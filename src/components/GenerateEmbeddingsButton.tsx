"use client";

import { handleGenerateEmbeddings } from "../app/actions";

export default function GenerateEmbeddingsButton() {
  return (
    <button
      onClick={handleGenerateEmbeddings}
      className="bg-blue-500 text-white p-2 rounded-md"
    >
      Generate Embeddings
    </button>
  );
}
