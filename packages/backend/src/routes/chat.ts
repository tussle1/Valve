import { Router, Request, Response } from "express";
import { z } from "zod";
import { providerRegistry, modelRegistry, providerConfigService } from "../providers/registry.js";
import { jsonStorage } from "../db/json-storage.js";
import { v4 as uuidv4 } from "uuid";
import type { ChatCompletionRequest, ChatMessage, ModelDefinition } from "@valve/shared";

const router = Router();

// Validation schemas
const CreateConversationSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1).max(200),
  modelId: z.string(),
  providerId: z.string(),
  systemInstructions: z.string().optional(),
  projectInstructions: z.string().optional(),
});

const SendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1),
  modelId: z.string().optional(),
  attachments: z.array(z.object({
    type: z.enum(["file", "image", "folder", "selection", "git-diff", "terminal-output", "diagnostics"]),
    path: z.string().optional(),
    content: z.string().optional(),
  })).default([]),
  stream: z.boolean().default(true),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

const UpdateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  systemInstructions: z.string().optional(),
  projectInstructions: z.string().optional(),
});

// GET /api/chat/conversations - List conversations
router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    let conversations = jsonStorage.getConversations(projectId);
    conversations = conversations.slice(offset, offset + limit);
    res.json(conversations);
  } catch (error) {
    console.error("[Chat] List conversations error:", error);
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// POST /api/chat/conversations - Create conversation
router.post("/conversations", async (req: Request, res: Response) => {
  try {
    const parsed = CreateConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid conversation data", details: parsed.error.flatten() });
    }
    
    const { projectId, title, modelId, providerId, systemInstructions, projectInstructions } = parsed.data;
    
    // Verify model exists
    const model = modelRegistry.get(modelId);
    if (!model) {
      return res.status(400).json({ error: "Model not found" });
    }
    
    // Verify provider exists
    const provider = await providerConfigService.get(providerId);
    if (!provider) {
      return res.status(400).json({ error: "Provider not found" });
    }
    
    const conversation = jsonStorage.createConversation({
      projectId,
      title,
      modelId,
      providerId,
      systemInstructions,
      projectInstructions,
    });
    
    res.status(201).json(conversation);
  } catch (error) {
    console.error("[Chat] Create conversation error:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// GET /api/chat/conversations/:id - Get conversation with messages
router.get("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const conversation = jsonStorage.getConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const msgs = jsonStorage.getMessages(req.params.id);
    res.json({ ...conversation, messages: msgs });
  } catch (error) {
    console.error("[Chat] Get conversation error:", error);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

// PUT /api/chat/conversations/:id - Update conversation
router.put("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const parsed = UpdateConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    }
    
    const conversation = jsonStorage.updateConversation(req.params.id, parsed.data);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error("[Chat] Update conversation error:", error);
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

// DELETE /api/chat/conversations/:id - Delete conversation
router.delete("/conversations/:id", async (req: Request, res: Response) => {
  try {
    jsonStorage.deleteConversation(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("[Chat] Delete conversation error:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// POST /api/chat/conversations/:id/messages - Send message (streaming)
router.post("/conversations/:id/messages", async (req: Request, res: Response) => {
  try {
    const parsed = SendMessageSchema.safeParse({ ...req.body, conversationId: req.params.id });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid message data", details: parsed.error.flatten() });
    }
    
    const { conversationId, content, modelId, attachments, stream, temperature, maxTokens } = parsed.data;
    
    // Get conversation
    const conversation = jsonStorage.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const conv = conversation;
    const finalModelId = modelId || conv.modelId;
    const finalProviderId = conv.providerId;
    
    // Get provider config
    const providerConfig = await providerConfigService.get(finalProviderId);
    if (!providerConfig) {
      return res.status(400).json({ error: "Provider not configured" });
    }
    
    // Get model
    const model = modelRegistry.get(finalModelId);
    if (!model) {
      return res.status(400).json({ error: "Model not found" });
    }
    
    // Get provider adapter
    const adapter = providerRegistry.get(providerConfig.type);
    if (!adapter) {
      return res.status(400).json({ error: `Provider adapter not found: ${providerConfig.type}` });
    }
    
    // Build messages array
    const previousMessages = jsonStorage.getMessages(conversationId);
    
    const systemMessages: ChatMessage[] = [];
    if (conv.systemInstructions) {
      systemMessages.push({ role: "system", content: conv.systemInstructions, metadata: {} });
    }
    if (conv.projectInstructions) {
      systemMessages.push({ role: "system", content: conv.projectInstructions, metadata: {} });
    }
    
    // Add attachment context as system messages
    for (const att of attachments) {
      if (att.content) {
        systemMessages.push({
          role: "system",
          content: `[Attached ${att.type}${att.path ? `: ${att.path}` : ""}]\n${att.content}`,
          metadata: { attachment: true, attachmentType: att.type, attachmentPath: att.path },
        });
      }
    }
    
    const chatMessages: ChatMessage[] = [
      ...systemMessages,
      ...previousMessages.map(m => ({
        role: m.role as any,
        content: m.content,
        name: m.name,
        toolCalls: m.toolCalls as any,
        toolCallId: m.toolCallId,
        metadata: m.metadata as Record<string, unknown>,
      })),
      { role: "user", content, metadata: {} },
    ];
    
    // Save user message
    const userMessageId = uuidv4();
    jsonStorage.createMessage({
      id: userMessageId,
      conversationId,
      role: "user",
      content,
      metadata: { attachments },
    });
    
    // Prepare request
    const request: ChatCompletionRequest = {
      model: finalModelId,
      messages: chatMessages,
      temperature,
      maxTokens,
      stream,
      tools: model.tools ? [] : undefined,
    };
    
    // Validate request
    const validation = adapter.validateRequest(request, model);
    if (!validation.valid) {
      return res.status(400).json({ error: "Invalid request", details: validation.errors });
    }
    
    if (stream) {
      // Streaming response
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      
      const assistantMessageId = uuidv4();
      let fullContent = "";
      let toolCalls: any[] = [];
      let finishReason: string | null = null;
      let usage: any = null;
      let error: string | null = null;
      
      try {
        for await (const chunk of adapter.streamChat(request, providerConfig)) {
          // Send chunk to client
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          
          // Accumulate for database
          if (chunk.choices[0]?.delta?.content) {
            fullContent += chunk.choices[0].delta.content;
          }
          if (chunk.choices[0]?.delta?.toolCalls) {
            toolCalls.push(...chunk.choices[0].delta.toolCalls);
          }
          if (chunk.choices[0]?.finishReason) {
            finishReason = chunk.choices[0].finishReason;
          }
          if (chunk.usage) {
            usage = chunk.usage;
          }
        }
        
        res.write("data: [DONE]\n\n");
        res.end();
        
        // Save assistant message
        jsonStorage.createMessage({
          id: assistantMessageId,
          conversationId,
          role: "assistant",
          content: fullContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : null,
          metadata: { finishReason },
          tokens: usage?.totalTokens,
          modelId: finalModelId,
          providerId: finalProviderId,
          status: "completed",
        });
        
        // Record usage
        if (usage) {
          jsonStorage.createUsageRecord({
            projectId: conv.projectId,
            providerId: finalProviderId,
            modelId: finalModelId,
            conversationId,
            requestType: "chat",
            inputTokens: usage.promptTokens,
            outputTokens: usage.completionTokens,
            cachedTokens: usage.cachedTokens || 0,
            totalTokens: usage.totalTokens,
            latencyMs: 0,
            status: "success",
          });
        }
        
        // Update conversation
        jsonStorage.updateConversation(conversationId, {
          updatedAt: new Date().toISOString(),
        });
        
      } catch (streamError) {
        error = streamError instanceof Error ? streamError.message : String(streamError);
        
        // Save error message
        jsonStorage.createMessage({
          id: assistantMessageId,
          conversationId,
          role: "assistant",
          content: null,
          metadata: { error },
          modelId: finalModelId,
          providerId: finalProviderId,
          status: "error",
          error,
        });
        
        res.write(`data: ${JSON.stringify({ error })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming response
      const response = await adapter.chat(request, providerConfig);
      
      const assistantMessageId = uuidv4();
      const choice = response.choices[0];
      
      // Save assistant message
      jsonStorage.createMessage({
        id: assistantMessageId,
        conversationId,
        role: "assistant",
        content: choice.message.content,
        toolCalls: choice.message.toolCalls,
        metadata: { finishReason: choice.finishReason },
        tokens: response.usage?.totalTokens,
        modelId: finalModelId,
        providerId: finalProviderId,
        status: "completed",
      });
      
      // Record usage
      if (response.usage) {
        jsonStorage.createUsageRecord({
          projectId: conv.projectId,
          providerId: finalProviderId,
          modelId: finalModelId,
          conversationId,
          requestType: "chat",
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
          cachedTokens: response.usage.cachedTokens || 0,
          totalTokens: response.usage.totalTokens,
          latencyMs: 0,
          status: "success",
        });
      }
      
      // Update conversation
      jsonStorage.updateConversation(conversationId, {
        updatedAt: new Date().toISOString(),
      });
      
      res.json(response);
    }
  } catch (error) {
    console.error("[Chat] Send message error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to send message" });
    }
  }
});

// POST /api/chat/completions - Direct completion (no conversation)
router.post("/completions", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      modelId: z.string(),
      providerId: z.string(),
      messages: z.array(z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z.union([z.string(), z.array(z.unknown())]).nullable(),
        name: z.string().optional(),
        toolCalls: z.array(z.unknown()).optional(),
        toolCallId: z.string().optional(),
      })).min(1),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().positive().optional(),
      stream: z.boolean().default(false),
      tools: z.array(z.unknown()).optional(),
    });
    
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    
    const { modelId, providerId, messages: msgs, temperature, maxTokens, stream, tools } = parsed.data;
    
    // Get provider config
    const providerConfig = await providerConfigService.get(providerId);
    if (!providerConfig) {
      return res.status(400).json({ error: "Provider not configured" });
    }
    
    // Get model
    const model = modelRegistry.get(modelId);
    if (!model) {
      return res.status(400).json({ error: "Model not found" });
    }
    
    // Get provider adapter
    const adapter = providerRegistry.get(providerConfig.type);
    if (!adapter) {
      return res.status(400).json({ error: `Provider adapter not found: ${providerConfig.type}` });
    }
    
    const request: ChatCompletionRequest = {
      model: modelId,
      messages: msgs as any,
      temperature,
      maxTokens,
      stream,
      tools: tools as any,
    };
    
    const validation = adapter.validateRequest(request, model);
    if (!validation.valid) {
      return res.status(400).json({ error: "Invalid request", details: validation.errors });
    }
    
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      
      try {
        for await (const chunk of adapter.streamChat(request, providerConfig)) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (streamError) {
        res.write(`data: ${JSON.stringify({ error: streamError instanceof Error ? streamError.message : String(streamError) })}\n\n`);
        res.end();
      }
    } else {
      const response = await adapter.chat(request, providerConfig);
      res.json(response);
    }
  } catch (error) {
    console.error("[Chat] Completion error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to complete request" });
    }
  }
});

export default router;