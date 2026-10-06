# Administration integration

Account status is checked in server authentication and enforced by D1 guards. Storage quotas, upload enablement and UTF-8 persisted profile accounting are transactional. Default quotas remain unlimited. Anonymous hourly analytics contain no visitor identity or IP address.

Cloudflare Workers Builds must use `npm run build` followed by `npm run deploy:built`. The latter applies the committed D1 migrations before deploying and preserves existing runtime variables. A direct Wrangler deploy skips migrations and can break authentication when schema-dependent code changes.

The storage guards use `SELECT RAISE(...) WHERE ...` to remain compatible with Wrangler's migration statement parser. Verify migration changes with `wrangler d1 migrations apply DB --local --config wrangler.json` against a fresh disposable local database as well as SQLite accounting tests in the administration repository.
