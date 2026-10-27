// dsh-memo-local — host half.
//
// Intentionally empty: the memo store, panel, and reminder timer live in the
// browser half. This half exists only because the loader resolves the package
// main; it must never throw, because a throwing host plugin can abort DSH boot.
export const name = 'dsh-memo-local'
export const inject = []
export function apply(ctx) {}
