# Tailscale API connection

The Member 1 frontend can connect to the shared ServiceFlow API at:

```text
https://desktop-mmb2fqe.tail980052.ts.net
```

Copy `.env.tailscale.example` to `.env.local` only after the API server allows browser requests from the Vite development server. Restart `npm.cmd run dev` after changing environment variables.

```env
VITE_API_BASE_URL=https://desktop-mmb2fqe.tail980052.ts.net
VITE_DEMO_MODE=true
VITE_USE_LIVE_API=true
```

`VITE_USE_LIVE_API=true` uses the real API for authentication, provider discovery, provider details and client service requests. Quotations, jobs, invoices, reviews, disputes, policy AI and client-profile updates remain sample functionality until their backend routes are provided.

## API server work

The FastAPI server needs CORS support for the local frontend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

The endpoint must remain reachable while both computers are connected to the same Tailscale network. Check it with:

```powershell
Invoke-RestMethod "https://desktop-mmb2fqe.tail980052.ts.net/health"
```

## Current API contract

The adapter maps the available paths:

- `POST /auth/register`, `/auth/register/company`, `/auth/login`, `GET /auth/me` and `POST /auth/change-password`
- `GET /providers`, `GET /providers/{id}` and `GET /services`
- `GET/POST /requests`, `GET /requests/{id}` and `POST /requests/{id}/cancel`

The public request form sends `provider_id`, `service_id`, description, preferred date/time, address, latitude and longitude. The current backend has no request-photo upload endpoint, so photo controls are disabled during live connection.

At the time this adapter was prepared, the API returned company providers but no catalog services or provider offerings. A provider manager must create active services and offerings before users can send a real request. The profile shows a clear empty state until then.
