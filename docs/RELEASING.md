# Packaging and publication

Status checked September 25, 2026: `npm view ditherto` returned 404, and this machine was not authenticated to npm. That makes the name a candidate, not a reservation or guarantee that publication will be accepted. The package is prepared as `ditherto@0.1.0`; no npm publication has been performed.

## What is ready

- ESM and CommonJS entries with matching TypeScript declarations: `ditherto`, `ditherto/browser`, `ditherto/dom`, `ditherto/node`.
- The `ditherto` CLI, MIT license, visual README and a restricted package file list.
- `prepack` rebuilds the distribution before packing. `npm pack` produces `ditherto-0.1.0.tgz`.
- Package verification covers exports, declarations, CLI behavior, browser dependency isolation and gzip budgets.
- Browser entries contain no native imports. Node decoding/PNG encoding uses the existing `@napi-rs/canvas` dependency and its platform binaries; tarball size does not include installed dependency size.
- The `Release package` workflow builds and tests on demand and uploads a tarball. Its `publish` input defaults to false. Tagging alone does not publish.

## Try the archive as a consumer

```sh
npm ci
npm run typecheck
npm run lint
npm run test:ci
npm run test:package
npm pack
# In a separate project:
npm install /absolute/path/to/ditherto-0.1.0.tgz
npx ditherto input.jpg -o output.png --palette MONO_BLUE --json
```

Inspect the archive before publishing: `npm pack --dry-run`. It should contain only `dist/`, `package.json`, `README.md` and `LICENSE`, not photos, tests, site assets or development scripts. README images use absolute GitHub URLs so the package stays small.

## First npm publication

The account owner needs an npm account with the package name available and an authenticated publishing session. [npm's first-publication guide](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/) covers account setup and two-factor authentication.

1. Review the package and choose the release version. Update both package files with `npm version <version> --no-git-tag-version` if changing it, then commit the release changes.
2. Authenticate interactively with `npm login`; keep credentials and one-time codes out of chat and repository files.
3. Run the checks above and publish deliberately with `npm publish --access public`. This is the actual public-release step; it has not been run by this preparation task.
4. Verify `npm view ditherto version` and try `npx --yes ditherto@0.1.0 --help` from a separate directory (use the version actually released).
5. Remove the preview/unpublished notices from the README, homepage and playground CLI help. Create a matching GitHub release with the tested tarball if desired.

## Subsequent releases via GitHub

Configure an npm trusted publisher for the package: GitHub user `jcinis`, repository `ditherto`, workflow `release.yml`, no environment restriction unless one is added to the workflow. Permit direct `npm publish` if using its publish option. The workflow uses Node 24, npm 11 and `id-token: write`; no persistent npm token is required. Run `Release package` on the intended ref with publishing enabled only after the version is updated. [npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

## Other distribution options

**Start with npm.** It fits the CLI, Node/native image adapter and browser bundler consumers in one package. Direct ESM browser files are also available in the Pages site's `dist/` directory; users can self-host the built files. Pages URLs track the latest deployment, so pin or self-host a release for reproducible production use.

[JSR](https://jsr.io/docs/introduction) is worth revisiting for a separate browser-focused entry if users ask for it. Its TypeScript/ESM distribution model would require separate packaging and compatibility testing; it adds work without replacing the Node CLI's npm path. Do not claim Deno/Bun/native-platform support until verified on those runtimes. A scoped npm name such as `@jcinis/ditherto` is a fallback only if that npm scope is owned and the unscoped name is unavailable; it would require updating install examples.

## GitHub Pages

`npm run build:site` creates `_site/` using relative links so it works at `/ditherto/`. The Pages workflow deploys `main` through GitHub Actions. Both playgrounds share the built browser bundles and a small, credited sample-photo corpus. The homepage has no application framework or runtime dependency. Run `npm run assets:site` when intentionally refreshing the generated documentation pictures.

## Preparation checks

The preparation run passed 259 unit tests, package verification, and 84 tests across Chromium, Firefox and WebKit. A separate project installed the actual tarball and exercised its CLI, Node encoder and imports. The built site was also served under `/ditherto/` to check both workers, sample photos, navigation and resize rendering.

One earlier local WebKit run read a blank source image in the existing DOM refresh test. It did not recur in 20 targeted runs or the subsequent full suite. Its cause is not established; no speculative decoding change or automatic test retry was added. Keep this observation in view during Safari testing before the public npm launch.
