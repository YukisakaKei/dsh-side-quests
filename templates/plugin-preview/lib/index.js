// __PLUGIN_NAME__ — host half.
//
// Intentionally empty: the plugin behavior lives in the browser half.
// This half exists only because the loader resolves the package main; it must
// never throw, because a throwing host plugin can abort the whole DSH boot.
export const name = '__PLUGIN_NAME__'
export const inject = []
export function apply(ctx) {}
