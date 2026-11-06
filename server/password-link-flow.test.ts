import { describe, expect, it } from "vitest";
import { detectPasswordLinkFlow } from "../client/src/lib/password-link-flow";

describe("password link flow", () => {
  it("recognizes the app's explicit signup and recovery redirects", () => {
    expect(detectPasswordLinkFlow("?flow=create-password", "")).toBe("setup");
    expect(detectPasswordLinkFlow("?flow=password-recovery", "")).toBe("recovery");
  });

  it("recognizes PKCE callbacks even if no custom flow query survives", () => {
    expect(detectPasswordLinkFlow("?code=pkce-code", "")).toBe("setup");
    expect(detectPasswordLinkFlow("?flow=password-recovery&code=pkce-code", "")).toBe("recovery");
  });

  it("recognizes recovery tokens in query strings and fragments", () => {
    expect(detectPasswordLinkFlow("?type=recovery", "")).toBe("recovery");
    expect(detectPasswordLinkFlow("", "#access_token=token&type=recovery")).toBe("recovery");
  });

  it("recognizes email setup tokens and expired recovery links in fragments", () => {
    expect(detectPasswordLinkFlow("", "#access_token=token&type=magiclink")).toBe("setup");
    expect(detectPasswordLinkFlow("?error_code=otp_expired", "")).toBe("recovery");
  });

  it("does not classify an ordinary login URL as an auth callback", () => {
    expect(detectPasswordLinkFlow("?campaign=summer", "")).toBeNull();
    expect(detectPasswordLinkFlow("", "")).toBeNull();
  });
});
