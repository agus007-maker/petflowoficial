import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicAppUrl } from "./client";

describe("getPublicAppUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa la URL pública configurada y elimina la barra final", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://petflow.example.com/");
    expect(getPublicAppUrl()).toBe("https://petflow.example.com");
  });
});
