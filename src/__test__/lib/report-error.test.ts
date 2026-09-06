import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportError, __resetErrorReportThrottle } from "@/lib/report-error";

const SLACK_URL = "https://hooks.slack.com/services/T000/B000/xxxx";
const DISCORD_URL = "https://discord.com/api/webhooks/123/abc";

describe("reportError", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let fetchMock: ReturnType<typeof vi.fn>;
    const originalWebhookUrl = process.env.ERROR_WEBHOOK_URL;

    beforeEach(() => {
        __resetErrorReportThrottle();
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal("fetch", fetchMock);
        delete process.env.ERROR_WEBHOOK_URL;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        if (originalWebhookUrl === undefined) {
            delete process.env.ERROR_WEBHOOK_URL;
        } else {
            process.env.ERROR_WEBHOOK_URL = originalWebhookUrl;
        }
    });

    function lastLoggedPayload() {
        const call = consoleErrorSpy.mock.calls.at(-1);
        return JSON.parse(call?.[0] as string);
    }

    function lastWebhookBody() {
        const call = fetchMock.mock.calls.at(-1);
        return JSON.parse((call?.[1] as RequestInit).body as string);
    }

    it("構造化JSONでログに残す", () => {
        reportError(new Error("boom"), { scope: "createPost", postId: 42 });

        const payload = lastLoggedPayload();
        expect(payload.level).toBe("error");
        expect(payload.scope).toBe("createPost");
        expect(payload.postId).toBe(42);
        expect(payload.error.name).toBe("Error");
        expect(payload.error.message).toBe("boom");
    });

    it("ERROR_WEBHOOK_URL が未設定なら通知しない", () => {
        reportError(new Error("boom"), { scope: "createPost" });

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("Slack互換のWebhookには text で送る", () => {
        process.env.ERROR_WEBHOOK_URL = SLACK_URL;
        reportError(new Error("boom"), { scope: "createPost", postId: 7 });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = lastWebhookBody();
        expect(body.text).toContain("createPost");
        expect(body.text).toContain("boom");
        expect(body.text).toContain("postId=7");
        expect(body.content).toBeUndefined();
    });

    it("Discord のWebhookには content で送る", () => {
        process.env.ERROR_WEBHOOK_URL = DISCORD_URL;
        reportError(new Error("boom"), { scope: "createPost" });

        const body = lastWebhookBody();
        expect(body.content).toContain("createPost");
        expect(body.text).toBeUndefined();
    });

    it("同じエラーの連投は間引く", () => {
        process.env.ERROR_WEBHOOK_URL = SLACK_URL;
        reportError(new Error("boom"), { scope: "createPost" });
        reportError(new Error("boom"), { scope: "createPost" });
        reportError(new Error("boom"), { scope: "createPost" });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        // ログ側は間引かない (Vercelのログには全件残す)
        expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
    });

    it("scope が違えば別のエラーとして通知する", () => {
        process.env.ERROR_WEBHOOK_URL = SLACK_URL;
        reportError(new Error("boom"), { scope: "createPost" });
        reportError(new Error("boom"), { scope: "deletePost" });

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("Webhook が失敗しても例外を投げない", async () => {
        process.env.ERROR_WEBHOOK_URL = SLACK_URL;
        fetchMock.mockRejectedValue(new Error("network down"));

        expect(() => reportError(new Error("boom"), { scope: "createPost" })).not.toThrow();
        // 未処理の rejection が残らないことを確認する
        await Promise.resolve();
    });

    it("Error 以外が throw されても記録する", () => {
        reportError("文字列のthrow", { scope: "legacy" });
        expect(lastLoggedPayload().error.message).toBe("文字列のthrow");

        reportError({ code: 500 }, { scope: "legacy" });
        expect(lastLoggedPayload().error.name).toBe("UnknownError");
    });

    it("長いメッセージは切り詰める", () => {
        reportError(new Error("x".repeat(2000)), { scope: "createPost" });
        expect(lastLoggedPayload().error.message.length).toBeLessThanOrEqual(501);
    });

    it("scope 以外の undefined な context は通知本文に出さない", () => {
        process.env.ERROR_WEBHOOK_URL = SLACK_URL;
        reportError(new Error("boom"), { scope: "createPost", petId: undefined });

        expect(lastWebhookBody().text).not.toContain("petId");
    });
});
