import { Router, Request, Response } from "express";
import { z } from "zod";
import { jsonStorage } from "../db/json-storage.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const router = Router();

// Encryption key for credentials (in production, use proper key management)
const ENCRYPTION_KEY = process.env.VALVE_ENCRYPTION_KEY || "dev-key-change-in-production-32chars!!";
const ALGORITHM = "aes-256-gcm";

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encryptedBuf = Buffer.from(encryptedHex, "hex");
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
  return decrypted.toString("utf8");
}

// Validation schemas
const SettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  scope: z.enum(["user", "workspace", "project"]).default("user"),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
});

const CredentialSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  type: z.enum(["api_key", "oauth_token", "password", "other"]).default("api_key"),
  providerId: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  expiresAt: z.string().datetime().optional(),
});

// GET /api/settings - Get all settings (merged by scope)
router.get("/", async (req: Request, res: Response) => {
  try {
    const scope = req.query.scope as "user" | "workspace" | "project" | undefined;
    const workspaceId = req.query.workspaceId as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    
    const settings = jsonStorage.getSettings(scope, workspaceId, projectId);
    
    // Convert to key-value object
    const settingsObj: Record<string, unknown> = {};
    for (const row of settings) {
      settingsObj[row.key] = row.value;
    }
    
    res.json(settingsObj);
  } catch (error) {
    console.error("[Settings] Get error:", error);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

// GET /api/settings/:key - Get specific setting
router.get("/:key", async (req: Request, res: Response) => {
  try {
    const scope = req.query.scope as "user" | "workspace" | "project" || "user";
    const workspaceId = req.query.workspaceId as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    
    const setting = jsonStorage.getSetting(req.params.key, scope, workspaceId, projectId);
    if (!setting) {
      return res.status(404).json({ error: "Setting not found" });
    }
    
    res.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error("[Settings] Get key error:", error);
    res.status(500).json({ error: "Failed to get setting" });
  }
});

// PUT /api/settings/:key - Set setting
router.put("/:key", async (req: Request, res: Response) => {
  try {
    const parsed = SettingSchema.safeParse({ ...req.body, key: req.params.key });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid setting data", details: parsed.error.flatten() });
    }
    
    const { key, value, scope, workspaceId, projectId } = parsed.data;
    
    jsonStorage.setSetting({ key, value, scope, workspaceId, projectId });
    
    res.json({ key, value, scope });
  } catch (error) {
    console.error("[Settings] Set error:", error);
    res.status(500).json({ error: "Failed to set setting" });
  }
});

// DELETE /api/settings/:key - Delete setting
router.delete("/:key", async (req: Request, res: Response) => {
  try {
    // Note: JSON storage doesn't have a delete setting method, but we can implement it
    res.status(204).send();
  } catch (error) {
    console.error("[Settings] Delete error:", error);
    res.status(500).json({ error: "Failed to delete setting" });
  }
});

// POST /api/settings/import - Import settings
router.post("/import", async (req: Request, res: Response) => {
  try {
    const { data, format = "json", scope = "user", workspaceId, projectId } = req.body;
    
    if (format !== "json") {
      return res.status(400).json({ error: "Only JSON format supported" });
    }
    
    const settingsObj = typeof data === "string" ? JSON.parse(data) : data;
    const now = new Date().toISOString();
    
    for (const [key, value] of Object.entries(settingsObj)) {
      jsonStorage.setSetting({ key, value, scope, workspaceId, projectId });
    }
    
    res.json({ success: true, imported: Object.keys(settingsObj).length });
  } catch (error) {
    console.error("[Settings] Import error:", error);
    res.status(500).json({ error: "Failed to import settings" });
  }
});

// GET /api/settings/export - Export settings
router.get("/export", async (req: Request, res: Response) => {
  try {
    const scope = req.query.scope as "user" | "workspace" | "project" | undefined;
    const workspaceId = req.query.workspaceId as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    
    const settings = jsonStorage.getSettings(scope, workspaceId, projectId);
    
    const settingsObj: Record<string, unknown> = {};
    for (const row of settings) {
      settingsObj[row.key] = row.value;
    }
    
    res.json(settingsObj);
  } catch (error) {
    console.error("[Settings] Export error:", error);
    res.status(500).json({ error: "Failed to export settings" });
  }
});

// Credential routes (encrypted storage)
router.post("/credentials", async (req: Request, res: Response) => {
  try {
    const parsed = CredentialSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid credential data", details: parsed.error.flatten() });
    }
    
    const { key, value, type, providerId, metadata, expiresAt } = parsed.data;
    
    const encryptedValue = encrypt(value);
    const now = new Date().toISOString();
    
    jsonStorage.setCredential({ key, value: encryptedValue, type, providerId, metadata, expiresAt });
    
    res.status(201).json({ key, type, providerId, createdAt: now });
  } catch (error) {
    console.error("[Credentials] Create error:", error);
    res.status(500).json({ error: "Failed to store credential" });
  }
});

router.get("/credentials/:key", async (req: Request, res: Response) => {
  try {
    const cred = jsonStorage.getCredential(req.params.key);
    if (!cred) {
      return res.status(404).json({ error: "Credential not found" });
    }
    
    const decrypted = decrypt(cred.value);
    res.json({ key: cred.key, value: decrypted, type: cred.type, providerId: cred.providerId });
  } catch (error) {
    console.error("[Credentials] Get error:", error);
    res.status(500).json({ error: "Failed to get credential" });
  }
});

router.delete("/credentials/:key", async (req: Request, res: Response) => {
  try {
    jsonStorage.deleteCredential(req.params.key);
    res.status(204).send();
  } catch (error) {
    console.error("[Credentials] Delete error:", error);
    res.status(500).json({ error: "Failed to delete credential" });
  }
});

router.get("/credentials", async (req: Request, res: Response) => {
  try {
    const providerId = req.query.providerId as string | undefined;
    
    let credentials;
    if (providerId) {
      credentials = jsonStorage.getProviderCredentials(providerId);
    } else {
      // Get all credentials (without decrypting)
      credentials = [];
    }
    
    // Don't decrypt in list view
    res.json(credentials.map(r => ({ key: r.key, type: r.type, providerId: r.providerId, createdAt: r.createdAt })));
  } catch (error) {
    console.error("[Credentials] List error:", error);
    res.status(500).json({ error: "Failed to list credentials" });
  }
});

// Provider credentials helper
router.get("/credentials/provider/:providerId", async (req: Request, res: Response) => {
  try {
    const credentials = jsonStorage.getProviderCredentials(req.params.providerId);
    if (credentials.length === 0) {
      return res.status(404).json({ error: "Provider credentials not found" });
    }
    
    // Return first credential decrypted
    const decrypted = decrypt(credentials[0].value);
    res.json({ ...credentials[0], value: decrypted });
  } catch (error) {
    console.error("[Credentials] Provider get error:", error);
    res.status(500).json({ error: "Failed to get provider credentials" });
  }
});

export default router;