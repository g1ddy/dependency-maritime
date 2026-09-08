# Dependency-Cruiser 18 native metrics fixture

`native-metrics.json` is a checked-in projection of Dependency-Cruiser's native `--metrics` JSON
for the TypeScript files in `src/`. It was captured with Dependency-Cruiser 18.2.0 rather than
calculated by Maritime.

To reproduce the upstream output from this directory:

```bash
npx depcruise src --no-config --metrics --output-type json --output-to dependency-cruiser-output.json
```

The committed projection retains every native value used by the parity test: module dependencies,
dependents, and instability, plus folder afferent/efferent couplings and instability. Keeping the
projection small avoids recording environment-specific paths and transpiler discovery metadata.
