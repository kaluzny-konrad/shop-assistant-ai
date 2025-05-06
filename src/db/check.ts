import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function checkDocuments() {
  try {
    // Get all documents
    const { data: documents, error } = await supabaseClient
      .from("documents")
      .select("*");

    if (error) {
      console.error("Error fetching documents:", error);
      return;
    }

    console.log("Number of documents:", documents?.length || 0);
    console.log("Sample document:", documents?.[0]);
  } catch (error) {
    console.error("Error:", error);
  }
}

checkDocuments();
