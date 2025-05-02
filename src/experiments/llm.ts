import axios from "axios";

/**
 * Ask the LLM running on Ollama using a context and a question.
 */
export async function askLLM(
  context: string,
  question: string
): Promise<string> {
  const systemPrompt = `
You are an assistant helping based only on the provided context. Do no allucinate. 
If you don't know the answer, say: "I'm sorry, I don't have enough information to answer."
Do not invent information. Not more than two paragraphs. Not more than 5 sentences.
Use only the context to answer. Be concise.
Context:
${context}
`.trim();

  console.log("\n===== CONTEXT SENT TO LLM =====\n");
  console.log(context);
  console.log("\n================================\n");

  const response = await axios.post("http://localhost:11434/api/chat", {
    model: process.env.REPLY_LLM_MODEL || "llama3",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    stream: false,
  });

  console.log("LLM response:", response.data);

  if (
    response.data.message.content.includes(
      "I'm sorry, I don't have enough information to answer."
    )
  ) {
    return "";
  } else {
    return response.data.message.content;
  }
}

export async function isHelpRequest(text: string): Promise<boolean> {
  const response = await axios.post("http://localhost:11434/api/chat", {
    model: "mistral",
    messages: [
      {
        role: "system",
        content: `
You are a strict classifier.
If the following user message is a question or a request for help, answer ONLY with "YES".
If it is not a question or help request, answer ONLY with "NO".
NO explanation. NO additional text. Answer exactly YES or NO.
`,
      },
      {
        role: "user",
        content: text,
      },
    ],
    options: {
      temperature: 0,
      top_p: 0.1,
      repeat_penalty: 1.2,
    },
    stream: false,
  });

  const raw = response.data.message.content.trim().toUpperCase();
  const firstWord = raw.split(/\s+/)[0];

  return firstWord === "YES";
}
