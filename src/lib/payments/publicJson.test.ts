// @vitest-environment node
import { expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isPublicAddress, publicJson } from "./publicJson";

test.each([
  "127.0.0.1",
  "10.0.0.1",
  "169.254.169.254",
  "192.168.1.1",
  "::1",
  "fc00::1",
  "::ffff:127.0.0.1",
  "0.0.0.0",
])("rejects non-public address %s", (address) => {
  expect(isPublicAddress(address)).toBe(false);
});
test.each(["1.1.1.1", "2606:4700:4700::1111"])(
  "accepts public address %s",
  (address) => {
    expect(isPublicAddress(address)).toBe(true);
  },
);
test.each([
  "http://example.com/pay",
  "https://127.0.0.1/pay",
  "https://[::1]/pay",
  "https://user:password@example.com/pay",
  "https://example.com:8443/pay",
])("rejects unsafe callback %s before connecting", (url) => {
  expect(() => publicJson(new URL(url))).toThrow();
});
