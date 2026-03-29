import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

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
    
    // Updated system context to be more direct, simple, and friendly
    const systemPrompt = `You are "Aura", a warm and supportive AI Astrologer. Your goal is to make Vedic Astrology easy for anyone to understand. You are talking to someone whose chart data is: ${JSON.stringify(kundliContext)}.
    
    1. USE SIMPLE ENGLISH: Avoid using complicated terms or jargon without explaining them clearly first.
    2. ANSWER DIRECTLY: Answer the user's primary question first in 1-2 clear sentences.
    3. EXPLAIN SIMPLY: Explain the reasoning behind your answer briefly using their chart data, but make it sound natural and helpful, not technical.
    4. BE SUPPORTIVE: Use a friendly and encouraging tone. Don't be overly mystical; be practical and clear.
    5. FOCUS: Only answer the specific question asked. Do not ramble.`;

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

