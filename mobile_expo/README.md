SmarTanom — Expo (mobile) scaffold

This folder contains a lightweight Expo + React Native scaffold that mirrors the React Vite web app routes.

Files created
- `App.js` — root entry
- `navigation/index.js` — react-navigation setup (Stack + Tabs)
- `screens/` — sample screens: Login, Dashboard, DeviceList, DeviceDetail, Settings
- `package.json`, `app.json`

Quick run (Windows PowerShell)
1. Install Node.js (v18+) and npm or use pnpm/yarn.
2. From repository root:

```powershell
cd .\mobile_expo
npm install
npx expo start
```

3. Open the Expo Go app on your phone and scan the QR code, or press 'a' / 'i' to run on emulator.

Notes & mapping guidance
- Routing: web React Router -> mobile react-navigation (Stack + Tabs). The `navigation/index.js` shows the mapping.
- Storage: replace `localStorage` with `@react-native-async-storage/async-storage`.
- Hover / mouse interactions: replace with press or long-press handlers.
- Complex tables/charts: use mobile-friendly lists and chart libraries (e.g., `react-native-chart-kit` or `victory-native`).
- Web-only features (file drag/drop, complex keyboard shortcuts) should be replaced with native pickers and simplified interactions.

Next steps (recommended)
- Replace placeholder login with actual OTP API integration following your backend auth flow.
- Add API client (`axios` or `fetch` wrapper) and wire token storage in AsyncStorage.
- Add icons for tabs and polish styles to match the web look more closely.
- Run `npm install` in `mobile_expo` and verify in Expo Go.

Configuration for API base URL
- To call your local backend from a physical device using Expo Go, set the backend host IP in `app.json` under `expo.extra.API_BASE_URL` (e.g. `"http://192.168.1.10:8000"`). Without this the client falls back to `http://127.0.0.1:8000` which works in some emulators but not on device.
- Example `app.json` extra snippet:

```json
"expo": {
	"extra": {
		"API_BASE_URL": "http://192.168.1.10:8000"
	}
}
```

If you want, I can:
- Automatically scaffold an API client that mirrors your existing `frontend/src/services/apiClient.js` usage.
- Convert specific pages one-by-one from `frontend/src/pages/` to RN screens (I can do this next).
