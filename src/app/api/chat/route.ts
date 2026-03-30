import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, kundliContext, mode, partnerKundli } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    let apiKeys: string[] = [];
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('GEMINI_API_KEY')) {
        const val = process.env[key];
        if (val && !val.includes('your_gemini_api_key_here')) {
          apiKeys.push(...val.split(',').map(k => k.trim()).filter(Boolean));
        }
      }
    }

    if (apiKeys.length === 0) {
      const errorStream = new ReadableStream({
        async start(controller) {
          controller.enqueue(new TextEncoder().encode("It seems my connection to the cosmic intelligence (Gemini API) is severed. Please save a valid GEMINI_API_KEY inside the .env.local file."));
          controller.close();
        }
      });
      return new Response(errorStream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    
    let systemPrompt = `You are "Aura", an expert Vedic Astrologer. You are analyzing someone whose chart data is: ${JSON.stringify(kundliContext)}.
1. STRICT TONE RULE: Give your answer in a straightforward, direct way. 
2. STRICT EFFICIENCY RULE: Do not answer more than what is strictly required. Stay entirely related to the specific question asked. DO NOT provide conversational filler, general philosophical statements, or unnecessary extra details.
`;

    switch (mode) {
      case 'daily':
        systemPrompt += `TASK: Provide Today's Short Forecast.
- Absolutely NO MORE than 3 or 4 short lines.
- Follow this exact format in a single paragraph:
  1. How they will feel today (Use **bold** for key emotions).
  2. What might happen to them today (Use **bold** for events).
  3. What they should do to avoid negative outcomes or maximize positive ones (Use *italics* for actions).
- DO NOT list morning/afternoon/night. Provide a completely straight, single paragraph.`;
        break;
      case 'timeline':
        systemPrompt += `TASK: Provide a Life Timeline Prediction.
- Generate a timeline of major life phases (age-wise).
- Include career, love, finance, and health insights for each phase.
- Highlight peak success periods and risk periods.
- Explicitly predict timing for key future events (job, marriage, financial gains) specifying favorable and unfavorable years/periods.`;
        break;
      case 'career':
        systemPrompt += `TASK: Provide Career & Finance Prediction.
- Suggest the absolute best career paths based on their dominant planets and 10th house.
- Predict job/business success timing.
- Identify major financial growth periods.`;
        break;
      case 'remedies':
        systemPrompt += `TASK: Provide Astrological Remedies.
- Suggest specific gemstones, mantras, and lifestyle changes to balance afflicted planetary placements.
- Keep the remedies practical, simple, and realistic for modern users.`;
        break;
      case 'decision':
        systemPrompt += `TASK: Act as a Decision Maker.
The user will ask a YES/NO question. You MUST:
- Give a clear YES or NO verdict with concise reasoning.
- Provide a definite statistical probability (e.g., "75% chance of success").
- Advise the best timing or ideal day for executing the action.`;
        break;
      case 'compatibility':
        systemPrompt += `TASK: Provide Love & Compatibility Analysis.
The user's prospective partner chart details are: ${JSON.stringify(partnerKundli)}.
- You must generate a precise Compatibility Score (out of 100%).
- Analyze emotional, physical, and long-term compatibility.
- Predict the relationship's future and identify any potential challenges.`;
        break;
      default:
        systemPrompt += `TASK: Answer the user's questions contextually as a real astrologer. Explain briefly using their chart data. Focus completely on the specific question asked. Do not ramble.`;
    }

    const pastChatHistory = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    let responseStream;
    let lastError;

    for (const key of apiKeys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        responseStream = await ai.models.generateContentStream({
           model: 'gemini-2.5-flash',
           contents: pastChatHistory,
           config: { systemInstruction: systemPrompt }
        });
        break; // Successfully connected, exit the retry loop
      } catch (err: any) {
        console.warn(`An API Key failed (Quota/Limit reached), trying the next one...`, err.message);
        lastError = err;
      }
    }

    if (!responseStream) {
       throw lastError || new Error("All provided API keys failed or exceeded quota.");
    }
    
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

