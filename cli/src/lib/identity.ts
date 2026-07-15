import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ADJECTIVES = [
  "silent", "amber", "rapid", "quiet", "bold", "cosmic", "lunar", "solar",
  "crimson", "azure", "hidden", "swift", "frozen", "golden", "iron",
  "shadow", "bright", "calm", "wild", "brave", "gentle", "sharp", "misty",
  "polar", "violet", "ember", "coral", "jade", "onyx", "ivory",
];

const NOUNS = [
  "falcon", "otter", "comet", "harbor", "canyon", "raven", "tundra",
  "ember", "glacier", "meadow", "wolf", "sparrow", "reef", "summit",
  "lantern", "orbit", "thicket", "delta", "prairie", "grove", "beacon",
  "nomad", "quartz", "willow", "cinder", "ridge", "tide", "spruce",
  "atlas", "cipher",
];

export interface Identity {
  name: string;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function generateName(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
}

function configDir(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
}

function configPath(): string {
  return join(configDir(), "rust-kvm", "identity.json");
}

export function loadOrCreate(): Identity {
  const path = configPath();
  if (existsSync(path)) {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as Identity;
  }
  const identity: Identity = { name: generateName() };
  save(identity);
  return identity;
}

export function save(identity: Identity): void {
  const path = configPath();
  mkdirSync(join(configDir(), "rust-kvm"), { recursive: true });
  writeFileSync(path, JSON.stringify(identity, null, 2));
}

export function rename(newName: string): Identity {
  const identity: Identity = { name: newName.trim() };
  save(identity);
  return identity;
}
