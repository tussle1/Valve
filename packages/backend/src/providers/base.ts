import { fetch } from "undici";
import type {
  ProviderAdapter,
  ProviderConfig,
  ProviderType,
  ModelDefinition,
  ModelCapability,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ChatMessage,
  ToolDefinition,
} from "@valve/shared";
import { ChatCompletionRequestSchema, ChatMessageSchema, ToolDefinitionSchema } from "@valve/shared";

/**
 * Base provider adapter with common functionality.
 */

export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract readonly type: ProviderType;
  abstract readonly name: string;
  abstract readonly capabilities: ModelCapability[];
  
  protected abstract getBaseUrl(config: ProviderConfig): string;
  protected abstract getHeaders(config: ProviderConfig): Record<string, string>;
  protected abstract transformRequest(request: ChatCompletionRequest, model: ModelDefinition): unknown;
  protected abstract transformResponse(response: unknown, model: ModelDefinition): ChatCompletionResponse;
  protected abstract transformStreamChunk(chunk: unknown, model: ModelDefinition): ChatCompletionChunk;
  protected abstract getModelDefaults(modelId: string): Partial<ChatCompletionRequest>;
  
  async testConnection(config: ProviderConfig): Promise<{ success: boolean; error?: string; models?: string[]; latencyMs?: number }> {
    const start = Date.now();
    try {
      const baseUrl = this.getBaseUrl(config);
      const headers = this.getHeaders(config);
      
      // Try a simple models list request
      const response = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(config.timeoutMs || 30000),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}`, latencyMs: Date.now() - start };
      }
      
      const data = await response.json() as { data?: Array<{ id: string }> };
      const models = data.data?.map(m => m.id) || [];
      
      return { success: true, models, latencyMs: Date.now() - start };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), latencyMs: Date.now() - start };
    }
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
      
      const data = await response.json() as { data?: Array<{ id: string; owned_by?: string }> };
      return this.normalizeModels(data.data || [], config);
    } catch (error) {
      console.error(`[${this.name}] Model discovery failed:`, error);
      return [];
    }
  }
  
  protected abstract normalizeModels(models: Array<{ id: string; owned_by?: string }>, config: ProviderConfig): ModelDefinition[];
  
  async streamChat(request: ChatCompletionRequest, config: ProviderConfig): AsyncIterable<ChatCompletionChunk> {
    const baseUrl = this.getBaseUrl(config);
    const headers = this.getHeaders(config);
    const body = this.transformRequest(request, { id: request.model } as ModelDefinition);
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal: AbortSignal.timeout(config.timeoutMs || 120000),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    if (!response.body) {
      throw new Error("No response body");
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const chunk = this.transformStreamChunk(json, { id: request.model } as ModelDefinition);
              yield chunk;
            } catch (e) {
              // Ignore parse errors for malformed chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  async chat(request: ChatCompletionRequest, config: ProviderConfig): Promise<ChatCompletionResponse> {
    const baseUrl = this.getBaseUrl(config);
    const headers = this.getHeaders(config);
    const body = this.transformRequest(request, { id: request.model } as ModelDefinition);
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
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
  
  validateRequest(request: ChatCompletionRequest, model: ModelDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!request.model) errors.push("Model is required");
    if (!request.messages || request.messages.length === 0) errors.push("At least one message is required");
    
    // Check capabilities
    if (request.tools && request.tools.length > 0 && !model.tools) {
      errors.push("Model does not support tool calling");
    }
    
    if (request.responseFormat?.type === "json_schema" && !model.structuredOutput) {
      errors.push("Model does not support structured output");
    }
    
    // Check context window
    if (model.contextWindow && request.maxTokens && request.maxTokens > model.contextWindow) {
      errors.push(`Max tokens (${request.maxTokens}) exceeds model context window (${model.contextWindow})`);
    }
    
    // Validate messages
    for (let i = 0; i < request.messages.length; i++) {
      const msg = request.messages[i];
      if (!msg.role) {
        errors.push(`Message ${i}: role is required`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  protected createBaseModelDefinition(
    providerModelId: string,
    provider: ProviderType,
    displayName: string,
    family: ModelDefinition["family"],
    overrides: Partial<ModelDefinition> = {}
  ): ModelDefinition {
    const baseCapabilities: ModelCapability[] = ["chat", "streaming"];
    
    return {
      id: `${provider}:${providerModelId}`,
      provider,
      providerModelId,
      displayName,
      family,
      capabilities: baseCapabilities,
      contextWindow: null,
      maxOutputTokens: null,
      pricing: null,
      streaming: true,
      tools: false,
      images: false,
      audioInput: false,
      audioOutput: false,
      structuredOutput: false,
      reasoning: false,
      executionEnvironment: "cloud",
      status: "available",
      aliases: [],
      tags: [],
      description: null,
      releaseDate: null,
      deprecatedDate: null,
      metadata: {},
      ...overrides,
    };
  }
}

/**
 * Utility functions for provider adapters
 */
export function parseSSEStream(response: Response): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      if (!response.body) return;
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            
            if (trimmed.startsWith("data: ")) {
              try {
                yield JSON.parse(trimmed.slice(6));
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}

export function createErrorChunk(error: string, model: string): ChatCompletionChunk {
  return {
    id: `error-${Date.now()}`,
    model,
    created: Math.floor(Date.now() / 1000),
    choices: [{
      index: 0,
      delta: { role: "assistant", content: null },
      finishReason: "error",
    }],
  };
}