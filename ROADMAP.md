# rust-kvm Roadmap

Headless cross-platform (Arch Linux + macOS) KVM: share keyboard/mouse/clipboard
between machines over LAN.

## Stack split

- `cli/` — Node + TypeScript + Ink + termcn-style components. User-facing TUI.
  Owns machine identity, pairing UX, status display.
- `crates/` — Rust workspace. OS-level daemon work only: input capture/inject
  (evdev/uinput, CGEvent), transport, background service. Starts mattering
  from phase 5 onward. `kvm-identity` already exists here for the daemon to
  reuse later (IPv4/neighbor detection); the CLI has its own JS copy of the
  identity logic for now since it doesn't talk to the daemon yet.

Both sides read/write the same `~/.config/rust-kvm/identity.json` so identity
stays consistent whichever process touches it first.

Each phase = its own package/crate + its own commit(s), linear on top of each
other.

## Phase 1 — Identity (done)
Package: `cli/`
- Auto-generate machine name (adjective+noun word combo, e.g. `azure-cipher`)
- Persist to `~/.config/rust-kvm/identity.json`
- TUI (Ink, termcn-style WelcomeScreen layout): own IPv4 + MAC + name in one
  row, other LAN devices (from ARP cache: IP/MAC/hostname) listed below,
  rename with `r`

## Phase 2 — Protocol
Shared message types (pairing, input events, clipboard events), used by both
`cli/` (to talk to the daemon once it exists) and `crates/`.

## Phase 3 — Discovery
mDNS advertise + browse so machines see each other's name/IP automatically
instead of relying on ARP cache guesses.

## Phase 4 — Transport
WebSocket server/client over TLS. Pairing PIN flow, cert pinning after first
trust. CLI drives pairing UX; daemon (or a Node process, TBD per phase) owns
the socket.

## Phase 5 — Input capture/inject
Crate: `kvm-input` (Rust, must be Rust — needs evdev/uinput/CGEvent)
- Linux: evdev (capture) + uinput (inject)
- macOS: CGEventTap (capture) + CGEvent post (inject)
- Raw keycode passthrough (remap hook point, not implemented yet)

## Phase 6 — Switch model
Screen layout config (resolution + relative position per machine), edge-of-
screen seamless control handoff.

## Phase 7 — Clipboard sync
Watch OS clipboard both sides, push diffs over transport, apply remotely.

## Phase 8 — Daemon wiring
Wire phases 2-7 into one background process (Rust). Foreground-first;
systemd user unit (Arch) / launchd plist (Mac) is a later task.

## Later / not scheduled yet
- Key remapping UI
- systemd/launchd install & background service management
- Multi-client (>2 machine) support
