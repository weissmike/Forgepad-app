import { GoogleGenAI } from "@google/genai";
import { AIProvider, storage } from "./storage";

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolInvocationEvent {
  provider: AIProvider;
  name: string;
  args: Record<string, unknown>;
}

export interface ProviderSwitchEvent {
  from: AIProvider;
  to: AIProvider;
  reason: string;
}

export type ErrorClass = 'timeout' | 'auth' | 'rate_limit' | 'network' | 'provider' | 'unknown';

export interface ProviderHealthEvent {
  provider: AIProvider;
  health: 'healthy' | 'degraded' | 'error' | 'unconfigured';
  detail?: string;
}

export type ProviderRuntimeEvent =
  | { type: 'provider_switch'; from: AIProvider; to: AIProvider; reason: string }
  | { type: 'provider_health'; provider: AIProvider; health: 'healthy' | 'degraded' | 'error' | 'unconfigured'; detail?: string };

export interface StructuredParser<T> {
  parse: (raw: string) => T;
  validate?: (value: T) => boolean;
}

export interface SendMessageOptions<T = unknown> {
  provider?: AIProvider;
  systemPrompt?: string;
  timeoutMs?: number;
  enableFallback?: boolean;
  onToken?: (token: string) => void;
  onToolInvocation?: (event: ToolInvocationEvent) => void;
  onProviderSwitch?: (event: ProviderSwitchEvent) => void;
  onProviderEvent?: (event: string) => void;
  onProviderHealth?: (event: ProviderHealthEvent) => void;
  structured?: StructuredParser<T>;
}

export interface SendMessageResult<T = unknown> {
  text: string;
  provider: AIProvider;
  structured?: T;
  fallbackUsed: boolean;
}

interface ProviderAdapter {
  provider: AIProvider;
  complete: (messages: Message[], options: SendMessageOptions) => Promise<string>;
}

interface ClassifiedError extends Error {
  classification: ErrorClass;
}

const PROVIDER_ORDER: AIProvider[] = ['gemini', 'openai', 'anthropic'];
const DEFAULT_TIMEOUT_MS = 20_000;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, provider: AIProvider): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new Error(`${provider} request timed out after ${timeoutMs}ms`) as ClassifiedError;
      timeoutError.classification = 'timeout';
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

const classifyError = (provider: AIProvider, error: unknown): ClassifiedError => {
  if (error && typeof error === 'object' && 'classification' in error) {
    return error as ClassifiedError;
  }

  const err = error instanceof Error ? error : new Error(`${provider} request failed`);
  const message = err.message.toLowerCase();
  const classified = err as ClassifiedError;

  if (message.includes('missing') || message.includes('invalid key') || message.includes('unauthorized') || message.includes('401')) {
    classified.classification = 'auth';
  } else if (message.includes('timeout')) {
    classified.classification = 'timeout';
  } else if (message.includes('429') || message.includes('rate')) {
    classified.classification = 'rate_limit';
  } else if (message.includes('network') || message.includes('fetch')) {
    classified.classification = 'network';
  } else if (message.includes('provider')) {
    classified.classification = 'provider';
  } else {
    classified.classification = 'unknown';
  }

  return classified;
};

class GeminiAdapter implements ProviderAdapter {
  provider: AIProvider = 'gemini';

  async complete(messages: Message[], options: SendMessageOptions): Promise<string> {
    const envKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;

    const invoke = async (apiKey: string) => {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      });

      const text = response.text ?? '';
      text.split(/(\s+)/).forEach((token) => token && options.onToken?.(token));
      return text;
    };

    if (envKey) {
      return invoke(envKey);
    }

    return storage.withProviderApiKey('gemini', invoke);
  }
}

class OpenAIAdapter implements ProviderAdapter {
  provider: AIProvider = 'openai';

  async complete(messages: Message[], options: SendMessageOptions): Promise<string> {
    return storage.withProviderApiKey('openai', async (key) => {
      if (!key) throw new Error('OpenAI API Key missing');
      const latest = messages[messages.length - 1]?.content ?? '';
      const text = `OpenAI adapter response: ${latest || 'ForgePad is ready to build.'}`;
      options.onToken?.(text);
      options.onToolInvocation?.({
        provider: 'openai',
        name: 'code_search',
        args: { query: latest.slice(0, 40) || 'workspace status' },
      });
      return text;
    });
  }
}

class AnthropicAdapter implements ProviderAdapter {
  provider: AIProvider = 'anthropic';

  async complete(messages: Message[], options: SendMessageOptions): Promise<string> {
    return storage.withProviderApiKey('anthropic', async (key) => {
      if (!key) throw new Error('Anthropic API Key missing');
      const latest = messages[messages.length - 1]?.content ?? '';
      const text = `Anthropic adapter response: ${latest || 'I can help with your code.'}`;
      options.onToken?.(text);
      options.onToolInvocation?.({
        provider: 'anthropic',
        name: 'reasoning_step',
        args: { messages: messages.length },
      });
      return text;
    });
  }
}

export class AIService {
  private static instance: AIService;
  private readonly adapters = new Map<AIProvider, ProviderAdapter>();
  private readonly runtimeListeners = new Set<(event: ProviderRuntimeEvent) => void>();

  private constructor() {
    [new GeminiAdapter(), new OpenAIAdapter(), new AnthropicAdapter()].forEach((adapter) => {
      this.adapters.set(adapter.provider, adapter);
    });
  }

  static getInstance() {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }



  subscribeRuntimeEvents(listener: (event: ProviderRuntimeEvent) => void) {
    this.runtimeListeners.add(listener);
    return () => this.runtimeListeners.delete(listener);
  }

  private emitRuntimeEvent(event: ProviderRuntimeEvent) {
    this.runtimeListeners.forEach((listener) => listener(event));
  }

  async sendMessage<T = unknown>(messages: Message[], options: SendMessageOptions<T> = {}): Promise<SendMessageResult<T>> {
    const prefs = storage.getPreferences();
    const selectedProvider = options.provider ?? prefs.defaultProvider;
    const fallbackEnabled = options.enableFallback ?? prefs.providerFallbackEnabled;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const mergedMessages = options.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt } as Message, ...messages]
      : messages;

    const configuredProviders = storage.getConfiguredProviders();
    const candidates = [
      selectedProvider,
      ...PROVIDER_ORDER.filter((provider) => provider !== selectedProvider),
    ].filter((provider, index, arr) => arr.indexOf(provider) === index);

    const healthyCandidates = candidates.filter((provider) => configuredProviders.includes(provider));
    const providersToTry = healthyCandidates.length > 0 ? healthyCandidates : candidates;

    let lastError: ClassifiedError | null = null;

    for (let i = 0; i < providersToTry.length; i += 1) {
      const provider = providersToTry[i];
      const adapter = this.adapters.get(provider);
      if (!adapter) continue;

      if (i > 0) {
        const previous = providersToTry[i - 1];
        const event = { from: previous, to: provider, reason: lastError?.classification ?? 'provider' };
        console.info('[AI fallback] provider switch', event);
        options.onProviderSwitch?.(event);
        options.onProviderEvent?.(`Switched from ${previous} to ${provider} (${event.reason}).`);
        this.emitRuntimeEvent({ type: 'provider_switch', ...event });
      }

      try {
        const text = await withTimeout(adapter.complete(mergedMessages, options), timeoutMs, provider);
        storage.saveProviderHealth(provider, 'healthy');
        options.onProviderHealth?.({ provider, health: 'healthy' });
        this.emitRuntimeEvent({ type: 'provider_health', provider, health: 'healthy' });
        const result: SendMessageResult<T> = {
          text,
          provider,
          fallbackUsed: i > 0,
        };

        if (options.structured) {
          const parsed = options.structured.parse(text);
          if (options.structured.validate && !options.structured.validate(parsed)) {
            throw new Error('Structured output validation failed');
          }
          result.structured = parsed;
        }

        return result;
      } catch (error) {
        lastError = classifyError(provider, error);
        const health = lastError.classification === 'auth' ? 'unconfigured' : 'error';
        storage.saveProviderHealth(provider, health);
        options.onProviderHealth?.({ provider, health, detail: lastError.message });
        this.emitRuntimeEvent({ type: 'provider_health', provider, health, detail: lastError.message });
        const canFallback = fallbackEnabled && i < providersToTry.length - 1;
        if (!canFallback) {
          throw lastError;
        }
      }
    }

    throw lastError ?? new Error('No providers available');
  }

  async validateKey(provider: AIProvider, key: string): Promise<boolean> {
    if (!key) return false;
    if (provider === 'gemini') {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({
          model: "gemini-2.0-flash-exp",
          contents: "hi",
        });
        return true;
      } catch {
        return false;
      }
    }
    return key.length > 20;
  }
}
