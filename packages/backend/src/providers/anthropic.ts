import type { ProviderConfig, ModelDefinition, ModelCapability, ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk, ProviderType } from "@valve/shared";
import { BaseProviderAdapter, parseSSEStream } from "./base.js";

/**
 * Anthropic Provider Adapter
 * Supports Anthropic API (Claude models)
 */

interface AnthropicModel {
  id: string;
  display_name: string;
  type: string;
  created_at: string;
}

interface AnthropicChatResponse {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: Array<{
    type: "text" | "tool_use";
    text?: string;
    id?: string;
    name?: string;
    input?: unknown;
  }>;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicChatChunk {
  type: "message_start" | "content_block_start" | "content_block_delta" | "content_block_stop" | "message_delta" | "message_stop";
  message?: AnthropicChatResponse;
  index?: number;
  delta?: {
    type: "text_delta" | "tool_use_delta";
    text?: string;
    partial_json?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

const ANTHROPIC_MODEL_CAPABILITIES: Record<string, ModelCapability[]> = {
  "claude-3-5-sonnet-20241022": ["chat", "streaming", "tools", "images", "structured-output", "vision"],
  "claude-3-5-haiku-20241022": ["chat", "streaming", "tools", "images", "structured-output", "vision"],
  "claude-3-opus-20240229": ["chat", "streaming", "tools", "images", "structured-output", "vision"],
  "claude-3-sonnet-20240229": ["chat", "streaming", "tools", "images", "structured-output", "vision"],
  "claude-3-haiku-20240307": ["chat", "streaming", "tools", "images", "structured-output", "vision"],
  "claude-2.1": ["chat", "streaming", "tools", "structured-output"],
  "claude-2.0": ["chat", "streaming", "tools", "structured-output"],
  "claude-instant-1.2": ["chat", "streaming", "tools"],
};

const ANTHROPIC_MODEL_INFO: Record<string, Partial<ModelDefinition>> = {
  "claude-3-5-sonnet-20241022": { contextWindow: 200000, maxOutputTokens: 8192, family: "claude", pricing: { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015, currency: "USD", isEstimated: false } },
  "claude-3-5-haiku-20241022": { contextWindow: 200000, maxOutputTokens: 8192, family: "claude", pricing: { inputPer1kTokens: 0.001, outputPer1kTokens: 0.005, currency: "USD", isEstimated: false } },
  "claude-3-opus-20240229": { contextWindow: 200000, maxOutputTokens: 4096, family: "claude", pricing: { inputPer1kTokens: 0.015, outputPer1kTokens: 0.075, currency: "USD", isEstimated: false } },
  "claude-3-sonnet-20240229": { contextWindow: 200000, maxOutputTokens: 4096, family: "claude", pricing: { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015, currency: "USD", isEstimated: false } },
  "claude-3-haiku-20240307": { contextWindow: 200000, maxOutputTokens: 4096, family: "claude", pricing: { inputPer1kTokens: 0.00025, outputPer1kTokens: 0.00125, currency: "USD", isEstimated: false } },
  "claude-2.1": { contextWindow: 200000, maxOutputTokens: 4096, family: "claude", pricing: { inputPer1kTokens: 0.008, outputPer1kTokens: 0.024, currency: "USD", isEstimated: false } },
  "claude-2.0": { contextWindow: 100000, maxOutputTokens: 4096, family: "claude", pricing: { inputPer1kTokens: 0.008, outputPer1kTokens: 0.024, currency: "USD", isEstimated: false } },
  "claude-instant-1.2": { contextWindow: 100000, maxOutputTokens: 4096, family: "claude", pricing: { inputPer1kTokens: 0.0008, outputPer1kTokens: 0.0024, currency: "USD", isEstimated: false } },
};

export class AnthropicAdapter extends BaseProviderAdapter {
  readonly type: ProviderType = "anthropic";
  readonly name = "Anthropic";
  readonly capabilities: ModelCapability[] = ["chat", "streaming", "tools", "images", "structured-output", "vision"];
  
  protected getBaseUrl(config: ProviderConfig): string {
    return config.baseUrl || "https://api.anthropic.com/v1";
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      "x-api-key": config.apiKeyRef || "",
      "anthropic-version": "2023-06-01",
      ...config.customHeaders,
    };
  }
  
  protected transformRequest(request: ChatCompletionRequest, model: ModelDefinition): unknown {
    // Convert OpenAI format to Anthropic format
    const systemMessages = request.messages.filter(m => m.role === "system");
    const userMessages = request.messages.filter(m => m.role !== "system");
    
    const anthropicMessages = userMessages.map(msg => {
      if (msg.role === "tool") {
        return {
          role: "user",
          content: [{
            type: "tool_result",
            tool_use_id: msg.toolCallId,
            content: msg.content || "",
          }],
        };
      }
      
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        return {
          role: "assistant",
          content: msg.toolCalls.map(tc => ({
            type: "tool_use",
            id: (tc as any).id,
            name: (tc as any).function?.name,
            input: JSON.parse((tc as any).function?.arguments || "{}"),
          })),
        };
      }
      
      return {
        role: msg.role === "assistant" ? "assistant" : "user",
        content: typeof msg.content === "string" ? msg.content : msg.content?.[0]?.text || "",
      };
    });
    
    return {
      model: request.model,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP,
      system: systemMessages.map(m => m.content).join("\n\n"),
      messages: anthropicMessages,
      tools: request.tools?.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      })),
      tool_choice: request.toolChoice === "auto" ? { type: "auto" } : request.toolChoice === "none" ? { type: "none" } : request.toolChoice ? { type: "tool", name: request.toolChoice } : undefined,
      stream: request.stream,
    };
  }
  
  protected transformResponse(response: unknown, model: ModelDefinition): ChatCompletionResponse {
    const data = response as AnthropicChatResponse;
    
    const toolCalls = data.content
      .filter(c => c.type === "tool_use")
      .map(c => ({
        id: c.id!,
        type: "function" as const,
        function: { name: c.name!, arguments: JSON.stringify(c.input) },
      }));
    
    const textContent = data.content
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("");
    
    return {
      id: data.id,
      model: data.model,
      created: Math.floor(Date.now() / 1000),
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: textContent || null,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finishReason: data.stop_reason === "tool_use" ? "tool_calls" : data.stop_reason,
      }],
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      providerMetadata: {},
    };
  }
  
  protected transformStreamChunk(chunk: unknown, model: ModelDefinition): ChatCompletionChunk {
    const data = chunk as AnthropicChatChunk;
    
    if (data.type === "message_start") {
      return {
        id: data.message?.id || `msg-${Date.now()}`,
        model: data.message?.model || model.id,
        created: Math.floor(Date.now() / 1000),
        choices: [{
          index: 0,
          delta: { role: "assistant", content: "" },
          finishReason: null,
        }],
      };
    }
    
    if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
      return {
        id: `chunk-${Date.now()}`,
        model: model.id,
        created: Math.floor(Date.now() / 1000),
        choices: [{
          index: data.index || 0,
          delta: { content: data.delta.text },
          finishReason: null,
        }],
      };
    }
    
    if (data.type === "content_block_delta" && data.delta?.type === "tool_use_delta") {
      return {
        id: `chunk-${Date.now()}`,
        model: model.id,
        created: Math.floor(Date.now() / 1000),
        choices: [{
          index: data.index || 0,
          delta: { toolCalls: [{ index: data.index || 0, function: { arguments: data.delta.partial_json } }] },
          finishReason: null,
        }],
      };
    }
    
    if (data.type === "message_delta") {
      return {
        id: `chunk-${Date.now()}`,
        model: model.id,
        created: Math.floor(Date.now() / 1000),
        choices: [{
          index: 0,
          delta: {},
          finishReason: data.message?.stop_reason === "tool_use" ? "tool_calls" : data.message?.stop_reason,
        }],
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        } : undefined,
      };
    }
    
    // Return empty chunk for other types
    return {
      id: `chunk-${Date.now()}`,
      model: model.id,
      created: Math.floor(Date.now() / 1000),
      choices: [{ index: 0, delta: {}, finishReason: null }],
    };
  }
  
  protected getModelDefaults(modelId: string): Partial<ChatCompletionRequest> {
    return { temperature: 0.7, maxTokens: 4096 };
  }
  
  protected normalizeModels(models: AnthropicModel[], config: ProviderConfig): ModelDefinition[] {
    return models
      .filter(m => m.type === "model")
      .map(m => {
        const info = ANTHROPIC_MODEL_INFO[m.id] || {};
        const capabilities = ANTHROPIC_MODEL_CAPABILITIES[m.id] || ["chat", "streaming"];
        
        return this.createBaseModelDefinition(
          m.id,
          this.type,
          m.display_name || m.id,
          info.family || "claude",
          {
            capabilities,
            contextWindow: info.contextWindow || null,
            maxOutputTokens: info.maxOutputTokens || null,
            pricing: info.pricing || null,
            tools: capabilities.includes("tools"),
            images: capabilities.includes("images"),
            structuredOutput: capabilities.includes("structured-output"),
            vision: capabilities.includes("vision"),
            metadata: { createdAt: m.created_at },
          }
        );
      });
  }
  
  async discoverModels(config: ProviderConfig): Promise<ModelDefinition[]> {
    // Anthropic doesn't have a public models endpoint, return known models
    const knownModels = Object.keys(ANTHROPIC_MODEL_INFO).map(id => ({
      id,
      display_name: id,
      type: "model",
      created_at: new Date().toISOString(),
    }));
    return this.normalizeModels(knownModels, config);
  }
}

/**
 * Anthropic-compatible adapter (for proxies like LiteLLM, etc.)
 */
export class AnthropicCompatibleAdapter extends AnthropicAdapter {
  readonly type = "anthropic-compatible" as ProviderType;
  readonly name = "Anthropic Compatible";
  
  protected getBaseUrl(config: ProviderConfig): string {
    if (!config.baseUrl) {
      throw new Error("Anthropic-compatible provider requires baseUrl");
    }
    return config.baseUrl.replace(/\/+$/, "");
  }
}