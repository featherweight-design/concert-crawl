// Vercel function for every API route except /v1/internal/cron/* (see
// vercel.json). It re-exports the compiled entry rather than the TypeScript
// source, so Vercel serves the same `tsc` output Render ran, built by the
// project's build command (`turbo build` for the API and its workspace deps).
export * from '../dist/vercel.js'
