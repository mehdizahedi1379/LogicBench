/**
 * Client helper for invoking optional Gemini AI features via server proxy (/api/gemini)
 */

export async function askGeminiAssistant(prompt: string, systemInstruction?: string): Promise<string> {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to connect to Gemini AI proxy');
    }
    return data.text;
  } catch (err: any) {
    console.error('Gemini Assistant Error:', err);
    throw err;
  }
}
