# Popravime — Frontend Integration Requirements

This document is the functional contract between this backend and whatever frontend gets built
against it. It describes **what the frontend needs to do and support** — every screen/flow the
API surface implies, every request/response shape, every role-based behavior — without
prescribing *how* (no HTTP client, state manager, or framework choices; that's a separate
decision). Field names, status codes, and route paths below are read directly from the current
implementation, not recalled from memory — treat this as accurate to the running API.

## 1. Base conventions

- **Base URL**: whatever `PORT`/host the API is deployed on. No global path prefix — routes are
  flat (`/auth/login`, not `/api/auth/login`).
- **Content type**: `application/json` for all JSON bodies; `multipart/form-data` for the five
  file-upload endpoints (listed in §6).
- **Wire format is `snake_case`**, both directions. Every request body field and every response
  field uses `snake_case` (`business_name`, `city_id`, `created_at`, etc.) — this is enforced
  globally, not per-endpoint, so the frontend can rely on it uniformly. Internally the field
  might be named differently in this codebase; that's irrelevant to the frontend.
- **Auth header**: `Authorization: Bearer <access_token>` on every request to a non-public
  endpoint. Public endpoints (listed per-module below) work with or without this header — a few
  of them (direct inquiries, some listings) behave differently if it's present (see §3.1).
- **CORS**: the API allows cross-origin requests from whatever origins are configured
  server-side (`CORS_ORIGIN`); credentials mode is enabled, though auth is bearer-token-based,
  not cookie-based, so this only matters if the frontend ever needs to send cookies for some
  other reason.

### 1.1 Response envelope

Successful responses return the resource (or array/paginated-wrapper) directly — no wrapper
object. Errors always come back as:

```json
{
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable description",
    "statusCode": 404,
    "path": "/providers/abc-123",
    "timestamp": "2026-08-23T12:00:00.000Z"
  }
}
```

`code` is either a domain-specific string (e.g. `PROVIDER_NOT_OWNED`, `EMAIL_TAKEN`,
`INVALID_OFFER_TRANSITION`) for business-rule rejections, or `VALIDATION_ERROR` for a failed
request body (see below). **`message` is never meant to be shown to a user as-is — it's
English, unlocalized, log/debug text.** Every error carries a stable, translatable identifier
instead: `code` for business-rule rejections, and per-field `codes` (below) for validation
failures. Build the frontend's i18n error-message map keyed on these, with a generic fallback
string for any `code`/field-`code` it doesn't specifically handle yet.

**Validation errors** (`400`, `code: "VALIDATION_ERROR"`) additionally carry a structured
`fields` array — one entry per invalid field, each with the constraint(s) it failed as
translation keys:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email must be an email, password must be longer than or equal to 8 characters",
    "fields": [
      { "field": "email", "codes": ["IS_EMAIL"] },
      { "field": "password", "codes": ["MIN_LENGTH"] }
    ],
    "statusCode": 400,
    "path": "/auth/register",
    "timestamp": "2026-09-04T12:00:00.000Z"
  }
}
```

`field` is the request body's own `snake_case` field name. `codes` are the failed constraint
name(s) for that field in `SCREAMING_SNAKE_CASE` (`IS_EMAIL`, `MIN_LENGTH`, `IS_UUID`,
`MATCHES_FIELD`, etc.) — usually one per field, but a field can fail more than one rule at once,
so it's always an array. These are stable across the whole API (every DTO, every endpoint) since
they're derived mechanically from the validation rule itself, not hand-written per field — no
per-endpoint mapping table needed, just one `code → message` dictionary the frontend maintains
once. `message` is still present as a fallback/log string, same rule as above: don't show it.

### 1.2 Pagination

Any list endpoint that's paginated takes `?page=1&limit=20` query params (`limit` max 100,
`page` min 1, both optional, default 1/20) and returns:

```json
{
  "items": [ /* ... */ ],
  "total": 142,
  "page": 1,
  "limit": 20
}
```

Not every list endpoint is paginated — several (categories, cities, FAQ items, price estimates,
provider gallery) return a bare array since they're small, fully-cacheable reference/owned-scope
lists. Each endpoint below is marked paginated or not.

**Exception — `GET /providers`:** this one endpoint uses `data`/`count` instead of `items`/
`total` (`{data: [...], count: 142, page: 1, limit: 20}`). Every other paginated endpoint in this
API (repair requests, offers, reviews, notifications, etc.) still uses the `items`/`total` shape
above — don't generalize this rename, it's provider-list-specific.

### 1.3 Roles

Three roles exist: `customer`, `provider_owner`, `admin`. A user's role is fixed at
registration (`admin` cannot be self-registered — only seeded) and returned in every JWT and in
`GET /users/me`. The frontend needs role-aware routing/UI: what a `customer` sees, does, and can
navigate to is meaningfully different from a `provider_owner`, which is different again from
`admin` (see §8 for the concrete per-role breakdown).

## 2. Auth & session lifecycle

### 2.1 Endpoints

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/auth/register` | public | `{email, password, repeat_password, full_name, phone?, role}` — `repeat_password` must equal `password` (`400 VALIDATION_ERROR`, field `repeat_password` code `MATCHES_FIELD` otherwise); `role` must be `customer` or `provider_owner` (not `admin`). Response is `{email}`, **not tokens** — see §2.1.2 |
| POST | `/auth/confirm-email` | public | `{slug}` → `{access_token, refresh_token}` — see §2.1.2 |
| POST | `/auth/resend-confirmation` | public, throttled | `{email}` → `204 No Content` — see §2.1.2 |
| POST | `/auth/login` | public | `{email, password}` → `403 EMAIL_NOT_VERIFIED` if the account is a plain registration that hasn't confirmed yet (see §2.1.2) |
| POST | `/auth/refresh` | public* | `{refresh_token}` |
| POST | `/auth/logout` | public* | `{refresh_token}` |
| GET | `/auth/google` | public | browser navigation (not XHR) — redirects to Google's consent screen |
| GET | `/auth/google/callback` | public | Google redirects here; the backend then redirects the browser to `OAUTH_FRONTEND_REDIRECT_URL?code=...` (existing account) or `...?code=...&needs_role=1` (brand-new sign-up, see §2.1.1) |
| GET | `/auth/facebook` | public | same idea, Facebook |
| GET | `/auth/facebook/callback` | public | same idea, Facebook |
| POST | `/auth/oauth/exchange` | public | `{code}` → `{access_token, refresh_token}`, same shape as login — only for a code from a plain (no `needs_role`) redirect |
| POST | `/auth/oauth/complete` | public | `{code, role}` → `{access_token, refresh_token}` — only for a code from a `needs_role=1` redirect; `role` must be `customer` or `provider_owner` (not `admin`) |

*"public" here means no `Authorization` header is checked, but `/refresh` and `/logout` both
require a valid, unrevoked `refresh_token` in the JSON body — they're not truly anonymous.

`login`, `confirm-email`, and both OAuth completion endpoints return `{access_token,
refresh_token}`. **`register` does not** — a plain (non-OAuth) registration now requires
confirming the email address before the account can log in at all; see §2.1.2. OAuth sign-up
(`/auth/oauth/complete`) is unaffected — Google/Facebook already proved the email, so that path
still logs in immediately, same as before.

### 2.1.2 Email confirmation (plain registration only)

New as of this change — a plain (email/password) registration no longer auto-logs-in. OAuth
sign-up is untouched by any of this (always immediately verified).

1. `POST /auth/register` creates the account (`email_verified: false` internally) and emails a
   confirmation link, then returns `{email}` — no tokens. Show a "check your inbox" screen with
   that email echoed back, not a redirect into the app.
2. The email's link points at `{FRONTEND_URL}/confirm-email/:slug` — a frontend page needs to
   exist at that route. On mount, it should `POST /auth/confirm-email` with `{slug}` taken from
   the URL param. Two outcomes:
   - **Success** → `{access_token, refresh_token}`, same shape as login. Apply them exactly like
     any other login response (cookie, `/users/me`, redirect to role home) — the user lands
     signed in, no separate manual login step needed.
   - **Failure** → `404 EMAIL_CONFIRMATION_NOT_FOUND` (invalid slug, or already used — links are
     single-use) or `409 EMAIL_CONFIRMATION_EXPIRED` (valid slug, past its TTL). Either way, show
     an error state with a "resend confirmation email" affordance (see next point) rather than a
     bare error — don't distinguish the two states to the user beyond that, both need the same
     recovery action.
3. `POST /auth/resend-confirmation` with `{email}` issues a fresh link (invalidating any earlier
   still-outstanding one for that address) and emails it — `204` on success. Errors:
   `404 USER_NOT_FOUND` (no account with that email) or `409 EMAIL_ALREADY_VERIFIED` (nothing to
   resend). Surface this both from the confirm-email failure page (step 2) and from the login
   screen when `403 EMAIL_NOT_VERIFIED` comes back from `POST /auth/login` — that's the other
   moment a real user hits this: they registered, never clicked the link, and are now trying to
   log in normally.

### 2.1.1 Google/Facebook sign-in flow

This is a full-page redirect flow, not a JS SDK/popup integration — deliberately, so it reuses
the exact same token issuance and frontend cookie-setting path as email/password login instead
of a second parallel one. It forks in two depending on whether the Google/Facebook identity
matches an account that already exists.

1. Render "Continue with Google" / "Continue with Facebook" as plain links (not fetch calls) to
   `{NEXT_PUBLIC_API_URL}/auth/google` / `/auth/facebook`. Clicking navigates the whole page
   there; the backend redirects to the provider's consent screen.
2. After the user approves, the provider redirects back to the backend's own callback
   (`/auth/google/callback` etc — already registered with Google/Facebook, nothing for the
   frontend to configure). The backend then redirects the browser to
   `OAUTH_FRONTEND_REDIRECT_URL` (defaults to `http://localhost:3000/auth/callback` in dev —
   confirm the deployed value with ops) with a one-time `?code=` query param, in one of two
   shapes:
   - **Matched an existing account** (by a previously-linked Google/Facebook identity, or by
     email against a password-registered account — linking is automatic and transparent, no
     frontend involvement) → `?code=...`. Tokens are already issued.
   - **No match — this identity has never signed in here before** → `?code=...&needs_role=1`.
     No account has been created yet — the code only carries the verified name/email from
     Google/Facebook, not a session.
3. The frontend needs one route at that path (e.g. `app/auth/callback/page.tsx`) that branches
   on the `needs_role` param:
   - **Not present** (plain `?code=...`): do the same thing the existing `/api/auth/login` BFF
     handler does, except calling `POST /auth/oauth/exchange` with `{code}` instead of
     `/auth/login` — same `{access_token, refresh_token}` response, same cookie-setting, same
     redirect-to-role-home afterward.
   - **`needs_role=1`**: don't call `/oauth/exchange` (it will reject this code — wrong
     endpoint for it). Instead show a "How will you use Popravi Me?" screen — the same two
     choices as the existing registration role picker (`customer` "I need something fixed" /
     `provider_owner` "I repair devices"), no other fields needed (name/email already came from
     the provider). On submit, POST `{code, role}` to `/api/auth/oauth/complete` — a new BFF
     route mirroring `/api/auth/oauth/exchange`'s but hitting `POST /auth/oauth/complete`
     instead — which creates the account with the chosen role and returns
     `{access_token, refresh_token}`, same downstream handling (cookie, fetch `/users/me`,
     redirect to role home) as every other login path.
   In both cases: **the raw tokens never appear in a URL or in the browser at all** — only the
   one-time code does, and it's single-use and expires in ~60s (`OAUTH_EXCHANGE_CODE_TTL_SECONDS`)
   even if unused, whichever shape it is.
4. If the code is missing/expired/already-used/wrong-endpoint, both `/auth/oauth/exchange` and
   `/auth/oauth/complete` return `401 OAUTH_CODE_INVALID` — show a generic "sign-in failed, try
   again" and a link back to `/login`.
5. A denied/failed OAuth attempt (user cancels at Google/Facebook, or credentials aren't
   configured server-side) currently surfaces as a raw `401` JSON response from the backend
   rather than a redirect back into the app — not yet polished with a `?error=` redirect. Worth
   a follow-up if this is user-facing before launch; flagging rather than silently living with
   it.

Account linking, restated precisely now that role selection exists: this only ever happens by
*email* match against a password-registered account (step 2, first bullet) — an existing
account's role is never changed by linking. Role selection (step 3, second bullet) only ever
runs for a genuinely new identity with no matching account at all, exactly like the registration
form's role picker for email/password sign-up.

**Account linking**: signing in with Google/Facebook using an email that already has a
password-based account logs into *that same account* (matched by email) rather than creating a
duplicate — the frontend doesn't need to do anything special for this, it's transparent.
OAuth-created accounts are always `role: customer` — there's no OAuth path to a `provider_owner`
account, that still goes through the full `/auth/register` + business-profile flow.

### 2.2 What the frontend must implement

- **Token lifecycle**: `access_token` expires in ~15 minutes, `refresh_token` in ~7 days
  (exact values are server-configured, don't hardcode them — treat both as opaque, short- and
  long-lived respectively). Every authenticated request needs the current `access_token`
  attached. When a request comes back `401`, the frontend must attempt `POST /auth/refresh` with
  the stored `refresh_token`, retry the original request with the new `access_token` on success,
  and — on refresh failure — treat the user as fully logged out (clear stored tokens, redirect
  to login).
- **Token persistence**: both tokens need to survive a page reload/app restart. Where/how is an
  implementation choice; the requirement is just that a returning user with a still-valid
  refresh token shouldn't have to log in again.
- **Logout is real, not just client-side.** `POST /auth/logout` must be called with the current
  `refresh_token` before clearing local state — it revokes that specific session server-side
  (Redis-backed denylist, checked on every `/auth/refresh` call). Only clearing local storage
  without calling this endpoint leaves the refresh token valid server-side until it naturally
  expires. This also means: logging out only ends *that* session/device — if the same user is
  logged in elsewhere, that other session is unaffected (this is correct behavior, not a bug —
  don't build a "log out everywhere" assumption on top of it, that endpoint doesn't exist).
- **Role-based routing** immediately after login/register — read `role` off the token response
  or `GET /users/me` and route to the appropriate home experience (see §8).
- **No password-reset flow exists.** There is no "forgot password" endpoint. The frontend
  should not build a "forgot password" link that goes nowhere — either omit it entirely or be
  explicit that it's not yet supported.

## 3. Users

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/me` | any authenticated | current user's own profile |
| PATCH | `/users/me` | any authenticated | body: `{full_name?, phone?}` |

Response shape: `{id, email, full_name, phone, role, created_at}`. Email and role are not
editable via this endpoint (no endpoint changes them at all, post-registration).

## 4. Reference data (cities & categories)

Both are small, public, cacheable lists — fetch once per session and cache client-side rather
than re-fetching on every screen that needs a city/category picker.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/cities` | public | query: `region?`, `is_active?` (bool). Not paginated. |
| GET | `/cities/:id` | public | |
| GET | `/cities/lookup-by-coordinates` | public, throttled | query: `latitude`, `longitude` (both required, decimal degree strings). See below. |
| GET | `/categories` | public | query: `parent_category_id?` (for subcategory drill-down). Not paginated. |
| GET | `/categories/with-counts` | public | registered ahead of `/categories/:id` — no query params. Not paginated. |
| GET | `/categories/:id` | public | |

City shape: `{id, name, slug, region, is_active, provider_count}`.

`GET /categories/with-counts` returns every category (flat, same ordering as plain `GET
/categories`) with one extra field: `{id, slug, icon_url, parent_category_id, provider_count}`.
`provider_count` is a single grouped SQL `COUNT` (`CategoriesRepository.ListWithProviderCounts`),
filtered by the same eligibility rule (`EligibleStatuses`) the public provider directory itself
uses, cached 5 minutes (counts move more often than the category list, which is cached an hour).

### 4.1 Resolve a city from a map point

`GET /cities/lookup-by-coordinates?latitude=42.4304&longitude=19.2594` reverse-geocodes the point
and matches it against our known municipality list. Response is always `200`, never `404`:
`{city: City | null}` — `null` means the point didn't resolve to one of our cities (open
countryside, just outside a municipality boundary, geocoding turned up nothing), which is a
normal outcome, not an error. Use it to auto-fill a city picker from a map pin instead of asking
the user to pick their city manually — fall back to manual selection when `city` is `null`.
Throttled (~20/min by default) since every call hits an external geocoding service with no
caching — don't call it on every mousemove, only once a pin is dropped/confirmed.

Category shape: `{id, slug, icon_url, parent_category_id}` — note there is **no `name`**.
Categories are not translated server-side; `slug` (e.g. `mobile-phones`) is a stable
translation key, and the frontend owns a `slug → display string` dictionary per locale
alongside its other i18n strings (the backend never sees or negotiates a locale for this).
`parent_category_id` (nullable) needs the same two-level-tree handling as before (top-level
categories have `parent_category_id: null`; subcategories reference a parent) if the frontend
wants a drill-down category picker, or can just flatten it if a flat list is acceptable.
Wherever a category is referenced elsewhere in the API (`category_id` on providers/requests/
price-estimates), it's always the `id` — resolve the display name client-side via the same
`slug` dictionary by looking up the category object, not by round-tripping to the backend.

## 5. Providers

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/providers` | public | paginated (`data`/`count`, see §1.2 exception); query: `city_id?`, `category_id?`, `search?` (business name substring), `verification_status?` (accepted but has no effect, see below), `page`, `limit` |
| GET | `/providers/:id` | public | |
| GET | `/providers/slug/:slug` | public | for pretty provider-profile URLs |
| POST | `/providers` | `provider_owner` | creates the caller's own provider profile — see below |
| PATCH | `/providers/:id` | `provider_owner`, must own it | partial update |
| DELETE | `/providers/:id` | `provider_owner`, must own it | |
| GET | `/providers/:id/gallery` | public | not paginated, ordered by `sort_order` |
| POST | `/providers/:id/gallery` | `provider_owner`, must own it | multipart, see §6 |
| DELETE | `/providers/:id/gallery/:imageId` | `provider_owner`, must own it | |

**`POST /providers` body**: `{business_name, description?, address, city_id, latitude?,
longitude?, phone?, email?, website?, working_hours?, category_ids: [uuid, ...]}`
(`category_ids` required, min 1 entry). `PATCH` accepts the same fields, all optional, minus
`category_ids`.

**`latitude`/`longitude`** are optional numeric strings (e.g. `"42.430400"`) — supply both
together to pin the exact location yourself, or omit both to have the server derive them from
`address` via geocoding (the previous, still-default behavior). Supplying only one of the two
is rejected as invalid. On `PATCH`, supplying both skips geocoding even if `address` is also
being changed in the same request — the coordinates you send always win over the address.

**`working_hours`** is a nested object, one optional key per weekday
(`monday`...`sunday`), each either `null` (closed that day) or `{open: "HH:MM", close:
"HH:MM"}` in 24-hour format. `close` must be strictly later than `open` — the API validates
this and rejects otherwise (e.g. reject `{open: "18:00", close: "09:00"}` client-side before
submitting to give faster feedback, but don't rely on client-side validation alone, the server
enforces it too).

**Provider response shape**: `{id, owner_user_id, business_name, slug, description,
address, city_id, latitude, longitude, phone, email, website, working_hours, verification_status,
is_certified, average_rating, review_count, created_at}`. `latitude`/`longitude` are either
whatever the caller sent on create/update, or — when not supplied — populated automatically
server-side via geocoding; they can be `null` if geocoding failed for that address, so any map
display must handle that.

`verification_status` is one of `pending`/`verified`/`rejected`; `is_certified` is the boolean
the frontend should actually gate a "verified" badge on. `average_rating` is a string (e.g.
`"4.67"`) or `null` if the provider has no reviews yet — parse as a float for display, don't
assume it's always present.

`GET /providers` (the directory listing) always returns only `verified` providers — the
`verification_status` query param is accepted for backward compatibility but has no effect on
results, so don't rely on it to filter for anything other than `verified`. This restriction
applies only to the directory listing: `GET /providers/:id` and `GET /providers/slug/:slug`
still return a provider regardless of its verification status, e.g. so an owner can preview
their own pending profile by direct link.

The frontend needs: a provider directory/search screen (list + filters), a provider profile
page (public, showing gallery/reviews/working hours/contact), and — for `provider_owner`
users — a profile-management screen (create-if-none-exists, edit, gallery management, working
hours editor with the validation above).

## 6. File uploads

Five endpoints accept `multipart/form-data`. All are size- and type-limited server-side —
design the upload UI to check these client-side too for fast feedback, but the server is the
enforced source of truth (`413 Payload Too Large` / `415 Unsupported Media Type` on violation).

| Endpoint | Field name | Max size | Allowed types |
|---|---|---|---|
| `POST /providers/:id/gallery` | `file` | 5 MB | `image/jpeg`, `image/png`, `image/webp` |
| `POST /repair-requests` | `photos` (up to 5 files) | 5 MB each | same as above |
| `POST /verification-requests` | `document` | 10 MB | image types above + `application/pdf` |
| `POST /messages` | `attachment` (optional) | 10 MB | image types above + `application/pdf` |

The gallery-upload endpoint also accepts a `caption` form field (optional, plain text). The
repair-request and verification-request endpoints mix file fields with regular text fields in
the same multipart body (see their sections below for the full field list).

## 7. Repair requests, offers, and the core transaction flow

This is the primary customer↔provider marketplace loop; the frontend's core flow needs to model
it as a state machine, not just a form.

### 7.1 Repair requests

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/repair-requests` | any authenticated | paginated; a `customer` only ever sees their own, at any status (enforced server-side); a `provider_owner` sees all requests except `pending_review`/`rejected` (moderation-gated, see below) in the categories serviced by their `verified` provider(s) — a `provider_owner` with no `verified` provider yet sees an empty list; `admin` sees everything, filterable |
| GET | `/repair-requests/:id` | any authenticated | a `customer` gets `403` on a request that isn't theirs; a `provider_owner` gets `403` on one still `pending_review`/`rejected`, outside their serviced categories, or serviced only by a `pending`/`rejected` provider of theirs; `admin` can view any |
| POST | `/repair-requests` | `customer` | multipart, see below — an account is required |
| PATCH | `/repair-requests/:id/status` | `customer`, must own it | body: `{status}` |
| PATCH | `/repair-requests/:id/approve` | `admin` | body: `{review_notes?}` — moves `pending_review` → `open` |
| PATCH | `/repair-requests/:id/reject` | `admin` | body: `{review_notes?}` — moves `pending_review` → `rejected` |

List query params: `status?`, `city_id?`, `category_id?`, `urgency?`, `page`, `limit`.

**`POST /repair-requests`** (multipart, `customer` role required — see §2.1.1 for the
lowest-friction way to get a `customer` account via Google/Facebook): fields `category_id`,
`brand?`, `model?`, `description` (10–4000 chars), `city_id`, `urgency` (`standard`|`urgent`),
plus 0–5 `photos` files. Every new report starts at `pending_review` and is invisible to
providers (and to the reporting customer's "case looks live" expectations — show it as
"under review") until an admin approves it (see Status values below) — this is intentional
anti-spam moderation, not something the frontend needs to work around.

**Status values**: every request starts at `pending_review`. An admin then moves it to `open` or
`rejected` (terminal) via the approve/reject endpoints above — this step is moderator-only, a
customer cannot self-approve their own request even though they own it. Once `open`: `open` →
`offers_received` → `accepted` → `in_progress` → `completed`, with `cancelled` reachable from
most states. The frontend should only expose status-changing actions that make sense for the
current status (e.g. don't show "mark in progress" before an offer is accepted, and don't expose
any customer action at all while `pending_review`) — the server enforces valid transitions and
rejects invalid ones with `409 INVALID_STATUS_TRANSITION`, but the UI shouldn't invite the user
into an action that's certain to fail. `open`/`offers_received`/`accepted`/`in_progress`/
`completed`/`cancelled` transitions are customer-driven via `PATCH .../status`; the
`offers_received`/`accepted` transitions specifically also happen automatically as a side effect
of the offers flow below (don't build a manual "advance to offers_received" button — it happens
when a provider submits an offer).

Response shape: `{id, customer_id, category_id, brand, model, description, photo_urls: [url,
...], city_id, urgency, status, accepted_offer_id, created_at}`.

### 7.2 Offers

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/offers` | any authenticated, scoped — see below | paginated; query: `request_id?`, `provider_id?`, `status?` |
| GET | `/offers/:id` | any authenticated, scoped — see below | |
| POST | `/offers` | any authenticated, must own the referenced provider | body below |
| PATCH | `/offers/:id/status` | any authenticated, must own the relevant side | body: `{status}` |

**Scoping on `GET /offers` and `GET /offers/:id`** (tightened — previously any authenticated
caller could list/read any offer regardless of who it belonged to, including a provider seeing a
competitor's pricing on a shared request; that's now closed):
- `provider_owner`: always scoped to their own provider — any `provider_id` in the query is
  ignored and silently replaced with the caller's own. `GET /offers/:id` for an offer that isn't
  theirs returns `403 OFFER_NOT_OWNED`.
- `customer`: `request_id` is **required** — omitting it returns `403 OFFERS_REQUEST_ID_REQUIRED`,
  and a `request_id` for a request the caller doesn't own returns `403
  REPAIR_REQUEST_NOT_OWNED`/`403 OFFER_NOT_OWNED`. A customer sees every offer (any status) on
  their own request, same as before.
- `admin`: unrestricted, as before.

**`POST /offers`** body: `{request_id, provider_id, price_min, price_max (both numeric
strings), estimated_duration, parts_type ("oem"|"aftermarket"), message?}`. The caller must own
`provider_id` — the API returns `403 PROVIDER_NOT_OWNED` otherwise, so the frontend should only
ever let a `provider_owner` reach this form, pre-scoped to one of their own providers. That
provider must also be `verified` — the API returns `403 PROVIDER_NOT_VERIFIED` for a `pending`
or `rejected` provider, so the frontend should hide the "make an offer" action for providers
that aren't `verified` yet.

**`PATCH /offers/:id/status`** — `status` is one of `accepted`/`rejected`/`withdrawn`.
`accepted`/`rejected` must be called by the repair request's customer; `withdrawn` must be
called by the offering provider owner. **Accepting one offer automatically rejects every other
pending offer on the same request** — the frontend should refresh the whole offers list for
that request after an accept (don't optimistically assume only the one offer changed).

Offer status values: `pending` → `accepted`/`rejected`/`withdrawn` (terminal). Response shape:
`{id, request_id, provider_id, provider, price_min, price_max, estimated_duration, parts_type,
message, status, created_at, customer_contact}`.

- `provider` is the same shape `GET /providers/:id` returns (business_name, phone, email,
  website, address, ...) — embedded on every offer, at every status, for any viewer who can see
  the offer at all. This data is already public (the directory/profile page return it too), so
  there's no new exposure; it just saves the frontend a second round trip to show who's behind an
  offer before the customer even accepts it.
- `customer_contact` (`{full_name, email, phone}`) is `null` except when **both** are true: the
  offer's `status` is `accepted`, and the viewer is that offer's own provider owner (or an
  admin) — never present for the customer's own view of their offers (they already know their
  own info), and never present on a pending/rejected/withdrawn offer.

### 7.3 The flow the frontend needs to build

1. Customer creates a repair request (with photos).
2. Provider owners browse open requests (`GET /repair-requests?status=open&category_id=...`)
   and submit offers.
3. Customer sees incoming offers on their request (`GET /offers?request_id=...`), compares them
   — including each offer's embedded `provider` contact info — and accepts one.
4. Once accepted: **both sides get an email with the other's contact info right in it** — direct
   phone/email/website, not just an in-app notification requiring login. Prioritize surfacing
   `customer_contact`/`provider` prominently on the accepted-offer UI too; the in-app chat (§7.4)
   still works but contact info is the primary path, not something gated behind opening a
   conversation. Both also get an in-app notification (see §11) — provider's is `offer_accepted`,
   customer's is the new `offer_accepted_confirmation`. Messaging itself is still gated on an
   accepted offer existing — `POST /messages` on a `request_id` with no accepted offer yet
   returns `409 NO_ACCEPTED_OFFER`.
5. Customer advances the request through `in_progress` → `completed`.
6. Once `completed`, the customer can leave a review (§7.5) — exactly one review per request,
   enforced server-side.

### 7.4 Messages

REST-only, no WebSocket (see §11 for what this means for the frontend).

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/messages` | any authenticated | query: exactly one of `request_id` or `inquiry_id` required; caller must be a participant |
| POST | `/messages` | any authenticated | multipart (optional attachment); must be a participant |
| PATCH | `/messages/:id/read` | any authenticated | marks one message read |

**`POST /messages`** (multipart): exactly one of `request_id`/`inquiry_id` (never both, never
neither — `400` otherwise), `body` (1–2000 chars text), optional `attachment` file.

A conversation is scoped to either a repair request (participants: the customer + the accepted
offer's provider owner) or a direct inquiry (participants: the provider owner + the customer, if
any — see §7.6). The frontend needs one conversation-thread UI reused for both contexts,
addressed by whichever ID is relevant on that screen.

Response shape: `{id, request_id, inquiry_id, sender_id, body, attachment_url, is_read,
created_at}` (exactly one of `request_id`/`inquiry_id` is non-null per message).

### 7.5 Reviews

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reviews` | public | paginated; query: `provider_id` required |
| GET | `/reviews/:id` | public | |
| POST | `/reviews` | `customer` | body: `{request_id, rating (1-5), comment}` |
| PATCH | `/reviews/:id/response` | `provider_owner`, must own the reviewed provider | body: `{response}` |

Only reachable once the request is `completed`; one review per request (`409
REVIEW_ALREADY_EXISTS` on a second attempt); a provider owner can post exactly one response per
review (`409 REVIEW_ALREADY_RESPONDED` on a second attempt) — so the UI should show a
"respond" form only when `provider_response` is currently `null` on that review.

Response shape: `{id, request_id, customer_id, provider_id, rating, comment,
provider_response, is_published, created_at}`.

### 7.6 Direct inquiries

A lighter-weight "contact this provider" path that doesn't require an existing repair request —
usable by a logged-in customer *or* a fully anonymous visitor.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/direct-inquiries` | public (optionally authenticated) | see below |
| GET | `/direct-inquiries` | `provider_owner` | query: `provider_id` required, `status?`; paginated; must own the provider |
| GET | `/direct-inquiries/:id` | `provider_owner`, must own it | |
| PATCH | `/direct-inquiries/:id/status` | `provider_owner`, must own it | body: `{status}` (`new`/`contacted`/`closed`) |

**`POST /direct-inquiries`** body: `{provider_id, name?, contact_email?, contact_phone?,
message}`. If the caller sends a valid `Authorization` header, the inquiry is automatically
attributed to their account (`customer_id` populated) and `name`/`contact_email`/
`contact_phone` become unnecessary. If there's no token (anonymous visitor), `name` plus at
least one of `contact_email`/`contact_phone` become **required** (`400
CONTACT_INFO_REQUIRED` otherwise) — the frontend needs to conditionally show/require those
fields based on whether the visitor is logged in.

## 8. Provider verification (trust badge)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/verification-requests` | `provider_owner` | multipart, see below |
| GET | `/verification-requests` | `admin` | paginated; query: `status?` |
| GET | `/verification-requests/:id` | `admin` | |
| PATCH | `/verification-requests/:id/approve` | `admin` | body: `{review_notes?}` |
| PATCH | `/verification-requests/:id/reject` | `admin` | body: `{review_notes?}` |

**`POST /verification-requests`** (multipart): fields `provider_id`, `apr_number` (business
registration number, 2–60 chars), plus a `document` file (see §6). One `pending` request per
provider at a time — a second submission attempt while one is still pending returns `409
VERIFICATION_REQUEST_ALREADY_PENDING`, so the frontend should hide/disable the submit form if
the provider already has a pending request (check via the provider's own
`verification_status`, or note that there's no direct "get my pending request" endpoint for a
provider owner — only admins can list/fetch verification requests directly, so track
pending-ness client-side after a successful submit, or infer it from the provider's
`verification_status` staying `pending`).

Approving/rejecting flips the provider's `verification_status`/`is_certified` (visible via the
regular `GET /providers/:id`) and notifies the provider owner (§11). This whole flow is
**admin-only to view/action** — a `provider_owner` submits and then has no visibility into the
request itself beyond watching their own provider's `verification_status` change.

## 9. Notifications

Polling-based (no WebSocket/push — see §11).

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | any authenticated | paginated, caller's own only |
| PATCH | `/notifications/:id/read` | any authenticated, own only | |

Response shape: `{id, user_id, type, message_key, message_params, related_entity_type,
related_entity_id, is_read, created_at}`. There is no rendered `title`/`body` text anymore — the
backend sends a `message_key` (a stable string identifying the exact message template) plus
`message_params` (a flat object of the variables that template needs, or `null` when the
template takes none), and the frontend is responsible for looking up `message_key` in its own
i18n messages and interpolating `message_params` into it. This is what lets notifications respect
the site's locale toggle, which they couldn't when the backend sent pre-rendered English strings.

`type` is unchanged and still one of: `new_offer`, `offer_accepted`, `status_change`,
`new_review`, `verification_approved`, `verification_rejected`, `new_message`, `new_inquiry`,
`new_repair_request` (provider-facing — sent to every eligible provider in a request's category
the moment it's approved and becomes visible; `related_entity_id` is the repair request's id, so
this routes to `/provider/requests/:id` the same way `new_offer` does),
`offer_accepted_confirmation` (customer-facing counterpart to `offer_accepted` — fired at the
same moment, `related_entity_id` is the offer's id; §7.2/§7.3 for why this one matters more than
usual — it's the signal to surface the provider's contact info). Keep using `type` for
deep-linking (see below) — `message_key` is for message text only.

`message_key` / `message_params` per `type` (`status_change` is the one `type` that covers three
different messages — disambiguate by `message_key`, not `type`, when deciding which string to
render):

| `type` | `message_key` | `message_params` |
|---|---|---|
| `new_offer` | `new_offer` | `{ provider_name }` |
| `offer_accepted` | `offer_accepted` | *(none — `related_entity_id` already carries the request id for deep-linking; it isn't shown as text)* |
| `offer_accepted_confirmation` | `offer_accepted_confirmation` | `{ provider_name }` |
| `status_change` | `repair_request_approved` | *(none)* |
| `status_change` | `repair_request_rejected` | *(none)* |
| `status_change` | `repair_request_status_changed` | `{ status }` (raw `RepairRequestStatus` enum value) |
| `new_repair_request` | `new_repair_request` | `{ category_slug, city_name }` — **slug, not name**: resolve the display label the same way the rest of the app resolves category text from a slug, don't send the slug itself to the user |
| `new_inquiry` | `new_inquiry` | `{ sender_name }` |
| `verification_approved` | `verification_approved` | *(none)* |
| `verification_rejected` | `verification_rejected` | *(none)* |
| `new_review` | `new_review` | `{ rating }` (1–5) |
| `new_message` | `new_message` | `{ sender_name }` |

`related_entity_type`/`related_entity_id` (both nullable) are unaffected by this change and are
still a hint for deep-linking — e.g. a `new_offer` notification's `related_entity_id` is the
offer's id, so tapping the notification can route straight to that offer/request. The frontend
should build a mapping from `type` to "where does tapping this notification navigate" using these
two fields, plus a simple unread-count indicator (count items where `is_read: false` from the
list, or track it separately — there's no dedicated unread-count endpoint).

`new_repair_request` also sends an email with a direct "view the request" link
(`{FRONTEND_URL}/provider/requests/:id`) to every eligible provider (verified, or pending when
verification isn't required — same eligibility the public directory and offer-submission use) —
not just approval, creation itself doesn't trigger this, since a `pending_review` request isn't
viewable by providers yet and the link would 403.

## 10. Public CMS content

All public, no auth needed to read; `admin`-only to write. Good candidates for a marketing/help
section of the frontend (blog, FAQ, price guide).

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/blog-posts` | public | paginated; only ever returns published (`published_at <= now`) posts |
| GET | `/blog-posts/:slug` | public | 404 if not published yet, even if it exists |
| GET | `/blog-posts/admin/:id` | `admin` | fetch by id regardless of publish state, for an editor preview |
| POST | `/blog-posts` | `admin` | body: `{title, content, cover_image_url?, tags?, publish?}` |
| PATCH | `/blog-posts/:id` | `admin` | same fields, all optional |
| GET | `/faq-items` | public | not paginated, ordered by category then `sort_order` |
| POST/PATCH/DELETE | `/faq-items[/:id]` | `admin` | `{question, answer, category, sort_order?}` |
| GET | `/price-estimates` | public | not paginated; query: `category_id?` |
| POST/PATCH/DELETE | `/price-estimates[/:id]` | `admin` | `{category_id, service_type, price_min, price_max, currency?}` (prices are numeric strings, currency defaults `EUR`) |
| POST | `/contact-messages` | public | `{name, email, subject, message}` — rate-limited, expect occasional `429` on a public contact form, handle it with a friendly "try again shortly" message |
| GET | `/contact-messages` | `admin` | paginated; query: `status?` |
| PATCH | `/contact-messages/:id/status` | `admin` | `{status}` (`new`/`in_progress`/`resolved`) |

Blog post slugs are server-generated from the title — the frontend never sends `slug`.
`publish` on create/update is a boolean; omitting it (or `false`) keeps the post a draft
(`published_at: null`), and it's only visible via the admin-id route until set `true`.

## 11. Admin-only operational views

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/admin/analytics` | `admin` | dashboard aggregate, see below |
| GET | `/audit-logs` | `admin` | paginated; query: `actor_id?`, `entity_type?`, `action?` |

**`GET /admin/analytics`** response: `{providers_by_verification_status: {pending, verified,
rejected}, requests_by_status: {open, offers_received, accepted, in_progress, completed,
cancelled}, reviews: {total_reviews, average_rating}, top_cities_by_provider_count: [City,
...]}` — a single call gives everything needed for an admin landing-page dashboard (counts by
status as bar/pie data, a top-cities list, overall review stats).

**Audit log** entries: `{id, actor_id, action, entity_type, entity_id, metadata, created_at}`.
`action` values are dot-namespaced strings (`verification_request.approved`,
`faq_item.updated`, `contact_message.status_changed`, etc.) — build the admin audit view as a
searchable/filterable table, not a fixed-schema list, since `action`/`entity_type` values will
likely grow over time as more admin actions get audited.

## 12. No WebSocket / real-time layer

This API is REST-only end to end — there is no WebSocket endpoint, no server-sent events, no
push notification mechanism. Anything that feels "live" (new messages, new notifications, offer
status changes another party made) has to be **polled** by the frontend:

- Poll `GET /notifications` on an interval (or on window focus / navigation) for a general
  "something changed" signal, and use `related_entity_type`/`related_entity_id` to know what to
  refetch.
- Poll `GET /messages?request_id=...` (or `inquiry_id=...`) while a conversation thread is open.
- Don't build any assumption of a persistent connection, delivery guarantees beyond
  "eventually visible via the next poll," or typing indicators/presence — none of that exists
  server-side.

## 13. Known API limitations to design around

- **No password reset.** (§2.2)
- **No email verification.** Any email address can be used at registration without proving
  ownership of it.
- **No "log out everywhere."** Logout revokes exactly the session whose refresh token was
  presented.
- **No provider-owner visibility into their own verification request status beyond the
  provider's `verification_status` field** — no `GET /verification-requests/mine` or similar.
- **File uploads are synchronous** — the endpoint doesn't return until the upload completes
  server-side (uploaded directly to S3-compatible storage, then the DB row is written). Build
  upload UI with a loading state; there's no background-upload/progress-webhook mechanism.
- **No bulk/batch endpoints anywhere** — every write is one resource at a time.
