import { NextResponse } from "next/server";
import OpenAI from "openai";
import { countTokens } from "gpt-tokenizer";
import { oneLine, stripIndent } from "common-tags";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3, // Add retry logic for better reliability
});

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function POST(req: Request) {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new NextResponse("ok", { headers: corsHeaders });
  }

  try {
    // Search query is passed in request payload
    const { query } = await req.json();

    // OpenAI recommends replacing newlines with spaces for best results
    const input = query.replace(/\n/g, " ");

    console.log("Search query:", input);

    // Generate a one-time embedding for the query itself
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small", // Updated to latest embedding model
      input,
      encoding_format: "float",
    });

    const [{ embedding }] = embeddingResponse.data;
    console.log("Generated embedding length:", embedding.length);

    // First, let's check if we have any documents at all
    const { data: allDocs, error: countError } = await supabaseClient
      .from("documents")
      .select("id, content")
      .limit(1);

    console.log("Sample document check:", { allDocs, countError });

    // Try a direct similarity query
    const { data: directMatches, error: directError } =
      await supabaseClient.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.1, // Lower threshold to catch more matches
        match_count: 10,
      });

    console.log("Direct similarity query:", {
      matches: directMatches,
      error: directError,
      threshold: 0.1,
      queryLength: embedding.length,
    });

    // If direct query fails, try a raw SQL query to debug
    if (!directMatches || directMatches.length === 0) {
      // First, let's check the actual embedding in the database
      const { data: embeddingCheck, error: embeddingError } = await supabaseClient
        .from("documents")
        .select("id, content, embedding")
        .limit(1);

      console.log("Embedding check:", {
        hasEmbedding: embeddingCheck?.[0]?.embedding ? true : false,
        embeddingLength: embeddingCheck?.[0]?.embedding?.length,
        error: embeddingError,
      });

      // Then try a raw similarity query
      const { data: rawMatches, error: rawError } = await supabaseClient
        .from("documents")
        .select("id, content")
        .limit(10);

      console.log("Raw document query:", {
        matches: rawMatches,
        error: rawError,
      });
    }

    let tokenCount = 0;
    let contextText = "";

    // Concat matched documents
    if (directMatches && directMatches.length > 0) {
      for (let i = 0; i < directMatches.length; i++) {
        const document = directMatches[i];
        // Use the content field from the document
        const content = document.content;
        const tokens = countTokens(content);

        // Limit context to max 1500 tokens (configurable)
        if (tokenCount + tokens > 1500) {
          break;
        }

        tokenCount += tokens;
        contextText += `${content.trim()}\n---\n`;
      }
    }

    console.log("Context text:", contextText);

    // If no documents found, return a helpful message
    if (!contextText) {
      return NextResponse.json(
        {
          id: "no-results",
          text: "I couldn't find any relevant information about that. Could you try rephrasing your question or asking about something else?",
        },
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prompt = stripIndent`${oneLine`
      You are a helpful shopping assistant. Given the following product information,
      answer the question using only that information. If you are unsure and the answer
      is not explicitly written in the product information, say
      "Sorry, I don't have enough information about that."`}

      Product information:
      ${contextText}

      Question: """
      ${query}
      """

      Answer as markdown (including related code snippets if available):
    `;

    const completionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Updated to latest chat model
      messages: [
        {
          role: "system",
          content:
            "You are a helpful shopping assistant that provides accurate and concise answers based on the given product information.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 512,
      temperature: 0,
    });

    const {
      id,
      choices: [{ message }],
    } = completionResponse;

    return NextResponse.json(
      { id, text: message.content },
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
