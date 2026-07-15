import React from "react";
import { Box, Text } from "ink";

interface WelcomeScreenProps {
  appName: string;
  version?: string;
  borderStyle?: "round" | "single" | "double" | "classic";
  children: React.ReactNode;
}

function WelcomeScreen({ appName, version, borderStyle = "round", children }: WelcomeScreenProps) {
  return (
    <Box flexDirection="column" borderStyle={borderStyle} borderColor="cyan" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{appName}</Text>
        {version ? <Text dimColor>  {version}</Text> : null}
      </Box>
      <Box flexDirection="row" gap={2}>
        {children}
      </Box>
    </Box>
  );
}

function Left({ children }: { children: React.ReactNode }) {
  return (
    <Box flexDirection="column" width="40%">
      {children}
    </Box>
  );
}

function Right({ children }: { children: React.ReactNode }) {
  return (
    <Box flexDirection="column" width="60%">
      {children}
    </Box>
  );
}

function Logo({ children }: { children: string }) {
  return (
    <Box marginBottom={1}>
      <Text color="green">{children}</Text>
    </Box>
  );
}

function Greeting({ children }: { children: React.ReactNode }) {
  return (
    <Box marginBottom={1}>
      <Text bold>{children}</Text>
    </Box>
  );
}

function Meta({ items, dim = false }: { items: string[]; dim?: boolean }) {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Text key={i} dimColor={dim}>
          {item}
        </Text>
      ))}
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="yellow">{title}</Text>
      <Box flexDirection="column" paddingLeft={1}>
        {children}
      </Box>
    </Box>
  );
}

WelcomeScreen.Left = Left;
WelcomeScreen.Right = Right;
WelcomeScreen.Logo = Logo;
WelcomeScreen.Greeting = Greeting;
WelcomeScreen.Meta = Meta;
WelcomeScreen.Section = Section;

export { WelcomeScreen };
