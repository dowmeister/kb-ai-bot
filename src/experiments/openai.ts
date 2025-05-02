import { OpenAI } from "openai";
import { configDotenv } from "dotenv";

configDotenv();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askLLM(
  context: string,
  question: string
): Promise<string> {
  const systemPrompt = `
You are an assistant helping based only on the provided context.
If you don't know the answer, say: "I'm sorry, I don't have enough information to answer."
Use only the context to answer. Do not invent information. Be concise, not more than two paragraphs.
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4", // or 'gpt-4' if you want
    messages: [
      { role: "system", content: systemPrompt + `\n\nContext:\n${context}` },
      { role: "user", content: question },
    ],
    temperature: 0.2,
  });

  return completion.choices[0].message.content || "";
}
