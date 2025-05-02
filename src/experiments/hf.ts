import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function isHelpRequest(content: string): Promise<boolean> {
  const result = await hf.request({
    method: 'POST',
    url: 'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
    body: {
      inputs: content,
      parameters: {
        candidate_labels: ["question", "statement", "request"]
      }
    }
  });

  if (!result || typeof result !== 'object' || !('labels' in result)) {
    throw new Error('Invalid response from HuggingFace API');
  }

  const labels = result.labels as string[];

  if (!labels || labels.length === 0) {
    return false;
  }

  return labels[0] === "question";
}