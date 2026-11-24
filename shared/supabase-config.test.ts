import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  DEFAULT_SUPABASE_URL,
  resolveSupabaseConfig,
} from "./supabase-config";

describe("resolveSupabaseConfig", () => {
  it("uses the shared default project and public key when runtime variables are absent", () => {
    expect(resolveSupabaseConfig({})).toEqual({
      supabaseUrl: DEFAULT_SUPABASE_URL,
      supabasePublicKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    });
  });

  it("prefers explicitly configured project credentials", () => {
    expect(
      resolveSupabaseConfig({
        SUPABASE_URL: "https://custom-project.supabase.co/",
        SUPABASE_ANON_KEY: "custom-public-key",
      })
    ).toEqual({
      supabaseUrl: "https://custom-project.supabase.co",
      supabasePublicKey: "custom-public-key",
    });
  });

  it("does not pair the default public key with a different project", () => {
    expect(
      resolveSupabaseConfig({
        SUPABASE_URL: "https://custom-project.supabase.co",
      })
    ).toEqual({
      supabaseUrl: "https://custom-project.supabase.co",
      supabasePublicKey: "",
    });
  });
});
