import { describe, it, expect } from "vitest";
import { normalizeSeoSlug, isValidSlugShape } from "./seoSlug";

describe("normalizeSeoSlug", () => {
  it("trims and lowercases", () => {
    expect(normalizeSeoSlug("  /Marketplace  ")).toBe("/marketplace");
  });
  it("adds leading slash", () => {
    expect(normalizeSeoSlug("about")).toBe("/about");
  });
  it("strips invalid chars", () => {
    expect(normalizeSeoSlug("/blog/Hello World!?")).toBe("/blog/helloworld");
  });
  it("collapses multiple slashes", () => {
    expect(normalizeSeoSlug("//a///b")).toBe("/a/b");
  });
  it("removes trailing slash", () => {
    expect(normalizeSeoSlug("/foo/")).toBe("/foo");
  });
  it("keeps root as /", () => {
    expect(normalizeSeoSlug("/")).toBe("/");
  });
  it("preserves __global__", () => {
    expect(normalizeSeoSlug("__global__")).toBe("__global__");
  });
  it("validates shape", () => {
    expect(isValidSlugShape("/foo-bar")).toBe(true);
    expect(isValidSlugShape("/Foo Bar")).toBe(true); // normalized first → /foobar
    expect(isValidSlugShape("")).toBe(false);
  });
});
