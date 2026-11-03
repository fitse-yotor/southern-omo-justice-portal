// Minimal Ollama client (works with Ollama Cloud at https://ollama.com and with a
// self-hosted Ollama server, e.g. on a server inside Ethiopia: same /api/chat format).
import 'server-only';

export type OllamaConfig = { host: string; apiKey?: string; model: string };

export function ollamaConfig(): OllamaConfig | null {
  const host = (process.env.OLLAMA_HOST || 'https://ollama.com').replace(/\/+$/, '');
  const apiKey = process.env.OLLAMA_API_KEY || undefined;
  const model = process.env.OLLAMA_MODEL || 'gpt-oss:120b';
  // Ollama Cloud needs a key; a self-hosted server may not.
  if (host.includes('ollama.com') && !apiKey) return null;
  return { host, apiKey, model };
}

export class OllamaError extends Error {
  constructor(message: string, public status: number, public kind: 'rate_limit' | 'auth' | 'model' | 'timeout' | 'upstream') { super(message); }
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function ollamaChat(cfg: OllamaConfig, messages: ChatMessage[], opts: { maxTokens?: number; timeoutMs?: number } = {}) {
  let res: Response;
  try {
    res = await fetch(`${cfg.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
      body: JSON.stringify({ model: cfg.model, messages, stream: false, options: { temperature: 0.2, num_predict: opts.maxTokens ?? 900 } }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 55_000),
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw new OllamaError('The AI service took too long to answer.', 504, 'timeout');
    throw new OllamaError('Could not reach the AI service.', 502, 'upstream');
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    if (res.status === 429) throw new OllamaError('The free AI usage limit is reached for now. Please try again later.', 429, 'rate_limit');
    if (res.status === 401 || res.status === 403) throw new OllamaError('The AI service rejected the API key.', 502, 'auth');
    if (res.status === 404) throw new OllamaError(`AI model "${cfg.model}" was not found. ${detail}`, 502, 'model');
    throw new OllamaError(`AI service error ${res.status}. ${detail}`, 502, 'upstream');
  }
  const json = await res.json() as { message?: { content?: string }; model?: string; prompt_eval_count?: number; eval_count?: number; total_duration?: number };
  const content = (json.message?.content || '').trim();
  if (!content) throw new OllamaError('The AI service returned an empty answer.', 502, 'upstream');
  return { content, model: json.model || cfg.model, inputTokens: json.prompt_eval_count, outputTokens: json.eval_count, ms: json.total_duration ? Math.round(json.total_duration / 1e6) : undefined };
}

export async function ollamaListModels(cfg: OllamaConfig) {
  const res = await fetch(`${cfg.host}/api/tags`, { headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}, signal: AbortSignal.timeout(15_000), cache: 'no-store' });
  if (!res.ok) throw new OllamaError(`Could not list models (${res.status}).`, 502, res.status === 401 ? 'auth' : 'upstream');
  const json = await res.json() as { models?: { name?: string; model?: string }[] };
  return (json.models || []).map(m => m.name || m.model || '').filter(Boolean);
}
