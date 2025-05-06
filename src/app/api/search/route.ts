import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import GPT3Tokenizer from 'gpt3-tokenizer'
import { oneLine, stripIndent } from 'common-tags'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseClient = createClient(supabaseUrl, supabaseKey)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function POST(req: Request) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse('ok', { headers: corsHeaders })
  }

  try {
    // Search query is passed in request payload
    const { query } = await req.json()

    // OpenAI recommends replacing newlines with spaces for best results
    const input = query.replace(/\n/g, ' ')

    // Generate a one-time embedding for the query itself
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input,
    })

    const [{ embedding }] = embeddingResponse.data

    // Fetching whole documents for this simple example.
    const { data: documents } = await supabaseClient.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.78, // Choose an appropriate threshold for your data
      match_count: 10, // Choose the number of matches
    })

    const tokenizer = new GPT3Tokenizer({ type: 'gpt3' })
    let tokenCount = 0
    let contextText = ''

    // Concat matched documents
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i]
      const content = document.content
      const encoded = tokenizer.encode(content)
      tokenCount += encoded.text.length

      // Limit context to max 1500 tokens (configurable)
      if (tokenCount > 1500) {
        break
      }

      contextText += `${content.trim()}\n---\n`
    }

    const prompt = stripIndent`${oneLine`
      You are a very enthusiastic Supabase representative who loves
      to help people! Given the following sections from the Supabase
      documentation, answer the question using only that information,
      outputted in markdown format. If you are unsure and the answer
      is not explicitly written in the documentation, say
      "Sorry, I don't know how to help with that."`}

      Context sections:
      ${contextText}

      Question: """
      ${query}
      """

      Answer as markdown (including related code snippets if available):
    `

    const completionResponse = await openai.completions.create({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 512, // Choose the max allowed tokens in completion
      temperature: 0, // Set to 0 for deterministic results
    })

    const {
      id,
      choices: [{ text }],
    } = completionResponse

    return NextResponse.json({ id, text }, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
