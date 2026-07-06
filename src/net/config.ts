// The app runs against the real relay when EXPO_PUBLIC_API_URL is configured; otherwise it stays
// in the fully-functional local mock (useful for design work and offline demos).

export const BACKEND_ENABLED = !!process.env.EXPO_PUBLIC_API_URL;
