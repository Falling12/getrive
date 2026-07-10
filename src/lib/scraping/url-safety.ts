import dns from "node:dns/promises";
import net from "node:net";

// This module exists because the onboarding "prefill from URL" feature fetches
// an arbitrary founder-supplied URL from the server — the textbook SSRF
// shape (attacker-controlled URL → server-side fetch → could reach internal
// services, cloud metadata endpoints, etc). Every hostname that's actually
// dialed (the original URL AND every redirect hop — see fetch-page.ts) must
// go through assertPublicHttpUrl first.
export class UnsafeUrlError extends Error {}

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return false;
}

function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) return isPrivateIpv4(address);
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fe80")) return true; // link-local
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
    // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) — check the embedded IPv4.
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIpv4(mapped[1]);
    return false;
  }
  return true;
}

// Validates protocol + resolves the hostname to confirm it's a public
// address, throwing UnsafeUrlError otherwise. Returns the parsed URL so
// callers don't need to re-parse it.
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http:// and https:// URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeUrlError("That URL can't be fetched.");
  }

  // A literal IP in the URL still needs the same check as a resolved one.
  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new UnsafeUrlError("That URL can't be fetched.");
  }

  let addresses: string[];
  try {
    addresses = (await dns.lookup(hostname, { all: true })).map((entry) => entry.address);
  } catch {
    throw new UnsafeUrlError("Couldn't resolve that URL's host.");
  }

  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new UnsafeUrlError("That URL can't be fetched.");
  }

  return url;
}
