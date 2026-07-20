# TriSafe acceptance checklist

Use this checklist after starting PostgreSQL, the API, and the admin web app. The automated database checks are complementary; this checklist confirms the user interfaces and phone permissions.

## Start the local system

In separate terminals:

```powershell
cd C:\TriSafe
docker compose up -d postgres
npm run dev:api
```

```powershell
cd C:\TriSafe
npm run dev:admin
```

For a wired Android phone:

```powershell
cd C:\TriSafe\apps\mobile
adb reverse tcp:3000 tcp:3000
flutter run -d 99GAFMEASK9LNZY5 --dart-define=API_BASE_URL=http://127.0.0.1:3000/api
```

## Passenger acceptance

Use `passenger@trisafe.local` / `passenger123`.

- Sign in and confirm the passenger home screen appears.
- Scan an LGU-generated QR code and confirm the driver, vehicle, and franchise details appear.
- Continue the ride, select two different locations, and review the official fare breakdown.
- Start the ride and confirm the active-ride card appears.
- Open SafeShare and confirm the native Android share sheet includes driver, plate, route, start time, and current location when permission is granted.
- Open SOS and confirm both emergency contacts appear; use “Share current ride details” while a ride is active.
- Submit an incident report and confirm the AI draft, category, missing-information suggestions, and submission confirmation.
- End the ride and confirm it appears as `COMPLETED` in ride history.

## Driver acceptance

Use `driver@trisafe.local` / `driver12345`.

- Confirm the approved profile shows account status, license, phone, franchise, franchise expiry, and vehicle.
- Confirm an LGU announcement is visible when one is active.
- Edit contact information and refresh the profile.
- Temporarily setting a franchise expiry within 30 days should show a renewal reminder; restore the original date afterward.

## LGU acceptance

Use `admin@trisafe.local` / `admin12345`.

- Confirm the dashboard counts load from PostgreSQL.
- Register a driver with a unique email, phone, franchise number, plate number, and temporary password.
- View and download the generated vehicle QR PNG.
- Open “Manage franchise,” change status/expiry, and confirm the passenger QR verification follows the change.
- Create or update a fare rule and confirm the passenger fare uses the new active matrix.
- Publish an announcement and confirm it appears for verified drivers.
- Review a submitted incident, change its status/category, and save reviewer notes.
- Open “Audit trail” and confirm the LGU actor and action are recorded.

## Automated checks

From `C:\TriSafe`:

```powershell
npm run test:api
npm run verify:api
npm run verify:workflow
```

`verify:workflow` creates one completed acceptance-test ride and one reviewed incident in the local database. These records are safe to keep in development or remove manually before a demonstration.
