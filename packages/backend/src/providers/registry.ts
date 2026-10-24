import type {
  ProviderAdapter,
  ProviderType,
  ProviderConfig,
  ModelDefinition,
  ModelCapability,
  ModelFilter,
  ProviderConnectionInfo,
} from "@valve/shared";
import { jsonStorage } from "../db/json-storage.js";
import { v4 as uuidv4 } from "uuid";

// Import all adapters
import { OpenAIAdapter, AzureOpenAIAdapter } from "./openai.js";
import { AnthropicAdapter, AnthropicCompatibleAdapter } from "./anthropic.js";
import {
  OpenAICompatibleAdapter,
  OllamaAdapter,
  LMStudioAdapter,
  GroqAdapter,
  TogetherAdapter,
  FireworksAdapter,
  DeepSeekAdapter,
  MistralAdapter,
  XAIAdapter,
  GoogleAdapter,
} from "./openai-compatible.js";

/**
 * Provider Registry - Central management of all AI providers
 */

class ProviderRegistryImpl {
  private adapters = new Map<ProviderType, ProviderAdapter>();
  private initialized = false;
  
  constructor() {
    this.registerBuiltinAdapters();
  }
  
  private registerBuiltinAdapters() {
    // OpenAI family
    this.register(new OpenAIAdapter());
    this.register(new AzureOpenAIAdapter());
    
    // Anthropic family
    this.register(new AnthropicAdapter());
    this.register(new AnthropicCompatibleAdapter());
    
    // OpenAI-compatible family
    this.register(new OpenAICompatibleAdapter());
    this.register(new OllamaAdapter());
    this.register(new LMStudioAdapter());
    this.register(new GroqAdapter());
    this.register(new TogetherAdapter());
    this.register(new FireworksAdapter());
    this.register(new DeepSeekAdapter());
    this.register(new MistralAdapter());
    this.register(new XAIAdapter());
    
    // Google
    this.register(new GoogleAdapter());
    
    this.initialized = true;
  }
  
  register(adapter: ProviderAdapter): void {
    if (this.adapters.has(adapter.type)) {
      console.warn(`[ProviderRegistry] Overwriting existing adapter for ${adapter.type}`);
    }
    this.adapters.set(adapter.type, adapter);
    console.log(`[ProviderRegistry] Registered ${adapter.name} (${adapter.type})`);
  }
  
  unregister(type: ProviderType): void {
    this.adapters.delete(type);
  }
  
  get(type: ProviderType): ProviderAdapter | undefined {
    return this.adapters.get(type);
  }
  
  getAll(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }
  
  getByCapability(capability: ModelCapability): ProviderAdapter[] {
    return this.getAll().filter(a => a.capabilities.includes(capability));
  }
  
  getSupportedTypes(): ProviderType[] {
    return Array.from(this.adapters.keys());
  }
  
  async testProvider(config: ProviderConfig): Promise<ProviderConnectionInfo> {
    const adapter = this.get(config.type);
    if (!adapter) {
      return {
        configId: config.id,
        status: "error",
        lastTested: new Date().toISOString(),
        error: `Unknown provider type: ${config.type}`,
        availableModels: [],
        latencyMs: null,
      };
    }
    
    try {
      const result = await adapter.testConnection(config);
      return {
        configId: config.id,
        status: result.success ? "connected" : "error",
        lastTested: new Date().toISOString(),
        error: result.error || null,
        availableModels: result.models || [],
        latencyMs: result.latencyMs || null,
      };
    } catch (error) {
      return {
        configId: config.id,
        status: "error",
        lastTested: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        availableModels: [],
        latencyMs: null,
      };
    }
  }
  
  async discoverModels(config: ProviderConfig): Promise<ModelDefinition[]> {
    const adapter = this.get(config.type);
    if (!adapter) {
      throw new Error(`Unknown provider type: ${config.type}`);
    }
    
    const discovered = await adapter.discoverModels(config);
    
    // Merge with configured model overrides
    if (config.models && config.models.length > 0) {
      const configuredIds = new Set(config.models);
      return discovered.filter(m => configuredIds.has(m.providerModelId));
    }
    
    return discovered;
  }
  
  async refreshModelsFromProvider(config: ProviderConfig): Promise<ModelDefinition[]> {
    const discovered = await this.discoverModels(config);
    
    // Upsert into JSON storage
    for (const model of discovered) {
      jsonStorage.upsertModel(model as any);
    }
    
    return discovered;
  }
}

// Model Registry Implementation
class ModelRegistryImpl {
  private modelCache = new Map<string, ModelDefinition>();
  private lastRefresh = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  async register(model: ModelDefinition): Promise<void> {
    this.modelCache.set(model.id, model);
    jsonStorage.upsertModel(model as any);
  }
  
  unregister(id: string): void {
    this.modelCache.delete(id);
  }
  
  get(id: string): ModelDefinition | undefined {
    return this.modelCache.get(id);
  }
  
  async getAll(): Promise<ModelDefinition[]> {
    await this.ensureLoaded();
    return Array.from(this.modelCache.values());
  }
  
  async getByProvider(provider: ProviderType): Promise<ModelDefinition[]> {
    await this.ensureLoaded();
    return Array.from(this.modelCache.values()).filter(m => m.provider === provider);
  }
  
  async getByCapability(capability: ModelCapability): Promise<ModelDefinition[]> {
    await this.ensureLoaded();
    return Array.from(this.modelCache.values()).filter(m => m.capabilities.includes(capability));
  }
  
  async search(query: string): Promise<ModelDefinition[]> {
    await this.ensureLoaded();
    const lower = query.toLowerCase();
    return Array.from(this.modelCache.values()).filter(m => 
      m.displayName.toLowerCase().includes(lower) ||
      m.providerModelId.toLowerCase().includes(lower) ||
      m.id.toLowerCase().includes(lower) ||
      m.aliases.some(a => a.toLowerCase().includes(lower))
    );
  }
  
  async filter(filters: ModelFilter): Promise<ModelDefinition[]> {
    await this.ensureLoaded();
    let results = Array.from(this.modelCache.values());
    
    if (filters.providers?.length) {
      results = results.filter(m => filters.providers!.includes(m.provider));
    }
    if (filters.capabilities?.length) {
      results = results.filter(m => filters.capabilities!.every(c => m.capabilities.includes(c)));
    }
    if (filters.families?.length) {
      results = results.filter(m => filters.families!.includes(m.family));
    }
    if (filters.executionEnvironments?.length) {
      results = results.filter(m => filters.executionEnvironments!.includes(m.executionEnvironment));
    }
    if (filters.statuses?.length) {
      results = results.filter(m => filters.statuses!.includes(m.status));
    }
    if (filters.minContextWindow) {
      results = results.filter(m => m.contextWindow && m.contextWindow >= filters.minContextWindow!);
    }
    if (filters.maxContextWindow) {
      results = results.filter(m => m.contextWindow && m.contextWindow <= filters.maxContextWindow!);
    }
    if (filters.maxPricePer1kInput) {
      results = results.filter(m => m.pricing && m.pricing.inputPer1kTokens !== null && m.pricing.inputPer1kTokens! <= filters.maxPricePer1kInput!);
    }
    if (filters.maxPricePer1kOutput) {
      results = results.filter(m => m.pricing && m.pricing.outputPer1kTokens !== null && m.pricing.outputPer1kTokens! <= filters.maxPricePer1kOutput!);
    }
    if (filters.tags?.length) {
      results = results.filter(m => filters.tags!.some(t => m.tags.includes(t)));
    }
    if (filters.favoritesOnly) {
      results = results.filter(m => m.aliases.includes("favorite"));
    }
    if (filters.hidden === false) {
      results = results.filter(m => m.status !== "hidden");
    }
    
    return results;
  }
  
  async refreshFromProvider(providerType: ProviderType, providerModels: ModelDefinition[]): Promise<void> {
    for (const model of providerModels) {
      this.modelCache.set(model.id, model);
    }
    this.lastRefresh = Date.now();
  }
  
  private async ensureLoaded(): Promise<void> {
    if (this.modelCache.size > 0 && Date.now() - this.lastRefresh < this.CACHE_TTL) {
      return;
    }
    
    const dbModels = jsonStorage.getModels();
    this.modelCache.clear();
    for (const m of dbModels) {
      this.modelCache.set(m.id, {
        id: m.id,
        provider: m.provider as ProviderType,
        providerModelId: m.providerModelId,
        displayName: m.displayName,
        family: m.family as any,
        capabilities: m.capabilities as ModelCapability[],
        contextWindow: m.contextWindow,
        maxOutputTokens: m.maxOutputTokens,
        pricing: m.pricing as any,
        streaming: m.streaming,
        tools: m.tools,
        images: m.images,
        audioInput: m.audioInput,
        audioOutput: m.audioOutput,
        structuredOutput: m.structuredOutput,
        reasoning: m.reasoning,
        executionEnvironment: m.executionEnvironment as any,
        status: m.status as any,
        aliases: m.aliases,
        tags: m.tags,
        description: m.description,
        releaseDate: m.releaseDate,
        deprecatedDate: m.deprecatedDate,
        metadata: m.metadata as Record<string, unknown>,
      });
    }
    this.lastRefresh = Date.now();
  }
}

// Provider Config Service
class ProviderConfigService {
  async getAll(): Promise<ProviderConfig[]> {
    return jsonStorage.getProviders();
  }
  
  async getEnabled(): Promise<ProviderConfig[]> {
    const all = jsonStorage.getProviders();
    return all.filter(p => p.enabled);
  }
  
  async get(id: string): Promise<ProviderConfig | undefined> {
    return jsonStorage.getProvider(id);
  }
  
  async getByType(type: string): Promise<ProviderConfig | undefined> {
    const all = jsonStorage.getProviders();
    return all.find(p => p.type === type);
  }
  
  async create(config: Omit<ProviderConfig, "id">): Promise<ProviderConfig> {
    const id = uuidv4();
    const newConfig = { ...config, id };
    jsonStorage.createProvider(newConfig as any);
    return newConfig;
  }
  
  async update(id: string, updates: Partial<ProviderConfig>): Promise<ProviderConfig | undefined> {
    const existing = await this.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    jsonStorage.updateProvider(id, updated);
    return updated;
  }
  
  async delete(id: string): Promise<void> {
    jsonStorage.deleteProvider(id);
  }
}

// Export singletons
export const providerRegistry = new ProviderRegistryImpl();
export const modelRegistry = new ModelRegistryImpl();
export const providerConfigService = new ProviderConfigService();

// Convenience functions
export async function getProviderAdapter(type: ProviderType): Promise<ProviderAdapter | undefined> {
  return providerRegistry.get(type);
}

export async function getAllModels(): Promise<ModelDefinition[]> {
  return modelRegistry.getAll();
}

export async function getModelsForProvider(provider: ProviderType): Promise<ModelDefinition[]> {
  return modelRegistry.getByProvider(provider);
}

export async function searchModels(query: string): Promise<ModelDefinition[]> {
  return modelRegistry.search(query);
}

export async function filterModels(filters: ModelFilter): Promise<ModelDefinition[]> {
  return modelRegistry.filter(filters);
}