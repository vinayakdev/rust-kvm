import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { WelcomeScreen } from "./components/welcome-screen.js";
import * as identity from "./lib/identity.js";
import { localMachine, networkNeighbors, type NetworkDevice } from "./lib/network.js";

const LOGO = "  ___\n / _ \\ ()\n| (_) |\n \\___/  ";

function padCol(value: string, width: number): string {
  return value.length >= width ? `${value} ` : value.padEnd(width);
}

function DeviceRow({ name, ip, mac, self }: { name: string; ip: string; mac: string; self?: boolean }) {
  return (
    <Text>
      <Text color={self ? "green" : "white"} bold={self}>
        {padCol(name, 18)}
      </Text>
      <Text dimColor>{padCol(ip, 16)}</Text>
      <Text dimColor>{mac}</Text>
      {self ? <Text color="green"> (this machine)</Text> : null}
    </Text>
  );
}

export function App() {
  const { exit } = useApp();
  const [name, setName] = useState(() => identity.loadOrCreate().name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [status, setStatus] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<NetworkDevice[]>([]);
  const [loadingNeighbors, setLoadingNeighbors] = useState(true);

  const machine = localMachine();

  useEffect(() => {
    networkNeighbors()
      .then(setNeighbors)
      .finally(() => setLoadingNeighbors(false));
  }, []);

  useInput((input, key) => {
    if (editing) return;
    if (input === "q") {
      exit();
      return;
    }
    if (input === "r") {
      setDraft(name);
      setEditing(true);
      setStatus(null);
    }
  });

  const submitRename = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setStatus("name cannot be empty");
      return;
    }
    identity.rename(trimmed);
    setName(trimmed);
    setEditing(false);
    setStatus("saved");
  };

  return (
    <Box flexDirection="column">
    <WelcomeScreen appName="rust-kvm" version="v0.1.0" borderStyle="round">
      <WelcomeScreen.Left>
        <WelcomeScreen.Logo>{LOGO}</WelcomeScreen.Logo>
        {editing ? (
          <Box>
            <Text color="yellow">new name: </Text>
            <TextInput value={draft} onChange={setDraft} onSubmit={submitRename} />
          </Box>
        ) : (
          <WelcomeScreen.Greeting>
            <Text>Welcome, </Text>
            <Text color="green" bold>{name}</Text>
          </WelcomeScreen.Greeting>
        )}
        <WelcomeScreen.Meta
          dim
          items={[
            `IPv4: ${machine.ipv4 ?? "unknown"}`,
            `MAC: ${machine.mac ?? "unknown"}`,
            `OS: ${process.platform}`,
          ]}
        />
      </WelcomeScreen.Left>
      <WelcomeScreen.Right>
        <WelcomeScreen.Section title="This machine">
          <DeviceRow self name={name} ip={machine.ipv4 ?? "-"} mac={machine.mac ?? "-"} />
        </WelcomeScreen.Section>
        <WelcomeScreen.Section title="Other devices on network">
          {loadingNeighbors ? (
            <Text dimColor>scanning ARP cache…</Text>
          ) : neighbors.length === 0 ? (
            <Text dimColor>none seen yet</Text>
          ) : (
            neighbors.map((d) => (
              <DeviceRow key={d.ip} name={d.hostname ?? "unknown"} ip={d.ip} mac={d.mac ?? "unknown"} />
            ))
          )}
        </WelcomeScreen.Section>
      </WelcomeScreen.Right>
    </WelcomeScreen>
    <Box marginTop={1}>
      <Text dimColor>
        {editing ? "enter: save   esc: cancel handled on submit" : "r: rename   q: quit"}
        {status ? `   [${status}]` : ""}
      </Text>
    </Box>
    </Box>
  );
}
