#!/usr/bin/env node
/**
 * Packages every plugin under plugins/ and writes Stash's package index.
 *
 * Output lands in _site/, which the workflow publishes to the gh-pages branch:
 *
 *   _site/<pluginId>.zip   One zip per plugin, with the files **flat** inside
 *                          (no wrapping directory).
 *   _site/index.yml        Stash's package manifest — the "source URL" typed
 *                          into Stash's plugin manager points at this file.
 *
 * THIS REPOSITORY HOLDS BUILT PLUGINS, NOT SOURCES. Each directory under
 * plugins/ arrived from a plugin's own repository (see the workflow) and is a
 * packaging input and nothing else: to change a plugin, change its source
 * repository and let this rebuild. Editing here works until the next run, and
 * then quietly disappears.
 *
 * The zipping is delegated to the system `zip`, the way the monorepo's build
 * does it: it is present on the GitHub Actions runner, and writing a zip in pure
 * Node is a lot of code for something a command does.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLUGINS_DIR = path.join(ROOT, "plugins");
const OUT_DIR = path.join(ROOT, "_site");

/**
 * The commit the source repository was at, or "" when this is run by hand.
 *
 * It is appended to the version, which is what makes a published package
 * traceable back to a commit — and, more practically, what makes Stash notice an
 * update at all: without a new version string, a rebuilt package with the same
 * version is invisible to it.
 */
const SOURCE_SHA = process.env.SOURCE_SHA || "";

/** Reads a top-level `<key>: <value>` from a manifest, value unquoted. */
function topLevel(text, key) {
  const m = new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(text);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
}

/** Every directory under plugins/, in name order. */
function pluginDirs() {
  if (!fs.existsSync(PLUGINS_DIR)) return [];

  return fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/**
 * One plugin, packaged.
 *
 * The manifest inside the zip is written with the *full* version, and the index
 * says the same thing. The two have to agree: Stash compares the installed
 * plugin's version against the index's to decide whether an update is available,
 * so a package whose manifest says one version and an index that says another
 * reports an update forever.
 */
function publishPlugin(id) {
  const dir = path.join(PLUGINS_DIR, id);
  const ymlName = `${id}.yml`;
  const ymlPath = path.join(dir, ymlName);

  if (!fs.existsSync(ymlPath)) {
    throw new Error(
      `plugins/${id}: no ${ymlName} — a plugin's ID comes from its manifest's ` +
        `file name, so a directory without one cannot be published`
    );
  }

  const ymlText = fs.readFileSync(ymlPath, "utf8").replace(/\r\n/g, "\n");
  const baseVersion = topLevel(ymlText, "version");
  if (!baseVersion) {
    throw new Error(`plugins/${id}/${ymlName}: missing top-level version`);
  }

  const version = SOURCE_SHA ? `${baseVersion}-${SOURCE_SHA}` : baseVersion;

  // Staged in a temporary directory because the manifest has to be rewritten on
  // the way into the zip, and the copy under plugins/ is what the source
  // repository produced — it stays as it arrived.
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), `publish-${id}-`));
  try {
    fs.cpSync(dir, stage, { recursive: true });
    fs.writeFileSync(
      path.join(stage, ymlName),
      ymlText.replace(/^version:.*$/m, `version: ${version}`)
    );

    const zipPath = path.join(OUT_DIR, `${id}.zip`);
    execFileSync("zip", ["-r", "-q", zipPath, "."], { cwd: stage });

    return {
      id,
      name: topLevel(ymlText, "name") || id,
      description: topLevel(ymlText, "description") || "",
      version,
      path: `${id}.zip`,
      sha256: createHash("sha256").update(fs.readFileSync(zipPath)).digest("hex"),
    };
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const ids = pluginDirs();
  if (ids.length === 0) {
    throw new Error("no plugin directories under plugins/ — nothing to publish");
  }

  // A fixed date string, so two runs over the same plugins produce the same
  // index: the file is committed, and a diff that only means "the clock moved"
  // is noise in the history. The date is when this packaging ran, which is what
  // Stash shows as the plugin's date.
  const date = new Date().toISOString().replace("T", " ").slice(0, 19);

  const index = ids.map((id) => {
    const entry = publishPlugin(id);
    console.log(`  ${entry.id}  ${entry.version}  ${entry.sha256.slice(0, 12)}…`);

    return [
      `- id: ${entry.id}`,
      `  name: ${entry.name}`,
      "  metadata:",
      `    description: ${entry.description}`,
      `  version: ${entry.version}`,
      `  date: ${date}`,
      `  path: ${entry.path}`,
      `  sha256: ${entry.sha256}`,
      "",
    ].join("\n");
  });

  fs.writeFileSync(path.join(OUT_DIR, "index.yml"), index.join("\n"));
  console.log(`\nWrote ${OUT_DIR}/index.yml with ${ids.length} plugin(s)`);
}

try {
  main();
} catch (e) {
  console.error(`publish failed: ${e.message}`);
  process.exitCode = 1;
}
