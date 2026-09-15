# TriSafe Mobile

React Native (Expo) passenger and driver application for the TriSafe monorepo.

## Run on a wired Android device

1. Start PostgreSQL and the NestJS API on port `3000`.
2. Enable USB debugging and connect the Android device.
3. From the repository root, run `npm run dev:mobile:wired`.

The wired command forwards the device's `127.0.0.1:3000` to the development computer, matching the default API URL. For Wi-Fi testing, set `EXPO_PUBLIC_API_BASE_URL` to the computer's LAN address, for example `http://192.168.1.10:3000/api`, then run `npm run dev:mobile`.

## Structure

- `src/screens`: passenger, driver, and authentication screens.
- `src/context`: authenticated passenger and driver state.
- `src/services`: the typed NestJS REST API client.
- `src/style`: external React Native `StyleSheet` modules organized by feature.

Run `npm run typecheck` or `npm run validate:android` before release.
