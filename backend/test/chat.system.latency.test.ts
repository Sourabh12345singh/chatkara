import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { checkAuth, logout, signup, updateProfile } from "../src/controllers/auth.controller";
import { getMessages, sendMessage } from "../src/controllers/message.controller";
import Message from "../src/models/message.model";
import Conversation from "../src/models/conversation.model";
import { io } from "../src/lib/socket";

type MockResponse = {
  statusCode: number | null;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
  cookie: (...args: unknown[]) => MockResponse;
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
    cookie() {
      return this;
    },
  };
}

async function sampleLatency(
  label: string,
  iterations: number,
  maxAverageMs: number,
  fn: () => Promise<void>
) {
  const samples: number[] = [];

  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }

  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  assert.ok(average <= maxAverageMs, `${label} average latency ${average.toFixed(2)}ms exceeded ${maxAverageMs}ms`);
  return average;
}

async function run() {
  const logoutRes = createMockResponse();
  logout({} as never, logoutRes as never);
  assert.equal(logoutRes.statusCode, 200);
  assert.deepEqual(logoutRes.body, { message: "Logged out successfully" });

  const checkAuthRes = createMockResponse();
  checkAuth({ user: { _id: "u-1", email: "x@example.com" } } as never, checkAuthRes as never);
  assert.equal(checkAuthRes.statusCode, 200);
  assert.deepEqual(checkAuthRes.body, { _id: "u-1", email: "x@example.com" });

  const signupMissingFieldsRes = createMockResponse();
  await signup({ body: {} } as never, signupMissingFieldsRes as never);
  assert.equal(signupMissingFieldsRes.statusCode, 400);
  assert.deepEqual(signupMissingFieldsRes.body, { message: "All fields are required" });

  const updateProfileMissingPicRes = createMockResponse();
  await updateProfile({ body: {}, user: { _id: "u-1" } } as never, updateProfileMissingPicRes as never);
  assert.equal(updateProfileMissingPicRes.statusCode, 400);
  assert.deepEqual(updateProfileMissingPicRes.body, { message: "Profile pic is required" });

  // Receive/retrieve message flow: success path for getMessages
  const originalFind = Message.find;
  const originalCount = Message.countDocuments;
  const originalConversationFindOne = Conversation.findOne;
  try {
    const sampleMessages = [{ _id: "m1", text: "hello" }, { _id: "m2", text: "yo" }];
    const queryChain = {
      sort: function () { return this; },
      skip: function () { return this; },
      limit: function () { return this; },
      populate: async () => sampleMessages,
    };

    Message.find = ((query: unknown) => {
      assert.deepEqual(query, { conversationId: "conv_u-1_u-2" });
      return queryChain;
    }) as unknown as typeof Message.find;

    Message.countDocuments = (async (query: unknown) => {
      assert.deepEqual(query, { conversationId: "conv_u-1_u-2" });
      return 2;
    }) as unknown as typeof Message.countDocuments;

    Conversation.findOne = (async () => null) as unknown as typeof Conversation.findOne;

    const res = createMockResponse();
    await getMessages({ params: { id: "u-2" }, user: { _id: "u-1" }, query: {} } as never, res as never);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      messages: sampleMessages,
      pagination: { page: 1, limit: 30, total: 2, totalPages: 1, hasMore: false },
    });
  } finally {
    Message.find = originalFind;
    Message.countDocuments = originalCount;
    Conversation.findOne = originalConversationFindOne;
  }

  const getMessagesUnauthorizedRes = createMockResponse();
  await getMessages({ params: { id: "u-2" }, user: undefined } as never, getMessagesUnauthorizedRes as never);
  assert.equal(getMessagesUnauthorizedRes.statusCode, 401);
  assert.deepEqual(getMessagesUnauthorizedRes.body, { message: "Unauthorized request" });

  const sendMessageUnauthorizedRes = createMockResponse();
  await sendMessage(
    { params: { id: "u-2" }, user: undefined, body: { text: "hello" } } as never,
    sendMessageUnauthorizedRes as never
  );
  assert.equal(sendMessageUnauthorizedRes.statusCode, 401);
  assert.deepEqual(sendMessageUnauthorizedRes.body, { message: "Unauthorized request" });

  // Real-time delivery latency: sender -> receiver socket emit
  {
    type FakeSocket = {
      id: string;
      handshake: { query: { userId: string } };
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      join: (_room: string) => void;
      leave: (_room: string) => void;
    };

    const handlers: Record<string, (...args: unknown[]) => void> = {};
    const receiverSocket: FakeSocket = {
      id: "socket-user-2",
      handshake: { query: { userId: "u-2" } },
      on(event, handler) {
        handlers[event] = handler;
      },
      join() {},
      leave() {},
    };

    const connectionListener = io.listeners("connection")[0] as ((socket: FakeSocket) => void) | undefined;
    assert.ok(connectionListener, "socket connection listener missing");
    connectionListener(receiverSocket);

    const originalMessageCreate = Message.create;
    const originalFindById = Message.findById;
    const originalConversationFindOneAndUpdate = Conversation.findOneAndUpdate;
    const originalIoTo = io.to.bind(io);

    let emittedAt = 0;
    let emittedEvent = "";
    let emittedRoom = "";
    const createdAt = new Date();

    try {
      Message.create = (async () => ({
        _id: "m-latency",
        senderId: "u-1",
        receiverId: "u-2",
        conversationId: "conv_u-1_u-2",
        text: "ping",
        image: "",
        createdAt,
      })) as unknown as typeof Message.create;

      Message.findById = (() => ({
        populate: async () => ({
          _id: "m-latency",
          senderId: "u-1",
          receiverId: "u-2",
          text: "ping",
          image: "",
          createdAt,
        }),
      })) as unknown as typeof Message.findById;

      Conversation.findOneAndUpdate = (async () => null) as unknown as typeof Conversation.findOneAndUpdate;

      (io as unknown as { to: (room: string) => { emit: (event: string, payload: unknown) => void } }).to = (
        room: string
      ) => ({
        emit(event: string, _payload: unknown) {
          emittedRoom = room;
          emittedEvent = event;
          emittedAt = performance.now();
        },
      });

      const start = performance.now();
      const res = createMockResponse();
      await sendMessage(
        { params: { id: "u-2" }, user: { _id: "u-1" }, body: { text: "ping" } } as never,
        res as never
      );

      assert.equal(res.statusCode, 201);
      assert.equal(emittedRoom, "socket-user-2");
      assert.equal(emittedEvent, "newMessage");
      assert.ok(emittedAt > 0, "newMessage was not emitted");

      const deliveryMs = emittedAt - start;
      assert.ok(deliveryMs <= 50, `message delivery emit latency ${deliveryMs.toFixed(2)}ms exceeded 50ms`);
    } finally {
      Message.create = originalMessageCreate;
      Message.findById = originalFindById;
      Conversation.findOneAndUpdate = originalConversationFindOneAndUpdate;
      (io as unknown as { to: typeof originalIoTo }).to = originalIoTo;
      if (handlers.disconnect) handlers.disconnect();
    }
  }

  const signupLatency = await sampleLatency("signup validation", 50, 15, async () => {
    const res = createMockResponse();
    await signup({ body: {} } as never, res as never);
    assert.equal(res.statusCode, 400);
  });

  const getMessagesLatency = await sampleLatency("getMessages unauthorized", 50, 15, async () => {
    const res = createMockResponse();
    await getMessages({ params: { id: "u-2" }, user: undefined } as never, res as never);
    assert.equal(res.statusCode, 401);
  });

  const sendMessageLatency = await sampleLatency("sendMessage unauthorized", 50, 15, async () => {
    const res = createMockResponse();
    await sendMessage(
      { params: { id: "u-2" }, user: undefined, body: { text: "hello" } } as never,
      res as never
    );
    assert.equal(res.statusCode, 401);
  });

  console.log(
    `chat system + latency tests passed (avg ms): signup=${signupLatency.toFixed(2)}, getMessages=${getMessagesLatency.toFixed(2)}, sendMessage=${sendMessageLatency.toFixed(2)}`
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
