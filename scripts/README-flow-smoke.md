# PsicoPlanilhas Flow Handoff Smoke Test

Runs a production-safe smoke test for the Psico2 -> PsicoPlanilhas Flow activation handoff.

```bash
npm run smoke:flow
```

The script reads `.env` and `.env.local`; values already exported in the shell take precedence.

Required environment variables:

- `PSICO2_BASE_URL`: Psico2 app URL, for example `https://psico2.example.com` or `http://localhost:3000`.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PSICO2_SMOKE_EMAIL`: a dedicated active test user with Flow access.
- `PSICO2_SMOKE_PASSWORD`

Optional environment variables:

- `PSICO2_FLOW_EXPECTED_ORIGIN`: defaults to `https://flow.psicoplanilha.com`.
- `PSICO2_FLOW_SKIP_ACCESS_URL_FETCH=1`: skips the external reachability check for `products.access_url`.

What it checks:

- `products.slug = psicoplanilhas-flow` is active and has a non-placeholder `access_url`.
- The configured `access_url` origin matches the expected Flow origin and is reachable.
- Psico2 `/api/flow/generate-token` works for the smoke user.
- The generated activation URL is `Flow origin + /#activate=<64 lowercase hex token>`.
- The generated token is stored only as a hashed `flow_activation` token row.
- `/api/flow/validate-token` accepts the generated token, returns the smoke user email, exposes the expected restricted CORS headers, and rejects token replay.
- The consumed token row is marked used after validation.

The script does not edit products or grant access. It creates one activation token through the same Psico2 route the app uses, then consumes it through the Flow validation route. Use a dedicated smoke-test user only.
