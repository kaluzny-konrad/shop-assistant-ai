import { NextResponse } from "next/server";
import { generateEmbeddings } from "@/lib/generateEmbeddings";

export async function POST() {
  try {
    await generateEmbeddings();
    return NextResponse.json({
      success: true,
      message: "Embeddings generated successfully",
    });
  } catch (error) {
    console.error("Error generating embeddings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}
