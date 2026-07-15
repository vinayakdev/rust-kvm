# rust-kvm Roadmap

Headless cross-platform (Arch Linux + macOS) KVM: share keyboard/mouse/clipboard
between machines over LAN. TUI (ratatui + termcn look) frontend. Runs as
background daemon later; for now runs in foreground per machine.

Each phase = its own crate + its own commit(s). Phases build linearly on top
of each other. One agent per phase where useful.

## Phase 1 — Identity (this phase)
Crate: `kvm-identity`, `kvm-app`
- Auto-generate machine name (adjective+noun word combo, e.g. `silent-falcon`)
- Persist name to `~/.config/rust-kvm/identity.toml`
- TUI screen: show current name, local IP address(es), allow rename
- No networking between machines yet — just local identity + IP display

## Phase 2 — Protocol
Crate: `kvm-protocol`
- Shared message types (pairing, input events, clipboard events)
- Serialization (serde + bincode or JSON)

## Phase 3 — Discovery
Crate: `kvm-discovery`
- mDNS advertise + browse (`mdns-sd`)
- Machines see each other's name/IP on LAN automatically

## Phase 4 — Transport
Crate: `kvm-transport`
- WebSocket server/client (tokio-tungstenite) over TLS
- Pairing PIN flow, cert pinning after first trust

## Phase 5 — Input capture/inject
Crate: `kvm-input`
- Linux: evdev (capture) + uinput (inject)
- macOS: CGEventTap (capture) + CGEvent post (inject)
- Raw keycode passthrough (remap hook point, not implemented yet)

## Phase 6 — Switch model
Crate: `kvm-switch`
- Screen layout config (resolution + relative position per machine)
- Edge-of-screen seamless control handoff

## Phase 7 — Clipboard sync
Crate: `kvm-clipboard`
- Watch OS clipboard (arboard), push diffs over transport, apply remotely

## Phase 8 — Daemon wiring
Crate: `kvm-daemon`
- Wire phases 2-7 into one background process
- Foreground-first; systemd user unit (Arch) / launchd plist (Mac) is a later task

## Later / not scheduled yet
- Key remapping UI
- systemd/launchd install & background service management
- Multi-client (>2 machine) support
