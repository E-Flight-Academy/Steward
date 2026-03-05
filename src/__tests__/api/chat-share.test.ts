import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock kv-cache before importing the route
const mockSetKvSharedChat = vi.fn();
vi.mock("@/lib/kv-cache", () => ({
  setKvSharedChat: (...args: unknown[]) => mockSetKvSharedChat(...args),
}));

import { POST } from "@/app/api/chat/share/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/chat/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with id when Redis write succeeds", async () => {
    mockSetKvSharedChat.mockResolvedValue(true);

    const res = await POST(makeRequest({
      messages: [{ role: "user", content: "Hello" }, { role: "assistant", content: "Hi!" }],
      lang: "en",
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe("string");
    expect(mockSetKvSharedChat).toHaveBeenCalledOnce();
  });

  it("saves messages with only role and content", async () => {
    mockSetKvSharedChat.mockResolvedValue(true);

    await POST(makeRequest({
      messages: [{ role: "user", content: "Test" }],
    }));

    const savedData = mockSetKvSharedChat.mock.calls[0][1];
    expect(savedData.messages).toEqual([{ role: "user", content: "Test" }]);
    expect(savedData.lang).toBe("en");
    expect(savedData.sharedAt).toBeGreaterThan(0);
  });

  it("returns 500 when Redis write fails", async () => {
    mockSetKvSharedChat.mockResolvedValue(false);

    const res = await POST(makeRequest({
      messages: [{ role: "user", content: "Hello" }],
    }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Failed to save");
  });

  it("returns 400 for empty messages array", async () => {
    const res = await POST(makeRequest({ messages: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing messages", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid role", async () => {
    const res = await POST(makeRequest({
      messages: [{ role: "system", content: "Hello" }],
    }));
    expect(res.status).toBe(400);
  });

  it("preserves flowContext and flowPhase", async () => {
    mockSetKvSharedChat.mockResolvedValue(true);

    await POST(makeRequest({
      messages: [{ role: "user", content: "Hi" }],
      flowContext: { interest: "training" },
      flowPhase: "completed",
      currentFlowStepName: "step1",
    }));

    const savedData = mockSetKvSharedChat.mock.calls[0][1];
    expect(savedData.flowContext).toEqual({ interest: "training" });
    expect(savedData.flowPhase).toBe("completed");
    expect(savedData.currentFlowStepName).toBe("step1");
  });

  it("defaults lang to 'en' when not provided", async () => {
    mockSetKvSharedChat.mockResolvedValue(true);

    await POST(makeRequest({
      messages: [{ role: "user", content: "Hallo" }],
    }));

    const savedData = mockSetKvSharedChat.mock.calls[0][1];
    expect(savedData.lang).toBe("en");
  });
});
