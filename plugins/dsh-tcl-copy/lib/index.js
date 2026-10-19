// dsh-tcl-copy — host half.
//
// Intentionally empty: every behavior lives in the browser half (lib/client.js).
// This half exists only because the loader resolves the package `main`; a
// host plugin that throws would abort the whole harness boot, so this must stay
// a no-op that never throws.
export const name = 'dsh-tcl-copy'
export const inject = []
export function apply(ctx) {}
