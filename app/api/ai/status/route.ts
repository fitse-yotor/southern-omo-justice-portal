import { NextResponse } from 'next/server';
import { ollamaConfig, ollamaListModels } from '@/lib/ai/ollama';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tells the UI whether AI summaries are switched on. Never returns the key.
// ?check=1 also verifies the key and model with the provider.
export async function GET(req: Request) {
  const cfg = ollamaConfig();
  if (!cfg) return NextResponse.json({ enabled: false });
  const base = { enabled: true, model: cfg.model, provider: cfg.host.includes('ollama.com') ? 'Ollama Cloud' : 'Self-hosted Ollama' };
  if (!new URL(req.url).searchParams.get('check')) return NextResponse.json(base);
  try {
    const models = await ollamaListModels(cfg);
    return NextResponse.json({ ...base, reachable: true, modelAvailable: models.length ? models.some(m => m === cfg.model || m.startsWith(cfg.model + ':')) : null, models: models.slice(0, 40) });
  } catch (e) {
    return NextResponse.json({ ...base, reachable: false, error: e instanceof Error ? e.message : 'unknown' }, { status: 502 });
  }
}
