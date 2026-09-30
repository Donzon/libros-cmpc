#!/usr/bin/env node
// Arranca Vitest con la letra de unidad del cwd canonicalizada. Sin esto, un cwd como
// `c:\...` (el que entregan las terminales de algunos IDE en Windows) hace que cada
// archivo entre dos veces al mapa de cobertura y el total caiga por debajo del
// threshold. Ver docs/coverage.md. En Linux y macOS la normalizacion es un no-op.
//
// El cwd debe fijarse al lanzar el proceso: declarar `root` en vite.config.ts o llamar
// a `process.chdir()` no funciona, porque dejan `root` y `process.cwd()` con casings
// distintos y eso instancia dos runtimes de Vitest sin ninguna suite detectada.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toCanonicalPath = (path) =>
  path.replace(/^[a-z](?=:)/, (driveLetter) => driveLetter.toUpperCase());

const projectRoot = toCanonicalPath(
  fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, ''),
);

// El binario se normaliza por la misma razon: cargar Vitest desde un path con distinto
// casing que los archivos de test duplica su runtime.
const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve('vitest/package.json');
const vitestBin = toCanonicalPath(
  resolve(dirname(packageJsonPath), require(packageJsonPath).bin.vitest),
);

const { status, signal } = spawnSync(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (signal) {
  process.kill(process.pid, signal);
}

process.exit(status ?? 1);
