import assert from "node:assert/strict";
import Message from "../src/models/message.model";
import { Pinecone } from "@pinecone-database/pinecone";
import { getMessages, sendMessage } from "../src/controllers/message.controller";
import { __testOnlySetEmbedder, __testOnlySetPineconeClient } from "../src/lib/meta-ai";

type MockResponse = {
  statusCode: number | null;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: null,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

async function run() {
  process.env.vectorDB_api_key = "test-pinecone-key";
  process.env.PINECONE_INDEX_NAME = "chatkara";
  process.env.PINECONE_HOST = "https://chatkara-9mjks7c.svc.aped-4627-b74a.pinecone.io";
  __testOnlySetEmbedder(async () => [1, 2, 3]);

  {
    const originalFind = Message.find;
    const sampleMessages = [{ _id: "m1" }, { _id: "m2" }];
    const queryChain = {
      sort: function () { return this; },
      skip: function () { return this; },
      limit: function () { return this; },
      populate: () => Promise.resolve(sampleMessages),
    };

    Message.find = ((query: unknown) => {
      assert.deepEqual(query, {
        conversationId: "conv_user-a_user-b",
      });
      return queryChain;
    }) as unknown as typeof Message.find;

    const originalCountDocuments = Message.countDocuments;
    Message.countDocuments = (async (query: unknown) => {
      assert.deepEqual(query, { conversationId: "conv_user-a_user-b" });
      return 2;
    }) as unknown as typeof Message.countDocuments;

    try {
      const req = {
        params: { id: "user-b" },
        user: { _id: "user-a" },
        query: {},
      };
      const res = createMockResponse();

      await getMessages(req as never, res as never);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, {
        messages: sampleMessages,
        pagination: {
          page: 1,
          limit: 30,
          total: 2,
          totalPages: 1,
          hasMore: false,
        },
      });
    } finally {
      Message.find = originalFind;
      Message.countDocuments = originalCountDocuments;
    }
  }

  {
    const originalCreate = Message.create;
    const originalFindById = Message.findById;
    let upsertCalled = false;
    const createdMessage = {
      _id: "m3",
      senderId: "user-a",
      receiverId: "user-b",
      text: "this is a longer message for embedding storage",
      image: "",
    };

    Message.create = (async (payload: unknown) => {
      assert.deepEqual(payload, {
        senderId: "user-a",
        receiverId: "user-b",
        conversationId: "conv_user-a_user-b",
        text: "this is a longer message for embedding storage",
        image: "",
      });
      return createdMessage;
    }) as unknown as typeof Message.create;

    Message.findById = ((id: unknown) => ({
      populate: async () => ({
        _id: id,
        senderId: "user-a",
        receiverId: "user-b",
        text: "this is a longer message for embedding storage",
        image: "",
      }),
    })) as unknown as typeof Message.findById;

    __testOnlySetPineconeClient({
      index: () => ({
      query: async () => ({ matches: [] }),
      upsert: async (payload: { records: unknown[] }) => {
        upsertCalled = true;
        assert.equal(payload.records.length, 1);
        const vector = payload.records[0] as { id: string; values: number[]; metadata?: Record<string, unknown> };
        assert.equal(vector.id, "m3");
        assert.ok(Array.isArray(vector.values));
        assert.equal(vector.metadata?.kind, "direct");
        assert.equal(vector.metadata?.conversationId, "conv_user-a_user-b");
      },
      }),
    } as unknown as Pinecone);

    try {
      const req = {
        params: { id: "user-b" },
        user: { _id: "user-a" },
        body: { text: "this is a longer message for embedding storage" },
      };
      const res = createMockResponse();

      await sendMessage(req as never, res as never);

      for (let attempt = 0; attempt < 20 && !upsertCalled; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      assert.equal(res.statusCode, 201);
      assert.deepEqual(res.body, createdMessage);
      assert.equal(upsertCalled, true);
    } finally {
      Message.create = originalCreate;
      Message.findById = originalFindById;
      __testOnlySetPineconeClient(null);
    }
  }

  {
    const req = {
      params: { id: "user-b" },
      user: undefined,
    };
    const res = createMockResponse();

    await getMessages(req as never, res as never);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { message: "Unauthorized request" });
  }

  console.log("message.controller tests passed");
  __testOnlySetEmbedder(null);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
