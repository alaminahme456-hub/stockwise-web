# StockWise interactive onboarding tutorial

The tutorial is implemented in React and shared by the web dashboard and Capacitor WebView.

## Files
- `src/components/tutorial/TutorialOverlay.tsx` — welcome, spotlight, navigation, and completion UI.
- `src/components/tutorial/tutorialSteps.ts` — tour content and stable navigation selectors.
- `src/components/tutorial/tutorial.css` — responsive and reduced-motion styling.
- `src/App.tsx` — authenticated/store-aware onboarding, permission filtering, and per-user/per-store dismissal state.
- `src/components/Navbar.tsx` — persistent Help & Tutorials entry point.

No new runtime dependency or database table is required. Completion/skip state uses a local-storage key scoped to the authenticated user and active store. The tutorial does not execute business actions.

## Build and Android sync

Run from the repository root:

```sh
npm install
npm run lint
npm run build
npx cap sync android
```

To open Android Studio after syncing, run `npx cap open android`. A successful web build and sync do not themselves prove that an APK was built or device-tested; build/sign the Android package using the project's configured Android toolchain.

## Validation notes

The tour checks existing tab permissions before presenting a step, tries the mobile bottom navigation when the desktop sidebar is hidden, scrolls targets into view, and falls back to a safe explanatory message when a target is unavailable. It does not modify store, inventory, customer, staff, or sales data.
