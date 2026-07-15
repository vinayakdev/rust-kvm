import { execFile } from "node:child_process";
import { networkInterfaces } from "node:os";
import { promisify } from "node:util";
import dns from "node:dns/promises";

const execFileAsync = promisify(execFile);

export interface LocalMachine {
  ipv4: string | null;
  mac: string | null;
}

export interface NetworkDevice {
  ip: string;
  mac: string | null;
  hostname: string | null;
}

export function localMachine(): LocalMachine {
  const ifaces = networkInterfaces();
  for (const entries of Object.values(ifaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.internal) continue;
      if (entry.family === "IPv4") {
        return { ipv4: entry.address, mac: entry.mac || null };
      }
    }
  }
  return { ipv4: null, mac: null };
}

const ARP_LINE = /^(\S+)\s+\(([\d.]+)\)\s+at\s+([0-9a-fA-F:]+)/;

function isRealIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local
  if (a >= 224) return false; // multicast/reserved
  return true;
}

async function resolveHostname(ip: string): Promise<string | null> {
  try {
    const names = await dns.reverse(ip);
    return names[0] ?? null;
  } catch {
    return null;
  }
}

export async function networkNeighbors(): Promise<NetworkDevice[]> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("arp", ["-a"]));
  } catch {
    return [];
  }

  const raw = stdout
    .split("\n")
    .map((line) => ARP_LINE.exec(line.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ hostname: m[1]!, ip: m[2]!, mac: m[3]! }))
    .filter((d) => isRealIpv4(d.ip));

  const seen = new Set<string>();
  const devices: NetworkDevice[] = [];
  for (const d of raw) {
    if (seen.has(d.ip)) continue;
    seen.add(d.ip);
    devices.push({
      ip: d.ip,
      mac: d.mac === "(incomplete)" ? null : d.mac,
      hostname: d.hostname === "?" ? null : d.hostname,
    });
  }

  await Promise.all(
    devices
      .filter((d) => !d.hostname)
      .map(async (d) => {
        d.hostname = await resolveHostname(d.ip);
      }),
  );

  devices.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
  return devices;
}
