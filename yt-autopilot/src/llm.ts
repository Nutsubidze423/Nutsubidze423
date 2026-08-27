import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.ts';
import { recordLlm, assertUnderCeiling, type CostEntry } from './cost.ts';

let client: Anthropic | null = null;
function get(): Anthropic {
  client ??= new Anthropic({ apiKey: config.anthropicKey() });
  return client;
}

export const MODEL = 'claude-sonnet-5';

/** Ask for JSON and parse it. Retries once on malformed output, feeding the
 *  parse error back — cheaper and more reliable than a stricter prompt. */
export async function askJson<T>(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
  stage: CostEntry['stage'];
  validate: (raw: unknown) => T;
}): Promise<T> {
  assertUnderCeiling();
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: opts.prompt }];

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await get().messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      messages,
    });
    recordLlm(opts.stage, res.usage.input_tokens, res.usage.output_tokens);

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    try {
      // Tolerate fenced output without demanding the model avoid it.
      const json = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      return opts.validate(JSON.parse(json));
    } catch (err) {
      if (attempt === 1) throw new Error(`Model returned unusable JSON: ${String(err)}\n\n${text.slice(0, 800)}`);
      messages.push({ role: 'assistant', content: text });
      messages.push({ role: 'user', content: `That failed to parse: ${String(err)}. Return only the JSON object.` });
    }
  }
  throw new Error('unreachable');
}

export async function askText(
  system: string,
  prompt: string,
  stage: CostEntry['stage'],
  maxTokens = 2048,
): Promise<string> {
  assertUnderCeiling();
  const res = await get().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  recordLlm(stage, res.usage.input_tokens, res.usage.output_tokens);
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
}
