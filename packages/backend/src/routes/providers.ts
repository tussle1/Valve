import { Router, Request, Response } from "express";
import { z } from "zod";
import { providerRegistry, modelRegistry, providerConfigService } from "../providers/registry.js";
import { ProviderConfigSchema, ModelFilterSchema } from "@valve/shared";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Validation schemas
const CreateProviderSchema = ProviderConfigSchema.omit({ id: true });
const UpdateProviderSchema = ProviderConfigSchema.partial().omit({ id: true, type: true });
const TestProviderSchema = z.object({ configId: z.string() });
const RefreshModelsSchema = z.object({ configId: z.string() });

// GET /api/providers - List all provider configurations
router.get("/", async (req: Request, res: Response) => {
  try {
    const configs = await providerConfigService.getAll();
    // Don't expose API key refs in list
    const safeConfigs = configs.map(c => ({
      ...c,
      apiKeyRef: c.apiKeyRef ? "***" : undefined,
    }));
    res.json(safeConfigs);
  } catch (error) {
    console.error("[Providers] List error:", error);
    res.status(500).json({ error: "Failed to list providers" });
  }
});

// GET /api/providers/types - List supported provider types
router.get("/types", (req: Request, res: Response) => {
  const types = providerRegistry.getSupportedTypes();
  const adapters = providerRegistry.getAll();
  res.json(types.map(type => {
    const adapter = adapters.find(a => a.type === type);
    return {
      type: adapter!.type,
      name: adapter!.name,
      capabilities: adapter!.capabilities,
    };
  }));
});

// GET /api/providers/:id - Get provider configuration
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const config = await providerConfigService.get(req.params.id);
    if (!config) {
      return res.status(404).json({ error: "Provider not found" });
    }
    // Don't expose actual API key
    res.json({ ...config, apiKeyRef: config.apiKeyRef ? "***" : undefined });
  } catch (error) {
    console.error("[Providers] Get error:", error);
    res.status(500).json({ error: "Failed to get provider" });
  }
});

// POST /api/providers - Create provider configuration
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreateProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid provider config", details: parsed.error.flatten() });
    }
    
    const config = await providerConfigService.create(parsed.data);
    res.status(201).json({ ...config, apiKeyRef: config.apiKeyRef ? "***" : undefined });
  } catch (error) {
    console.error("[Providers] Create error:", error);
    res.status(500).json({ error: "Failed to create provider" });
  }
});

// PUT /api/providers/:id - Update provider configuration
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const parsed = UpdateProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid provider config", details: parsed.error.flatten() });
    }
    
    const config = await providerConfigService.update(req.params.id, parsed.data);
    if (!config) {
      return res.status(404).json({ error: "Provider not found" });
    }
    res.json({ ...config, apiKeyRef: config.apiKeyRef ? "***" : undefined });
  } catch (error) {
    console.error("[Providers] Update error:", error);
    res.status(500).json({ error: "Failed to update provider" });
  }
});

// DELETE /api/providers/:id - Delete provider configuration
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await providerConfigService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("[Providers] Delete error:", error);
    res.status(500).json({ error: "Failed to delete provider" });
  }
});

// POST /api/providers/test - Test provider connection
router.post("/test", async (req: Request, res: Response) => {
  try {
    const parsed = TestProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    
    const config = await providerConfigService.get(parsed.data.configId);
    if (!config) {
      return res.status(404).json({ error: "Provider not found" });
    }
    
    const result = await providerRegistry.testProvider(config);
    res.json(result);
  } catch (error) {
    console.error("[Providers] Test error:", error);
    res.status(500).json({ error: "Failed to test provider" });
  }
});

// POST /api/providers/refresh-models - Refresh models from provider
router.post("/refresh-models", async (req: Request, res: Response) => {
  try {
    const parsed = RefreshModelsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    
    const config = await providerConfigService.get(parsed.data.configId);
    if (!config) {
      return res.status(404).json({ error: "Provider not found" });
    }
    
    const models = await providerRegistry.refreshModelsFromProvider(config);
    res.json({ models, count: models.length });
  } catch (error) {
    console.error("[Providers] Refresh models error:", error);
    res.status(500).json({ error: "Failed to refresh models" });
  }
});

// GET /api/models - List all models
router.get("/models", async (req: Request, res: Response) => {
  try {
    const filters = ModelFilterSchema.parse({
      providers: req.query.providers ? (req.query.providers as string).split(",") : undefined,
      capabilities: req.query.capabilities ? (req.query.capabilities as string).split(",") : undefined,
      families: req.query.families ? (req.query.families as string).split(",") : undefined,
      executionEnvironments: req.query.executionEnvironments ? (req.query.executionEnvironments as string).split(",") : undefined,
      statuses: req.query.statuses ? (req.query.statuses as string).split(",") : undefined,
      minContextWindow: req.query.minContextWindow ? parseInt(req.query.minContextWindow as string) : undefined,
      maxContextWindow: req.query.maxContextWindow ? parseInt(req.query.maxContextWindow as string) : undefined,
      maxPricePer1kInput: req.query.maxPricePer1kInput ? parseFloat(req.query.maxPricePer1kInput as string) : undefined,
      maxPricePer1kOutput: req.query.maxPricePer1kOutput ? parseFloat(req.query.maxPricePer1kOutput as string) : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(",") : undefined,
      favoritesOnly: req.query.favoritesOnly === "true",
      hidden: req.query.hidden === "true",
    });
    
    const models = await modelRegistry.filter(filters);
    res.json(models);
  } catch (error) {
    console.error("[Models] List error:", error);
    res.status(500).json({ error: "Failed to list models" });
  }
});

// GET /api/models/search - Search models
router.get("/models/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Query too short" });
    }
    
    const models = await modelRegistry.search(query);
    res.json(models);
  } catch (error) {
    console.error("[Models] Search error:", error);
    res.status(500).json({ error: "Failed to search models" });
  }
});

// GET /api/models/:id - Get model details
router.get("/models/:id", async (req: Request, res: Response) => {
  try {
    const model = modelRegistry.get(req.params.id);
    if (!model) {
      // Try loading from DB
      const allModels = await modelRegistry.getAll();
      const found = allModels.find(m => m.id === req.params.id);
      if (!found) {
        return res.status(404).json({ error: "Model not found" });
      }
      return res.json(found);
    }
    res.json(model);
  } catch (error) {
    console.error("[Models] Get error:", error);
    res.status(500).json({ error: "Failed to get model" });
  }
});

// GET /api/models/by-provider/:provider - Get models for a provider
router.get("/models/by-provider/:provider", async (req: Request, res: Response) => {
  try {
    const models = await modelRegistry.getByProvider(req.params.provider as any);
    res.json(models);
  } catch (error) {
    console.error("[Models] By provider error:", error);
    res.status(500).json({ error: "Failed to get models for provider" });
  }
});

// GET /api/models/by-capability/:capability - Get models with capability
router.get("/models/by-capability/:capability", async (req: Request, res: Response) => {
  try {
    const models = await modelRegistry.getByCapability(req.params.capability as any);
    res.json(models);
  } catch (error) {
    console.error("[Models] By capability error:", error);
    res.status(500).json({ error: "Failed to get models by capability" });
  }
});

export default router;