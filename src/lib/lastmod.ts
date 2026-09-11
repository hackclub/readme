import { execFileSync } from "node:child_process";

function git(args: string[]): string | undefined {
  try {
    const out = execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

export function lastModified(file: string, fallback: Date = new Date()): string {
  return (
    git(["log", "-1", "--format=%cI", "--", file]) ??
    git(["log", "-1", "--format=%cI"]) ??
    fallback.toISOString()
  );
}
