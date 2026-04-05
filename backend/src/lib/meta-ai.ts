import Message from "../models/message.model";
import User from "../models/user.model";
import { Pinecone } from "@pinecone-database/pinecone";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const META_EMAIL = "metaai@system.local";
const META_NAME = "metaAI";
const MAX_CONTEXT_MESSAGES = 30;
const PINECONE_TOP_K = 5;
const MIN_EMBED_WORDS = 20;
const META_REPLY_DEDUP_MS = 15000;
const recentMetaReplies = new Map<string, number>();
const EMBED_MODEL = process.env.EMBED_MODEL ?? "Xenova/all-MiniLM-L6-v2";
const TARGET_EMBED_DIM = parseInt(process.env.EMBED_DIM ?? "1024", 10);

function getPineconeApiKey() {
  return process.env.vectorDB_api_key ?? process.env.PINECONE_API_KEY ?? "";
}

function getPineconeIndex() {
  return process.env.PINECONE_INDEX ?? process.env.PINECONE_INDEX_NAME ?? "";
}

function getPineconeHost() {
  return process.env.PINECONE_HOST ?? "";
}
let pineconeClient: Pinecone | null = null;
let cachedMetaUserId: string | null = null;
let embedderOverride:
  | ((input: string, options?: { pooling?: "mean" | "max"; normalize?: boolean }) => Promise<number[]>)
  | null = null;

function getPineconeClient() {
  const apiKey = getPineconeApiKey();
  if (!pineconeClient && hasValue(apiKey)) {
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

const LLM_API_KEY = process.env.api_key ?? process.env.LLM_API_KEY ?? "";
const LLM_MODEL = process.env.LLM_MODEL ?? "llama-3.3-70b-versatile";
const LLM_COMPLETIONS_URL = process.env.LLM_COMPLETIONS_URL ?? "https://api.groq.com/openai/v1/chat/completions";

let embedderPromise:
  | Promise<(input: string, options?: { pooling?: "mean" | "max"; normalize?: boolean }) => Promise<number[]>>
  | null = null;

async function initEmbedder() {
  if (embedderOverride) return embedderOverride;
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      const extractor = await pipeline("feature-extraction", EMBED_MODEL);
      return async (input: string, options?: { pooling?: "mean" | "max"; normalize?: boolean }) => {
        const output = await extractor(input, { pooling: "mean", normalize: true, ...options });
        return Array.from(output.data as Float32Array);
      };
    })();
  }
  return embedderPromise;
}

export function __testOnlySetEmbedder(
  embedder: ((input: string, options?: { pooling?: "mean" | "max"; normalize?: boolean }) => Promise<number[]>) | null,
) {
  embedderOverride = embedder;
}

export function __testOnlySetPineconeClient(client: Pinecone | null) {
  pineconeClient = client;
}

function hasValue(value: string): boolean {
  return Boolean(value && value.trim());
}

export async function ensureMetaUser() {
  if (cachedMetaUserId) return { _id: cachedMetaUserId };

  let metaUser = await User.findOne({ email: META_EMAIL });
  if (!metaUser) {
    metaUser = await User.create({
      email: META_EMAIL,
      fullName: META_NAME,
      profilePic: "",
    });
  }
  cachedMetaUserId = metaUser._id.toString();
  return metaUser;
}

export function extractMetaIntent(text: string): { query: string; useVector: boolean } | null {
  const hasPro = /@meta_pro\b/i.test(text);
  const hasFast = /@meta\b/i.test(text);
  if (!hasPro && !hasFast) return null;

  const query = text.replace(/@meta_pro\b/gi, "").replace(/@meta\b/gi, "").trim();
  if (!query) return null;

  return { query, useVector: hasPro };
}

export async function getConversationContext(conversationId: string) {
  const messages = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(MAX_CONTEXT_MESSAGES)
    .populate("senderId", "fullName");

  const chronological = [...messages].reverse();
  return chronological.map((message) => {
    const senderName = typeof message.senderId === "object" && "fullName" in message.senderId
      ? String(message.senderId.fullName)
      : "User";
    const text = message.text?.trim();
    if (text) return `${senderName}: ${text}`;
    return `${senderName}: [image]`;
  });
}

export async function getGroupContext(groupId: string) {
  const messages = await Message.find({ groupId })
    .sort({ createdAt: -1 })
    .limit(MAX_CONTEXT_MESSAGES)
    .populate("senderId", "fullName");

  const chronological = [...messages].reverse();
  return chronological.map((message) => {
    const senderName = typeof message.senderId === "object" && "fullName" in message.senderId
      ? String(message.senderId.fullName)
      : "User";
    const text = message.text?.trim();
    if (text) return `${senderName}: ${text}`;
    return `${senderName}: [image]`;
  });
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function fetchEmbedding(input: string, options?: { minWords?: number }): Promise<number[] | null> {
  const minWords = options?.minWords ?? MIN_EMBED_WORDS;
  if (!hasValue(input) || countWords(input) < minWords) return null;
  try {
    const embedder = await initEmbedder();
    const raw = await embedder(input, { pooling: "mean", normalize: true });
    if (!Number.isFinite(TARGET_EMBED_DIM) || TARGET_EMBED_DIM <= 0) return raw;
    if (raw.length === TARGET_EMBED_DIM) return raw;
    if (raw.length > TARGET_EMBED_DIM) return raw.slice(0, TARGET_EMBED_DIM);
    return raw.concat(Array.from({ length: TARGET_EMBED_DIM - raw.length }, () => 0));
  } catch {
    return null;
  }
}

function hasVectorConfig() {
  return hasValue(getPineconeApiKey()) && hasValue(getPineconeIndex());
}

async function queryPinecone(embedding: number[], filter?: Record<string, unknown>) {
  const client = getPineconeClient();
  const indexName = getPineconeIndex();
  const host = getPineconeHost();
  if (!client || !hasValue(indexName)) return [];

  const index = hasValue(host) ? client.index(indexName, host) : client.index(indexName);
  const results = await index.query({
    vector: embedding,
    topK: PINECONE_TOP_K,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  });
  return results.matches ?? [];
}

export async function upsertMessageEmbedding(params: {
  messageId: string;
  text: string;
  senderId: string;
  conversationId?: string;
  groupId?: string;
  kind: "direct" | "group";
  minWords?: number;
}) {
  const { messageId, text, senderId, conversationId, groupId, kind, minWords } = params;
  const client = getPineconeClient();
  const indexName = getPineconeIndex();
  const host = getPineconeHost();
  if (!client || !hasValue(indexName)) return;
  const minWordCount = minWords ?? MIN_EMBED_WORDS;
  if (!hasValue(text) || countWords(text) < minWordCount) return;

  const embedding = await fetchEmbedding(text, { minWords: minWordCount });
  if (!embedding) return;

  const index = hasValue(host) ? client.index(indexName, host) : client.index(indexName);
  if (embedding.length === 0) return;

  await index.upsert({
    records: [
      {
        id: messageId,
        values: embedding,
        metadata: {
          text,
          senderId,
          kind,
          ...(conversationId ? { conversationId } : {}),
          ...(groupId ? { groupId } : {}),
        },
      },
    ],
  });
}

function buildRagContext(matches: Array<{ metadata?: Record<string, unknown> }>) {
  const chunks: string[] = [];
  for (const match of matches) {
    const metadata = match.metadata ?? {};
    const text = typeof metadata.text === "string" ? metadata.text : "";
    if (text) chunks.push(text);
  }
  return chunks;
}

async function callCompletion(messages: ChatMessage[]): Promise<string | null> {
  if (!hasValue(LLM_COMPLETIONS_URL) || !hasValue(LLM_API_KEY) || !hasValue(LLM_MODEL)) return null;

  const res = await fetch(LLM_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 400,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  return content || null;
}

export async function generateMetaReply(query: string, conversationId: string, useVector = false) {
  const result = await generateMetaReplyWithDebug(query, conversationId, useVector);
  return result.reply;
}

export async function generateMetaReplyForGroup(query: string, groupId: string, useVector = false) {
  const result = await generateMetaReplyForGroupWithDebug(query, groupId, useVector);
  return result.reply;
}

export async function generateMetaReplyWithDebug(query: string, conversationId: string, useVector = false) {
  const contextLines = await getConversationContext(conversationId);
  const vectorConfigured = hasVectorConfig();
  const embedding = useVector ? await fetchEmbedding(query, { minWords: 1 }) : null;
  const pineconeMatches = useVector && embedding && vectorConfigured
    ? await queryPinecone(embedding, { conversationId, kind: "direct" })
    : [];
  const ragContext = buildRagContext(pineconeMatches);

  const systemPrompt = [
    "You are metaAI, a helpful assistant in a chat app.",
    "Answer the user's request using the conversation and vector context when relevant.",
    "If context is missing, answer briefly and clearly from general knowledge.",
  ].join(" ");

  const userPrompt = [
    "Conversation (most recent last):",
    contextLines.join("\n"),
    "",
    "Vector context:",
    ragContext.length ? ragContext.join("\n\n") : "(no vector context)",
    "",
    "User query:",
    query,
  ].join("\n");

  const reply = await callCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return {
    reply,
    metaInfo: {
      source: "metaAI" as const,
      mode: useVector ? "meta_pro" : "meta",
      vectorMatches: pineconeMatches.length,
      usedVector: Boolean(useVector && embedding && vectorConfigured),
      vectorConfigured,
    },
  };
}

export async function generateMetaReplyForGroupWithDebug(query: string, groupId: string, useVector = false) {
  const contextLines = await getGroupContext(groupId);
  const vectorConfigured = hasVectorConfig();
  const embedding = useVector ? await fetchEmbedding(query, { minWords: 1 }) : null;
  const pineconeMatches = useVector && embedding && vectorConfigured
    ? await queryPinecone(embedding, { groupId, kind: "group" })
    : [];
  const ragContext = buildRagContext(pineconeMatches);

  const systemPrompt = [
    "You are metaAI, a helpful assistant in a group chat.",
    "Answer the user's request using the conversation and vector context when relevant.",
    "If context is missing, answer briefly and clearly from general knowledge.",
  ].join(" ");

  const userPrompt = [
    "Conversation (most recent last):",
    contextLines.join("\n"),
    "",
    "Vector context:",
    ragContext.length ? ragContext.join("\n\n") : "(no vector context)",
    "",
    "User query:",
    query,
  ].join("\n");

  const reply = await callCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return {
    reply,
    metaInfo: {
      source: "metaAI" as const,
      mode: useVector ? "meta_pro" : "meta",
      vectorMatches: pineconeMatches.length,
      usedVector: Boolean(useVector && embedding && vectorConfigured),
      vectorConfigured,
    },
  };
}

export function shouldGenerateMetaReplyOnce(key: string) {
  const now = Date.now();
  const last = recentMetaReplies.get(key) ?? 0;
  if (now - last < META_REPLY_DEDUP_MS) {
    return false;
  }
  recentMetaReplies.set(key, now);
  for (const [entryKey, ts] of recentMetaReplies.entries()) {
    if (now - ts > META_REPLY_DEDUP_MS * 2) {
      recentMetaReplies.delete(entryKey);
    }
  }
  return true;
}
