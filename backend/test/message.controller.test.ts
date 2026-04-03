import assert from "node:assert/strict";
import Message from "../src/models/message.model";
import { getMessages, sendMessage } from "../src/controllers/message.controller";

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
  {
    const originalFind = Message.find;
    const sampleMessages = [{ _id: "m1" }, { _id: "m2" }];

    Message.find = (async (query: unknown) => {
      assert.deepEqual(query, {
        $or: [
          { senderId: "user-a", receiverId: "user-b" },
          { senderId: "user-b", receiverId: "user-a" },
        ],
      });
      return sampleMessages;
    }) as unknown as typeof Message.find;

    try {
      const req = {
        params: { id: "user-b" },
        user: { _id: "user-a" },
      };
      const res = createMockResponse();

      await getMessages(req as never, res as never);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, sampleMessages);
    } finally {
      Message.find = originalFind;
    }
  }

  {
    const originalCreate = Message.create;
    const createdMessage = {
      _id: "m3",
      senderId: "user-a",
      receiverId: "user-b",
      text: "hello",
      image: "",
    };

    Message.create = (async (payload: unknown) => {
      assert.deepEqual(payload, {
        senderId: "user-a",
        receiverId: "user-b",
        text: "hello",
        image: "",
      });
      return createdMessage;
    }) as unknown as typeof Message.create;

    try {
      const req = {
        params: { id: "user-b" },
        user: { _id: "user-a" },
        body: { text: "hello" },
      };
      const res = createMockResponse();

      await sendMessage(req as never, res as never);

      assert.equal(res.statusCode, 201);
      assert.deepEqual(res.body, createdMessage);
    } finally {
      Message.create = originalCreate;
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
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
