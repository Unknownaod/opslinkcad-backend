# OpsLink CAD Backend

Production backend for OpsLink CAD, built for deployment on Render with MongoDB Atlas.

## Security and platform rules
- MongoDB Atlas only (TLS, retryWrites, majority).
- Strict CORS allow-list only:
  - https://opslinkcad.com
  - https://safe.opslinksystems.xyz
- Cookie-based authentication (credentials required).
- Community isolation on all scoped data.
- RBAC enforced on protected routes.
- Immutable audit events with hash chaining.
- Evidence chain-of-custody append-only.

## Quick start (local build)
1. Install Node.js.
2. Copy .env.example to .env and fill values.
3. npm ci
4. npm run build
5. npm run render-start

## Render deployment steps
1. Create a new Render Web Service from this repository.
2. Set Environment Variables (from .env.example).
3. Build Command: npm ci && npm run build
4. Start Command: npm run render-start
5. Verify:
   - https://<service>.onrender.com/health
   - /metrics

## GitHub steps
1. git init
2. git add .
3. git commit -m "OpsLink CAD backend"
4. git remote add origin <repo>
5. git push -u origin main

## Default roles
- Community Owner
- Community Admin
- Dispatcher
- Officer
- Records
- Fire
- EMS
- Civilian

## Routes overview
- /auth/* authentication and sessions
- /communities/* multi-community core and configs
- /cad/* calls, units, BOLOs, bulletins, safety
- /rms/* stops, contacts, citations, arrests, incidents, cases
- /fireems/* fire/ems incidents, patient care summaries, transports
- /records/* people, vehicles, firearms (RP), properties, courts
- /evidence/* evidence + property + chain-of-custody
- /jail/* inmate roster and booking (RP)
- /civilian/* civilian services (mandatory)
- /reports/* reporting and exports (CSV/PDF)
- /ops/* health, metrics, webhooks
