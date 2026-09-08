# Real consumer verification

This record captures the reproducible external-repository acceptance evidence for Dependency-
Cruiser 18 support. Both consumers were tested from clean checkouts with the same immutable,
publishable Maritime package. The synthetic packed-consumer fixtures remain useful contract tests,
but they are not substitutes for this evidence.

## Immutable inputs

Verification was performed on 2026-09-08 with Node 24.15.0 and Graphviz 2.43.0.

| Input | Immutable identity |
| :--- | :--- |
| Maritime npm package | `@dependency-maritime/cli@0.1.0-beta.8` |
| npm tarball SHA-1 | `160ed56339a330cb97253f8392030b239a7f5b0e` |
| npm integrity | `sha512-NIUpEX8SG+kLVxaq9HHHI6XQI3ZX/l8zlA0CAKNYzC2AHvjtuckKYOnzMy/vtW2p9PccEhdXnWx8KiUi4DQpMw==` |
| Composite Action commit | `83dadbdc6718264060f82cad02197671abd76e29` (`cli-v0.1.0-beta.8`) |
| Catan Hex Mastery revision | `43389477cf1edc3fadeafe9c94b41dd3992f0ca2` |
| Crawler Command Interface revision | `274dc79f8d5ef4f0b3307325c744a4c928a6f150` |

The Action commit above resolves the same beta.8 package. The package identity can be checked without
trusting a mutable dist-tag:

```bash
npm view @dependency-maritime/cli@0.1.0-beta.8 version dist.integrity dist.shasum
```

## Catan Hex Mastery

The run used Catan's real `config/dependency-cruiser.maritime.cjs` architecture policy, required
complete ESLint measurement, validated the generated bundle, exercised Catan's own artifact
validator, and rendered both consumer graph profiles from that canonical bundle.

```bash
git clone https://github.com/g1ddy/catan-hex-mastery.git catan-hex-mastery
cd catan-hex-mastery
git checkout --detach 43389477cf1edc3fadeafe9c94b41dd3992f0ca2
npm ci
npm install --no-save @dependency-maritime/cli@0.1.0-beta.8
npx maritime analyze --source src --output .maritime \
  --depcruise-config config/dependency-cruiser.maritime.cjs --fail-on-unmeasured
npx maritime validate .maritime
npx maritime graph --input .maritime --output /tmp/catan-compact.svg \
  --graph-profile compact-architecture
npx maritime graph --input .maritime --output /tmp/catan-overview.svg \
  --graph-profile architecture-overview
npm run verify:maritime
test -s /tmp/catan-compact.svg && test -s /tmp/catan-overview.svg
```

Result: pass. Maritime validated 116 measured production files with health score 92; the compact and
overview SVG outputs were both non-empty, and Catan's repository-owned validator passed.

## Crawler Command Interface

Crawler has no Dependency-Cruiser configuration file at the pinned revision. This run deliberately
omitted `--depcruise-config`, thereby exercising Maritime's real config discovery and portable
fallback against both of Crawler's source roots. It then validated the complete bundle and rendered
the default inspection graph.

```bash
git clone https://github.com/g1ddy/crawler-command-interface.git crawler-command-interface
cd crawler-command-interface
git checkout --detach 274dc79f8d5ef4f0b3307325c744a4c928a6f150
npm ci
npm install --no-save @dependency-maritime/cli@0.1.0-beta.8
test -z "$(find . -maxdepth 2 -type f -name '*dependency-cruiser*' -print -quit)"
npx maritime analyze --source app --source src --output .maritime --fail-on-unmeasured
npx maritime validate .maritime
npx maritime graph --input .maritime --output /tmp/crawler-default.svg
test -s /tmp/crawler-default.svg
```

Result: pass. The analyzer reported `Dependency-Cruiser Config Source: fallback`, zero skipped or
unmeasured files, and 78 measured production files with health score 67. The bundle validated and
the default SVG output was non-empty. Crawler's older `npm run verify:maritime` helper intentionally
was not used as acceptance evidence because that revision hard-codes beta.4; the version-aware
`maritime validate` command from the immutable beta.8 package is the artifact-contract authority.
