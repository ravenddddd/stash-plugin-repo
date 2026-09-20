# Stash plugin repository

Built Stash plugins, and the index Stash's plugin manager reads.

**The source URL to paste into Stash** (Settings → Plugins → Available Plugins →
Add Source):

```
https://ravenddddd.github.io/stash-plugin-repo/index.yml
```

## What is in here

| | |
|---|---|
| `plugins/<id>/` | One directory per plugin, as built. **Packaging input, not source** |
| `tools/publish.mjs` | Packages them and writes `index.yml` |
| `_site/` | The packaged result (`<id>.zip` + `index.yml`); published to `gh-pages`, not committed |
| `.github/workflows/publish.yml` | Builds the plugins from their own repositories and publishes |

## This repository holds no source

Each directory under `plugins/` arrived from a plugin's own repository, built
there and staged here. Editing one works until the next run, and then quietly
disappears — the workflow replaces the whole directory every time. To change a
plugin, change its source and let this rebuild:

| Plugin | Source |
|---|---|
| external-player-launcher | https://github.com/ravenddddd/external-player-launcher (a fork of [esumaka's](https://github.com/esumaka/external-player-launcher)) |

## How a plugin gets published

**Publishing is asked for, not automatic.** The workflow builds the source
repositories **here**, rather than having them push their output across, and that
direction is about credentials: nothing needs a token that can write to another
repository. The sources are public, so reading them needs no credential, and
writing here needs only the `GITHUB_TOKEN` every workflow already has.

The other side of that coin: GitHub has no way for one repository's push to start
another's workflow without a stored credential — and that credential would be able
to write packages into the index Stash installs from. So a publish is a deliberate
act, from the Actions tab (**Publish plugins → Run workflow**) or:

```bash
gh workflow run publish.yml -R ravenddddd/stash-plugin-repo
```

The run builds whatever the sources are at that moment, so publishing a change
means: push the change to its source repository, then ask for a publish.

The version written into the index — and into the manifest **inside** the zip —
is `<version from the plugin's manifest>-<short source commit>`. The two have to
agree, because Stash decides whether an update is available by comparing the
installed plugin's version with the index's.

**A working copy of this repository is behind after every publish**, because the
run commits the built plugin back to `main`. Pull before pushing anything here —
the workflows it would otherwise conflict with are only its own.

## Licences

A plugin's licence is its own and travels with it: the packaged directory carries
the licence file from its source repository.

**`external-player-launcher` says two different things** — its `LICENCE` file is
MIT (which is what GitHub reports, and what is shipped here), while its
`package.json` declares `MPL-2.0`. Worth asking upstream about; either way this
fork is public and its changes are visible, which satisfies both.
