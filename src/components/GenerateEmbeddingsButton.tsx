"use client";

import { useState } from "react";
import { handleGenerateEmbeddings } from "../app/actions";

export default function GenerateEmbeddingsButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await handleGenerateEmbeddings();
    setIsLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      className="bg-blue-500 text-white p-2 rounded-md"
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
      ) : (
        "Generate Embeddings"
      )}
    </button>
  );
}
