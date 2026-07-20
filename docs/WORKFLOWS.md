# TriSafe workflow map

## Passenger ride flow

1. `GET /api/vehicles/verify/:token` resolves the QR token. It returns no driver details unless the QR is active, the vehicle is active, the driver is verified, and the franchise is verified and unexpired.
2. The mobile app loads the LGU location directory and calls `POST /api/rides/preview`. The backend finds the active fare rule and calculates the estimate with `@trisafe/contracts`.
3. The passenger confirms the displayed estimate. `POST /api/rides` repeats vehicle eligibility and fare lookup before creating an `ACTIVE` ride.
4. `GET /api/rides/:id/share` returns a SafeShare payload. Flutter passes it to the native share sheet through `share_plus`.
5. `GET /api/safety/emergency-contacts` powers SOS. Flutter displays the configured hotlines and can share the current ride through the device's native share sheet.
6. `POST /api/rides/:id/end` changes the ride to `COMPLETED`. `GET /api/rides` is the passenger's history.

## Driver and QR administration

- `POST /api/admin/drivers` is LGU-only and atomically creates the user, verified driver profile, franchise, vehicle, and QR token.
- `PATCH /api/admin/drivers/:id/franchise` lets an LGU administrator update franchise status and expiry. QR verification and ride eligibility immediately honor the new status.
- `POST /api/admin/vehicles/:vehicleId/qr` rotates a QR token. The initial QR is generated atomically with LGU driver registration; QR rendering and download are handled by the admin web app.
- `GET /api/drivers/me` exposes the driver profile, franchise, vehicles, and a renewal warning when the renewal date is within 30 days.
- `GET /api/drivers/me/announcements` reads announcements that the LGU broadcasted to driver accounts.

## AI-assisted incident reporting

- `POST /api/incidents/draft` stores the passenger's raw description and generates an editable draft, category, and missing-information suggestions.
- `POST /api/incidents/:id/submit` moves a draft to `SUBMITTED`.
- `GET /api/incidents/admin/all` and `PATCH /api/incidents/admin/:id/review` are LGU review endpoints.
- `IncidentAiService` is intentionally a provider boundary. The current implementation is deterministic and local; an LLM adapter can replace it while preserving the same output contract. AI never changes the review status or makes a legal determination.

## Production hardening before launch

- Replace the local HMAC token issuer with an approved LGU identity provider or a managed authentication service.
- Add audit logs for QR creation/revocation, fare changes, driver status changes, announcements, and incident reviews.
- Add rate limits, encrypted location retention, explicit consent, and a data-retention policy for SafeShare/SOS data.
- Move secrets out of `.env` files, enable HTTPS, configure production CORS, and add database backup/restore checks.
- The API startup validator already rejects weak production JWT secrets, wildcard CORS, non-HTTPS origins, and invalid ports.
