import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, kundliContext } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Reject nicely if API Key is not configured yet
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === '') {
      const errorStream = new ReadableStream({
        async start(controller) {
          controller.enqueue(new TextEncoder().encode("It seems my connection to the cosmic intelligence (Gemini API) is severed. Please save your valid GEMINI_API_KEY inside the .env.local file to restore my vision."));
          controller.close();
        }
      });
      return new Response(errorStream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Updated system context to be more direct and concise
    const systemPrompt = `You are "Aura", a highly direct and precise AI Astrologer. You are communicating with a user whose calculated exact astrological data (Kundli) is: ${JSON.stringify(kundliContext)}.
    
CRITICAL CONSTRAINTS:
1. Answer ONLY the specific question asked. Do not volunteer extra information or generic personality traits unless explicitly requested.
2. For timing questions (e.g., "When will I get..."), provide a specific timeline or estimation based on the intensity and placement of the relevant planets in their houses.
3. Every answer MUST be grounded in their chart. Explicitly state the planetary reason (e.g., "Based on your 10th house Mars placement...").
4. Be brief, mystical, and accurate. Do not ramble.`;

    // Structure history for Gemini
    const pastChatHistory = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Start a chat session using the newest @google/genai syntax
    const responseStream = await ai.models.generateContentStream({
       model: 'gemini-2.5-flash',
       contents: pastChatHistory,
       config: { systemInstruction: systemPrompt }
    });
    
    // Stream response dynamically
    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of responseStream) {
                if (chunk.text) {
                    controller.enqueue(new TextEncoder().encode(chunk.text));
                }
            }
            controller.close();
        }
    });

    return new Response(stream, { 
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (err: any) {
    console.error('Gemini Chat API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

