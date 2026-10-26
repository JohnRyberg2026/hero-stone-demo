# Combined application and avatar verification

From the repository root:

```sh
node tools/check-avatar-release.cjs
```

This runs the existing application's current component suite list, then the avatar voice and motion suites. The application runner remains authoritative and is not duplicated or modified.

For DOM and browser checks, install pinned tools outside the source tree:

```sh
npm install --prefix /tmp/avatar-browser --no-package-lock playwright@1.61.1 jsdom@26.1.0
/tmp/avatar-browser/node_modules/.bin/playwright install --only-shell chromium
NODE_PATH=/tmp/avatar-browser/node_modules node tools/check-avatar-release.cjs --dom
```

Serve the checkout on localhost port 8765 in another terminal. Then run:

```sh
NODE_PATH=/tmp/avatar-browser/node_modules node tools/check-avatar-release.cjs --browser-only
```

`--browser-only` runs the application's current browser list plus standalone avatar, separate welcome rehearsal, development welcome and public Story Book narration tests. `--browser` combines application components/browser tests with avatar components/browser tests; add `--dom` to also include the three DOM fixtures. Failed commands, missing dependencies and timeouts produce nonzero exit status. Unknown options are rejected.

These checks use fictional browser services and simulated speech. They do not establish audible phone/computer output, actual browser-cache eligibility, database installation or production readiness. No runner deploys, sends invitations or writes live account data.
