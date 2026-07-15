import dgram from "node:dgram";

const PORT = 47823;
const BROADCAST_ADDR = "255.255.255.255";
const ANNOUNCE_INTERVAL_MS = 2000;
const PEER_TTL_MS = 8000;

interface Announcement {
  kind: "rust-kvm-announce";
  name: string;
  ip: string;
}

interface Peer {
  name: string;
  lastSeen: number;
}

export class Discovery {
  private socket: dgram.Socket | null = null;
  private announceTimer: ReturnType<typeof setInterval> | null = null;
  private peers = new Map<string, Peer>();

  start(name: string, ip: string | null): void {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    this.socket = socket;

    socket.on("message", (msg) => {
      let payload: Announcement;
      try {
        payload = JSON.parse(msg.toString("utf-8"));
      } catch {
        return;
      }
      if (payload.kind !== "rust-kvm-announce" || !payload.ip || !payload.name) return;
      this.peers.set(payload.ip, { name: payload.name, lastSeen: Date.now() });
    });

    socket.on("error", () => {
      // best-effort: discovery is a convenience layer over ARP/DNS fallback
    });

    socket.bind(PORT, () => {
      socket.setBroadcast(true);
      this.announceTimer = setInterval(() => this.announce(name, ip), ANNOUNCE_INTERVAL_MS);
      this.announce(name, ip);
    });
  }

  private announce(name: string, ip: string | null): void {
    if (!this.socket || !ip) return;
    const payload: Announcement = { kind: "rust-kvm-announce", name, ip };
    const buf = Buffer.from(JSON.stringify(payload), "utf-8");
    this.socket.send(buf, PORT, BROADCAST_ADDR);
  }

  nameFor(ip: string): string | null {
    const peer = this.peers.get(ip);
    if (!peer) return null;
    if (Date.now() - peer.lastSeen > PEER_TTL_MS) {
      this.peers.delete(ip);
      return null;
    }
    return peer.name;
  }

  stop(): void {
    if (this.announceTimer) clearInterval(this.announceTimer);
    this.socket?.close();
    this.socket = null;
    this.peers.clear();
  }
}
