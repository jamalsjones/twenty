import { type ImportOptions, importFramework } from './lib/ciso-library';

// Usage: yarn import-framework <library.yaml> [STANDARD|REGULATION|QUESTIONNAIRE]
// Library file names are listed in CISO Assistant under backend/library/libraries.
const [fileName, kind] = process.argv.slice(2);

if (!fileName) {
  throw new Error(
    'Pass a CISO Assistant library file name, e.g. pcidss-4_0.yaml',
  );
}

importFramework(fileName, { kind: kind as ImportOptions['kind'] }).catch(
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
