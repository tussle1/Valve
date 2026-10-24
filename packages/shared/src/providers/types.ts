import { z } from "zod";

/**
 * Core provider types for the Universal AI Model Support system.
 * These types define the capability-aware provider abstraction layer.
 */

export const ProviderTypeSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "xai",
  "deepseek",
  "mistral",
  "meta",
  "azure",
  "bedrock",
  "github-models",
  "huggingface",
  "openrouter",
  "together",
  "fireworks",
  "groq",
  "cerebras",
  "nvidia",
  "cohere",
  "perplexity",
  "ollama",
  "lmstudio",
  "vllm",
  "llamacpp",
  "openai-compatible",
  "anthropic-compatible",
  "custom",
]);

export type ProviderType = z.infer<typeof ProviderTypeSchema>;

export const ModelCapabilitySchema = z.enum([
  "chat",
  "completion",
  "streaming",
  "tools",
  "images",
  "audio-input",
  "audio-output",
  "structured-output",
  "reasoning",
  "vision",
  "embeddings",
  "fine-tuning",
]);

export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;

export const ModelFamilySchema = z.enum([
  "gpt",
  "claude",
  "gemini",
  "grok",
  "deepseek",
  "mistral",
  "llama",
  "qwen",
  "phi",
  "command",
  "cohere",
  "nemotron",
  "yi",
  "zephyr",
  "openchat",
  "starcoder",
  "codellama",
  "wizardcoder",
  "phind",
  "other",
]);

export type ModelFamily = z.infer<typeof ModelFamilySchema>;

export const ExecutionEnvironmentSchema = z.enum(["cloud", "local", "hybrid"]);
export type ExecutionEnvironment = z.infer<typeof ExecutionEnvironmentSchema>;

export const ModelStatusSchema = z.enum(["available", "deprecated", "unavailable", "unknown"]);
export type ModelStatus = z.infer<typeof ModelStatusSchema>;

/**
 * Model pricing information (may be estimated or provider-reported)
 */
export const ModelPricingSchema = z.object({
  inputPer1kTokens: z.number().nullable(),
  outputPer1kTokens: z.number().nullable(),
  cachedInputPer1kTokens: z.number().nullable(),
  currency: z.string().default("USD"),
  lastUpdated: z.string().datetime().nullable(),
  isEstimated: z.boolean().default(true),
});

export type ModelPricing = z.infer<typeof ModelPricingSchema>;

/**
 * Complete model definition in the universal registry
 */
export const ModelDefinitionSchema = z.object({
  id: z.string(),
  provider: ProviderTypeSchema,
  providerModelId: z.string(),
  displayName: z.string(),
  family: ModelFamilySchema,
  capabilities: z.array(ModelCapabilitySchema),
  contextWindow: z.number().int().positive().nullable(),
  maxOutputTokens: z.number().int().positive().nullable(),
  pricing: ModelPricingSchema.nullable(),
  streaming: z.boolean(),
  tools: z.boolean(),
  images: z.boolean(),
  audioInput: z.boolean(),
  audioOutput: z.boolean(),
  structuredOutput: z.boolean(),
  reasoning: z.boolean(),
  executionEnvironment: ExecutionEnvironmentSchema,
  status: ModelStatusSchema,
  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  description: z.string().nullable(),
  releaseDate: z.string().datetime().nullable(),
  deprecatedDate: z.string().datetime().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;

/**
 * Provider connection configuration
 */
export const ProviderConfigSchema = z.object({
  id: z.string(),
  type: ProviderTypeSchema,
  name: z.string(),
  enabled: z.boolean().default(true),
  apiKeyRef: z.string().optional(), // Reference to secure credential storage
  baseUrl: z.string().url().optional(),
  organizationId: z.string().optional(),
  projectId: z.string().optional(),
  customHeaders: z.record(z.string()).default({}),
  timeoutMs: z.number().int().positive().default(120000),
  retryPolicy: z.object({
    maxRetries: z.number().int().min(0).default(3),
    baseDelayMs: z.number().int().positive().default(1000),
    maxDelayMs: z.number().int().positive().default(30000),
    retryableStatusCodes: z.array(z.number().int()).default([429, 500, 502, 503, 504]),
  }).default({}),
  rateLimits: z.object({
    requestsPerMinute: z.number().int().positive().optional(),
    tokensPerMinute: z.number().int().positive().optional(),
  }).optional(),
  models: z.array(z.string()).default([]), // Override model list
  metadata: z.record(z.unknown()).default({}),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Provider connection status
 */
export const ProviderStatusSchema = z.enum(["connected", "disconnected", "error", "testing", "unconfigured"]);
export type ProviderStatus = z.infer<typeof ProviderStatusSchema>;

export const ProviderConnectionInfoSchema = z.object({
  configId: z.string(),
  status: ProviderStatusSchema,
  lastTested: z.string().datetime().nullable(),
  error: z.string().nullable(),
  availableModels: z.array(z.string()).default([]),
  latencyMs: z.number().nullable(),
});

export type ProviderConnectionInfo = z.infer<typeof ProviderConnectionInfoSchema>;

/**
 * Normalized message format for cross-provider compatibility
 */
export const ChatRoleSchema = z.enum(["system", "user", "assistant", "tool"]);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.union([z.string(), z.array(z.unknown())]).nullable(),
  name: z.string().optional(),
  toolCalls: z.array(z.unknown()).optional(),
  toolCallId: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ToolDefinitionSchema = z.object({
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.unknown()),
  }),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  stream: z.boolean().default(false),
  tools: z.array(ToolDefinitionSchema).optional(),
  toolChoice: z.union([z.literal("auto"), z.literal("none"), z.string()]).optional(),
  responseFormat: z.object({ type: z.enum(["text", "json_object", "json_schema"]) }).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  logitBias: z.record(z.number()).optional(),
  user: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

export const ChatCompletionChunkSchema = z.object({
  id: z.string(),
  model: z.string(),
  created: z.number().int(),
  choices: z.array(z.object({
    index: z.number().int(),
    delta: z.object({
      role: ChatRoleSchema.optional(),
      content: z.string().nullable().optional(),
      toolCalls: z.array(z.unknown()).optional(),
    }),
    finishReason: z.enum(["stop", "length", "tool_calls", "content_filter", "error"]).nullable(),
  })),
  usage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
    cachedTokens: z.number().int().optional(),
  }).optional(),
});

export type ChatCompletionChunk = z.infer<typeof ChatCompletionChunkSchema>;

export const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  created: z.number().int(),
  choices: z.array(z.object({
    index: z.number().int(),
    message: ChatMessageSchema,
    finishReason: z.enum(["stop", "length", "tool_calls", "content_filter", "error"]),
  })),
  usage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
    cachedTokens: z.number().int().optional(),
  }).optional(),
  providerMetadata: z.record(z.unknown()).default({}),
});

export type ChatCompletionResponse = z.infer<typeof ChatCompletionResponseSchema>;

/**
 * Provider adapter interface - all providers must implement this
 */
export interface ProviderAdapter {
  readonly type: ProviderType;
  readonly name: string;
  readonly capabilities: ModelCapability[];
  
  /** Test connectivity and validate credentials */
  testConnection(config: ProviderConfig): Promise<{ success: boolean; error?: string; models?: string[]; latencyMs?: number }>;
  
  /** Discover available models from the provider */
  discoverModels(config: ProviderConfig): Promise<ModelDefinition[]>;
  
  /** Send a chat completion request (streaming) */
  streamChat(request: ChatCompletionRequest, config: ProviderConfig): AsyncIterable<ChatCompletionChunk>;
  
  /** Send a chat completion request (non-streaming) */
  chat(request: ChatCompletionRequest, config: ProviderConfig): Promise<ChatCompletionResponse>;
  
  /** Get model-specific default parameters */
  getModelDefaults(modelId: string): Partial<ChatCompletionRequest>;
  
  /** Validate request against model capabilities */
  validateRequest(request: ChatCompletionRequest, model: ModelDefinition): { valid: boolean; errors: string[] };
  
  /** Transform normalized request to provider-specific format */
  transformRequest(request: ChatCompletionRequest, model: ModelDefinition): unknown;
  
  /** Transform provider-specific response to normalized format */
  transformResponse(response: unknown, model: ModelDefinition): ChatCompletionResponse;
  
  /** Transform provider-specific stream chunk to normalized format */
  transformStreamChunk(chunk: unknown, model: ModelDefinition): ChatCompletionChunk;
}

/**
 * Provider registry for managing multiple providers
 */
export interface ProviderRegistry {
  register(adapter: ProviderAdapter): void;
  unregister(type: ProviderType): void;
  get(type: ProviderType): ProviderAdapter | undefined;
  getAll(): ProviderAdapter[];
  getByCapability(capability: ModelCapability): ProviderAdapter[];
}

/**
 * Model registry for managing the universal model catalog
 */
export interface ModelRegistry {
  register(model: ModelDefinition): void;
  unregister(id: string): void;
  get(id: string): ModelDefinition | undefined;
  getAll(): ModelDefinition[];
  getByProvider(provider: ProviderType): ModelDefinition[];
  getByCapability(capability: ModelCapability): ModelDefinition[];
  search(query: string): ModelDefinition[];
  filter(filters: ModelFilter): ModelDefinition[];
  refreshFromProvider(providerType: ProviderType, models: ModelDefinition[]): void;
}

export const ModelFilterSchema = z.object({
  providers: z.array(ProviderTypeSchema).optional(),
  capabilities: z.array(ModelCapabilitySchema).optional(),
  families: z.array(ModelFamilySchema).optional(),
  executionEnvironments: z.array(ExecutionEnvironmentSchema).optional(),
  statuses: z.array(ModelStatusSchema).optional(),
  minContextWindow: z.number().int().positive().optional(),
  maxContextWindow: z.number().int().positive().optional(),
  maxPricePer1kInput: z.number().optional(),
  maxPricePer1kOutput: z.number().optional(),
  tags: z.array(z.string()).optional(),
  favoritesOnly: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export type ModelFilter = z.infer<typeof ModelFilterSchema>;