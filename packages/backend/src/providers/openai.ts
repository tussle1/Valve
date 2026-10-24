import type { ProviderConfig, ModelDefinition, ModelCapability, ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk, ProviderType } from "@valve/shared";
import { BaseProviderAdapter, parseSSEStream } from "./base.js";

/**
 * OpenAI Provider Adapter
 * Supports OpenAI API and Azure OpenAI
 */

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIChatChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const OPENAI_MODEL_CAPABILITIES: Record<string, ModelCapability[]> = {
  "gpt-4o": ["chat", "streaming", "tools", "images", "structured-output", "vision"],
  "gpt-4o-mini": ["chat", "streaming", "tools", "images", "structured-output", "vision"],
  "gpt-4-turbo": ["chat", "streaming", "tools", "images", "structured-output", "vision"],
  "gpt-4": ["chat", "streaming", "tools", "structured-output"],
  "gpt-3.5-turbo": ["chat", "streaming", "tools", "structured-output"],
  "o1-preview": ["chat", "streaming", "reasoning", "structured-output"],
  "o1-mini": ["chat", "streaming", "reasoning", "structured-output"],
  "gpt-4o-realtime-preview": ["chat", "streaming", "tools", "images", "audio-input", "audio-output", "structured-output", "vision"],
};

const OPENAI_MODEL_INFO: Record<string, Partial<ModelDefinition>> = {
  "gpt-4o": { contextWindow: 128000, maxOutputTokens: 16384, family: "gpt", pricing: { inputPer1kTokens: 0.005, outputPer1kTokens: 0.015, currency: "USD", isEstimated: false } },
  "gpt-4o-mini": { contextWindow: 128000, maxOutputTokens: 16384, family: "gpt", pricing: { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006, currency: "USD", isEstimated: false } },
  "gpt-4-turbo": { contextWindow: 128000, maxOutputTokens: 4096, family: "gpt", pricing: { inputPer1kTokens: 0.01, outputPer1kTokens: 0.03, currency: "USD", isEstimated: false } },
  "gpt-4": { contextWindow: 8192, maxOutputTokens: 4096, family: "gpt", pricing: { inputPer1kTokens: 0.03, outputPer1kTokens: 0.06, currency: "USD", isEstimated: false } },
  "gpt-3.5-turbo": { contextWindow: 16385, maxOutputTokens: 4096, family: "gpt", pricing: { inputPer1kTokens: 0.0005, outputPer1kTokens: 0.0015, currency: "USD", isEstimated: false } },
  "o1-preview": { contextWindow: 128000, maxOutputTokens: 32768, family: "gpt", pricing: { inputPer1kTokens: 0.015, outputPer1kTokens: 0.06, currency: "USD", isEstimated: false } },
  "o1-mini": { contextWindow: 128000, maxOutputTokens: 65536, family: "gpt", pricing: { inputPer1kTokens: 0.003, outputPer1kTokens: 0.012, currency: "USD", isEstimated: false } },
};

export class OpenAIAdapter extends BaseProviderAdapter {
  readonly type: ProviderType = "openai";
  readonly name = "OpenAI";
  readonly capabilities: ModelCapability[] = ["chat", "streaming", "tools", "images", "structured-output", "vision", "audio-input", "audio-output", "reasoning"];
  
  protected getBaseUrl(config: ProviderConfig): string {
    return config.baseUrl || "https://api.openai.com/v1";
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${config.apiKeyRef}`,
      ...config.customHeaders,
    };
    
    if (config.organizationId) {
      headers["OpenAI-Organization"] = config.organizationId;
    }
    if (config.projectId) {
      headers["OpenAI-Project"] = config.projectId;
    }
    
    return headers;
  }
  
  protected transformRequest(request: ChatCompletionRequest, model: ModelDefinition): unknown {
    const { model: _, ...rest } = request;
    return rest;
  }
  
  protected transformResponse(response: unknown, model: ModelDefinition): ChatCompletionResponse {
    const data = response as OpenAIChatResponse;
    return {
      id: data.id,
      model: data.model,
      created: data.created,
      choices: data.choices.map((choice, index) => ({
        index,
        message: {
          role: choice.message.role as any,
          content: choice.message.content,
          toolCalls: choice.message.tool_calls?.map(tc => ({
            id: tc.id,
            type: "function",
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        },
        finishReason: choice.finish_reason as any,
      })),
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      providerMetadata: {},
    };
  }
  
  protected transformStreamChunk(chunk: unknown, model: ModelDefinition): ChatCompletionChunk {
    const data = chunk as OpenAIChatChunk;
    return {
      id: data.id,
      model: data.model,
      created: data.created,
      choices: data.choices.map(choice => ({
        index: choice.index,
        delta: {
          role: choice.delta.role as any,
          content: choice.delta.content ?? null,
          toolCalls: choice.delta.tool_calls?.map(tc => ({
            index: tc.index,
            id: tc.id,
            type: "function",
            function: { name: tc.function?.name, arguments: tc.function?.arguments },
          })),
        },
        finishReason: choice.finish_reason as any,
      })),
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }
  
  protected getModelDefaults(modelId: string): Partial<ChatCompletionRequest> {
    const defaults: Record<string, Partial<ChatCompletionRequest>> = {
      "o1-preview": { temperature: 1, maxTokens: 32768 },
      "o1-mini": { temperature: 1, maxTokens: 65536 },
    };
    return defaults[modelId] || { temperature: 0.7 };
  }
  
  protected normalizeModels(models: OpenAIModel[], config: ProviderConfig): ModelDefinition[] {
    return models
      .filter(m => !m.id.includes("embedding") && !m.id.includes("moderation") && !m.id.includes("whisper") && !m.id.includes("tts") && !m.id.includes("dall-e"))
      .map(m => {
        const info = OPENAI_MODEL_INFO[m.id] || {};
        const capabilities = OPENAI_MODEL_CAPABILITIES[m.id] || ["chat", "streaming"];
        
        return this.createBaseModelDefinition(
          m.id,
          this.type,
          m.id,
          info.family || "gpt",
          {
            capabilities,
            contextWindow: info.contextWindow || null,
            maxOutputTokens: info.maxOutputTokens || null,
            pricing: info.pricing || null,
            tools: capabilities.includes("tools"),
            images: capabilities.includes("images"),
            audioInput: capabilities.includes("audio-input"),
            audioOutput: capabilities.includes("audio-output"),
            structuredOutput: capabilities.includes("structured-output"),
            reasoning: capabilities.includes("reasoning"),
            vision: capabilities.includes("vision"),
            metadata: { ownedBy: m.owned_by },
          }
        );
      });
  }
  
  async discoverModels(config: ProviderConfig): Promise<ModelDefinition[]> {
    try {
      const baseUrl = this.getBaseUrl(config);
      const headers = this.getHeaders(config);
      
      const response = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(config.timeoutMs || 30000),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to discover models: ${response.statusText}`);
      }
      
      const data = await response.json() as { data: OpenAIModel[] };
      return this.normalizeModels(data.data, config);
    } catch (error) {
      console.error(`[${this.name}] Model discovery failed:`, error);
      return [];
    }
  }
}

/**
 * Azure OpenAI Adapter
 */
export class AzureOpenAIAdapter extends OpenAIAdapter {
  readonly type = "azure" as ProviderType;
  readonly name = "Azure OpenAI";
  
  protected getBaseUrl(config: ProviderConfig): string {
    if (!config.baseUrl) {
      throw new Error("Azure OpenAI requires baseUrl (e.g., https://your-resource.openai.azure.com)");
    }
    // Azure uses /openai/deployments/{deployment}/chat/completions?api-version=...
    // The baseUrl should be the resource endpoint
    return config.baseUrl.replace(/\/+$/, "");
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      "api-key": config.apiKeyRef || "",
      ...config.customHeaders,
    };
  }
  
  // Azure uses different URL structure for chat completions
  async streamChat(request: ChatCompletionRequest, config: ProviderConfig): AsyncIterable<ChatCompletionChunk> {
    const baseUrl = this.getBaseUrl(config);
    const headers = this.getHeaders(config);
    const deployment = request.model; // In Azure, model = deployment name
    const apiVersion = config.customHeaders["api-version"] || "2024-02-15-preview";
    const body = this.transformRequest(request, { id: request.model } as ModelDefinition);
    
    const url = `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", "Accept": "text/event-stream" },
      body: JSON.stringify({ ...body, stream: true }),
      signal: AbortSignal.timeout(config.timeoutMs || 120000),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    for await (const chunk of parseSSEStream(response)) {
      yield this.transformStreamChunk(chunk, { id: request.model } as ModelDefinition);
    }
  }
  
  async chat(request: ChatCompletionRequest, config: ProviderConfig): Promise<ChatCompletionResponse> {
    const baseUrl = this.getBaseUrl(config);
    const headers = this.getHeaders(config);
    const deployment = request.model;
    const apiVersion = config.customHeaders["api-version"] || "2024-02-15-preview";
    const body = this.transformRequest(request, { id: request.model } as ModelDefinition);
    
    const url = `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, stream: false }),
      signal: AbortSignal.timeout(config.timeoutMs || 120000),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return this.transformResponse(data, { id: request.model } as ModelDefinition);
  }
}