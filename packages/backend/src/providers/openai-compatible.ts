import type { ProviderConfig, ModelDefinition, ModelCapability, ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk, ProviderType } from "@valve/shared";
import { BaseProviderAdapter, parseSSEStream } from "./base.js";

/**
 * Generic OpenAI-Compatible Provider Adapter
 * Works with any API that follows the OpenAI chat completions format
 * (Ollama, LM Studio, vLLM, llama.cpp, Groq, Together, Fireworks, etc.)
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

export class OpenAICompatibleAdapter extends BaseProviderAdapter {
  readonly type: ProviderType = "openai-compatible";
  readonly name = "OpenAI Compatible";
  readonly capabilities: ModelCapability[] = ["chat", "streaming", "tools", "images", "structured-output", "vision", "audio-input", "audio-output", "reasoning"];
  
  protected getBaseUrl(config: ProviderConfig): string {
    if (!config.baseUrl) {
      throw new Error("OpenAI-compatible provider requires baseUrl");
    }
    // Ensure /v1 suffix if not present
    const url = config.baseUrl.replace(/\/+$/, "");
    return url.endsWith("/v1") ? url : `${url}/v1`;
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...config.customHeaders,
    };
    
    // Add auth if provided
    if (config.apiKeyRef) {
      headers["Authorization"] = `Bearer ${config.apiKeyRef}`;
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
    return { temperature: 0.7 };
  }
  
  protected normalizeModels(models: OpenAIModel[], config: ProviderConfig): ModelDefinition[] {
    return models
      .filter(m => !m.id.includes("embedding") && !m.id.includes("moderation") && !m.id.includes("whisper") && !m.id.includes("tts") && !m.id.includes("dall-e"))
      .map(m => {
        // Try to infer capabilities from model name
        const id = m.id.toLowerCase();
        const capabilities: ModelCapability[] = ["chat", "streaming"];
        
        if (id.includes("gpt-4") || id.includes("claude") || id.includes("gemini") || id.includes("mistral") || id.includes("llama-3") || id.includes("nemotron")) {
          capabilities.push("tools", "structured-output");
        }
        if (id.includes("vision") || id.includes("gpt-4o") || id.includes("claude-3") || id.includes("gemini") || id.includes("llava")) {
          capabilities.push("images", "vision");
        }
        if (id.includes("realtime") || id.includes("audio")) {
          capabilities.push("audio-input", "audio-output");
        }
        if (id.includes("o1") || id.includes("reasoning")) {
          capabilities.push("reasoning");
        }
        
        return this.createBaseModelDefinition(
          m.id,
          this.type,
          m.id,
          "other",
          {
            capabilities,
            tools: capabilities.includes("tools"),
            images: capabilities.includes("images"),
            vision: capabilities.includes("vision"),
            audioInput: capabilities.includes("audio-input"),
            audioOutput: capabilities.includes("audio-output"),
            structuredOutput: capabilities.includes("structured-output"),
            reasoning: capabilities.includes("reasoning"),
            executionEnvironment: config.baseUrl?.includes("localhost") || config.baseUrl?.includes("127.0.0.1") ? "local" : "cloud",
            metadata: { ownedBy: m.owned_by },
          }
        );
      });
  }
}

/**
 * Ollama Adapter - Specialized for Ollama's API
 */
export class OllamaAdapter extends OpenAICompatibleAdapter {
  readonly type = "ollama" as ProviderType;
  readonly name = "Ollama";
  
  protected getBaseUrl(config: ProviderConfig): string {
    const url = config.baseUrl || "http://localhost:11434";
    return url.replace(/\/+$/, "");
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    // Ollama doesn't require auth by default
    return {
      "Content-Type": "application/json",
      ...config.customHeaders,
    };
  }
  
  protected normalizeModels(models: OpenAIModel[], config: ProviderConfig): ModelDefinition[] {
    return models.map(m => {
      const id = m.id.toLowerCase();
      const capabilities: ModelCapability[] = ["chat", "streaming"];
      
      // Check for tool support (newer Ollama versions)
      if (id.includes("llama3.1") || id.includes("llama3.2") || id.includes("nemotron") || id.includes("qwen2.5") || id.includes("mistral") || id.includes("phi3")) {
        capabilities.push("tools", "structured-output");
      }
      if (id.includes("llava") || id.includes("vision") || id.includes("bakllava")) {
        capabilities.push("images", "vision");
      }
      
      return this.createBaseModelDefinition(
        m.id,
        this.type,
        m.id,
        "other",
        {
          capabilities,
          tools: capabilities.includes("tools"),
          images: capabilities.includes("images"),
          vision: capabilities.includes("vision"),
          structuredOutput: capabilities.includes("structured-output"),
          executionEnvironment: "local",
          metadata: { ownedBy: m.owned_by },
        }
      );
    });
  }
  
  async discoverModels(config: ProviderConfig): Promise<ModelDefinition[]> {
    try {
      const baseUrl = this.getBaseUrl(config);
      const headers = this.getHeaders(config);
      
      // Ollama uses /api/tags not /v1/models
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(config.timeoutMs || 30000),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to discover models: ${response.statusText}`);
      }
      
      const data = await response.json() as { models: Array<{ name: string; size: number; digest: string; details: { family: string; parameter_size: string; quantization_level: string } }> };
      const ollamaModels = data.models?.map(m => ({
        id: m.name,
        object: "model",
        created: Date.now(),
        owned_by: "ollama",
      })) || [];
      
      return this.normalizeModels(ollamaModels, config);
    } catch (error) {
      console.error(`[${this.name}] Model discovery failed:`, error);
      return [];
    }
  }
}

/**
 * LM Studio Adapter
 */
export class LMStudioAdapter extends OpenAICompatibleAdapter {
  readonly type = "lmstudio" as ProviderType;
  readonly name = "LM Studio";
  
  protected getBaseUrl(config: ProviderConfig): string {
    const url = config.baseUrl || "http://localhost:1234";
    return url.replace(/\/+$/, "");
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...config.customHeaders,
    };
  }
  
  protected normalizeModels(models: OpenAIModel[], config: ProviderConfig): ModelDefinition[] {
    return models.map(m => {
      return this.createBaseModelDefinition(
        m.id,
        this.type,
        m.id,
        "other",
        {
          capabilities: ["chat", "streaming", "tools", "structured-output"],
          tools: true,
          structuredOutput: true,
          executionEnvironment: "local",
          metadata: { ownedBy: m.owned_by },
        }
      );
    });
  }
}

/**
 * Groq Adapter
 */
export class GroqAdapter extends OpenAICompatibleAdapter {
  readonly type = "groq" as ProviderType;
  readonly name = "Groq";
  
  protected getBaseUrl(config: ProviderConfig): string {
    return config.baseUrl || "https://api.groq.com/openai/v1";
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      "Authorization": `Bearer ${config.apiKeyRef}`,
      "Content-Type": "application/json",
      ...config.customHeaders,
    };
  }
  
  protected normalizeModels(models: OpenAIModel[], config: ProviderConfig): ModelDefinition[] {
    return models.map(m => {
      const id = m.id.toLowerCase();
      const capabilities: ModelCapability[] = ["chat", "streaming", "tools", "structured-output"];
      
      return this.createBaseModelDefinition(
        m.id,
        this.type,
        m.id,
        "other",
        {
          capabilities,
          tools: true,
          structuredOutput: true,
          executionEnvironment: "cloud",
          metadata: { ownedBy: m.owned_by, provider: "groq" },
        }
      );
    });
  }
}

/**
 * Together AI Adapter
 */
export class TogetherAdapter extends OpenAICompatibleAdapter {
  readonly type = "together" as ProviderType;
  readonly name = "Together AI";
  
  protected getBaseUrl(config: ProviderConfig): string {
    return config.baseUrl || "https://api.together.xyz/v1";
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      "Authorization": `Bearer ${config.apiKeyRef}`,
      "Content-Type": "application/json",
      ...config.customHeaders,
    };
  }
}

/**
 * Fireworks AI Adapter
 */
export class FireworksAdapter extends OpenAICompatibleAdapter {
  readonly type = "fireworks" as ProviderType;
  readonly name = "Fireworks AI";
  
  protected getBaseUrl(config: ProviderConfig): string {
    return config.baseUrl || "https://api.fireworks.ai/inference/v1";
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      "Authorization": `Bearer ${config.apiKeyRef}`,
      "Content-Type": "application/json",
      ...config.customHeaders,
    };
  }
}

/**
 * DeepSeek Adapter
 */
export class DeepSeekAdapter extends OpenAICompatibleAdapter {
  readonly type = "deepseek" as ProviderType;
  readonly name = "DeepSeek";
  
  protected getBaseUrl(config: ProviderConfig): string {
    return config.baseUrl || "https://api.deepseek.com/v1";
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      "Authorization": `Bearer ${config.apiKeyRef}`,
      "Content-Type": "application/json",
      ...config.customHeaders,
    };
  }
}

/**
 * Mistral AI Adapter
 */
export class MistralAdapter extends OpenAICompatibleAdapter {
  readonly type = "mistral" as ProviderType;
  readonly name = "Mistral AI";
  
  protected getBaseUrl(config: ProviderConfig): string {
    return config.baseUrl || "https://api.mistral.ai/v1";
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      "Authorization": `Bearer ${config.apiKeyRef}`,
      "Content-Type": "application/json",
      ...config.customHeaders,
    };
  }
}

/**
 * xAI (Grok) Adapter
 */
export class XAIAdapter extends OpenAICompatibleAdapter {
  readonly type = "xai" as ProviderType;
  readonly name = "xAI";
  
  protected getBaseUrl(config: ProviderConfig): string {
    return config.baseUrl || "https://api.x.ai/v1";
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      "Authorization": `Bearer ${config.apiKeyRef}`,
      "Content-Type": "application/json",
      ...config.customHeaders,
    };
  }
}

/**
 * Google Gemini Adapter (via OpenAI-compatible endpoint)
 * Note: Native Gemini API is different, this is for OpenAI-compatible proxies
 */
export class GoogleAdapter extends BaseProviderAdapter {
  readonly type = "google" as ProviderType;
  readonly name = "Google Gemini";
  readonly capabilities: ModelCapability[] = ["chat", "streaming", "tools", "images", "structured-output", "vision", "audio-input"];
  
  protected getBaseUrl(config: ProviderConfig): string {
    return config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  }
  
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      "x-goog-api-key": config.apiKeyRef || "",
      "Content-Type": "application/json",
      ...config.customHeaders,
    };
  }
  
  protected transformRequest(request: ChatCompletionRequest, model: ModelDefinition): unknown {
    // Gemini uses a different format
    const systemInstruction = request.messages.find(m => m.role === "system")?.content;
    const contents = request.messages
      .filter(m => m.role !== "system")
      .map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: typeof msg.content === "string" ? msg.content : "" }],
      }));
    
    return {
      contents,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction as string }] } : undefined,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        topP: request.topP,
        maxOutputTokens: request.maxTokens,
        responseMimeType: request.responseFormat?.type === "json_object" ? "application/json" : undefined,
      },
      tools: request.tools?.map(t => ({
        functionDeclarations: [{
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        }],
      })),
    };
  }
  
  protected transformResponse(response: unknown, model: ModelDefinition): ChatCompletionResponse {
    const data = response as any;
    const candidate = data.candidates?.[0];
    
    const toolCalls = candidate?.content?.parts
      ?.filter((p: any) => p.functionCall)
      .map((p: any) => ({
        id: `call-${Date.now()}`,
        type: "function",
        function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args) },
      })) || [];
    
    const textContent = candidate?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join("") || "";
    
    return {
      id: data.id || `msg-${Date.now()}`,
      model: data.model || model.id,
      created: Math.floor(Date.now() / 1000),
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: textContent || null,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finishReason: candidate?.finishReason === "TOOL_CALL" ? "tool_calls" : "stop",
      }],
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      } : undefined,
      providerMetadata: {},
    };
  }
  
  protected transformStreamChunk(chunk: unknown, model: ModelDefinition): ChatCompletionChunk {
    const data = chunk as any;
    const candidate = data.candidates?.[0];
    
    if (candidate?.content?.parts?.[0]?.text) {
      return {
        id: `chunk-${Date.now()}`,
        model: model.id,
        created: Math.floor(Date.now() / 1000),
        choices: [{
          index: 0,
          delta: { content: candidate.content.parts[0].text },
          finishReason: null,
        }],
      };
    }
    
    return {
      id: `chunk-${Date.now()}`,
      model: model.id,
      created: Math.floor(Date.now() / 1000),
      choices: [{ index: 0, delta: {}, finishReason: null }],
    };
  }
  
  protected getModelDefaults(modelId: string): Partial<ChatCompletionRequest> {
    return { temperature: 0.7 };
  }
  
  protected normalizeModels(models: any[], config: ProviderConfig): ModelDefinition[] {
    // Gemini models endpoint returns different format
    return models.map((m: any) => this.createBaseModelDefinition(
      m.name?.replace("models/", "") || m.id,
      this.type,
      m.displayName || m.name || m.id,
      "gemini",
      {
        capabilities: ["chat", "streaming", "tools", "images", "structured-output", "vision"],
        tools: true,
        images: true,
        vision: true,
        structuredOutput: true,
        executionEnvironment: "cloud",
      }
    ));
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
      
      const data = await response.json();
      return this.normalizeModels(data.models || [], config);
    } catch (error) {
      console.error(`[${this.name}] Model discovery failed:`, error);
      // Return known models as fallback
      const knownModels = [
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-1.0-pro",
        "gemini-pro-vision",
      ].map(id => ({ name: `models/${id}`, displayName: id }));
      return this.normalizeModels(knownModels, config);
    }
  }
}