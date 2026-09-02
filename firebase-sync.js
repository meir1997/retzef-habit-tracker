import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const config = window.RETZEF_FIREBASE_CONFIG;
const configured = Boolean(config?.apiKey && config?.authDomain && config?.projectId && config?.appId);
const listeners = new Set();
let auth = null;
let database = null;
let currentUser = null;
let readyResolve;

const authReady = new Promise((resolve) => {
  readyResolve = resolve;
});

function notify(user) {
  currentUser = user;
  listeners.forEach((listener) => listener(user));
}

async function signIn() {
  if (!configured) throw new Error("Firebase עדיין לא מוגדר.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIos) {
    await signInWithRedirect(auth, provider);
    return null;
  }
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    if (error?.code !== "auth/popup-blocked") throw error;
    await signInWithRedirect(auth, provider);
    return null;
  }
}

async function signOutUser() {
  if (!auth) return;
  await signOut(auth);
}

async function upload(payload) {
  const user = currentUser ?? auth?.currentUser;
  if (!user) throw new Error("צריך להתחבר עם Google.");
  const reference = doc(database, "users", user.uid, "data", "retzef");
  const existing = await getDoc(reference);
  const current = existing.exists() ? existing.data() : null;
  const snapshot = compactPayload(current);
  const history = [snapshot, ...(Array.isArray(current?.backups) ? current.backups.map(compactPayload) : [])]
    .filter(Boolean);
  const fingerprints = new Set();
  const backups = history.filter((item) => {
    const fingerprint = `${item.updatedAt}|${JSON.stringify(item.habits)}|${JSON.stringify(item.reading)}`;
    if (fingerprints.has(fingerprint)) return false;
    fingerprints.add(fingerprint);
    return true;
  }).slice(0, 12);
  await setDoc(reference, { ...compactPayload(payload), backups });
}

function compactPayload(payload) {
  if (!payload || !Array.isArray(payload.habits)) return null;
  return {
    app: payload.app || "retzef",
    version: payload.version || 1,
    updatedAt: payload.updatedAt || new Date().toISOString(),
    habits: payload.habits,
    reading: payload.reading || { startedAt: null, books: [] },
  };
}

async function download() {
  const user = currentUser ?? auth?.currentUser;
  if (!user) throw new Error("צריך להתחבר עם Google.");
  const snapshot = await getDoc(doc(database, "users", user.uid, "data", "retzef"));
  return snapshot.exists() ? snapshot.data() : null;
}

window.retzefFirebase = {
  configured,
  authReady,
  getUser: () => currentUser,
  onUserChanged(listener) {
    listeners.add(listener);
    listener(currentUser);
    return () => listeners.delete(listener);
  },
  signIn,
  signOut: signOutUser,
  upload,
  download,
};

if (configured) {
  const app = initializeApp(config);
  auth = getAuth(app);
  auth.languageCode = "he";
  database = getFirestore(app);
  getRedirectResult(auth).catch(() => {});
  onAuthStateChanged(auth, (user) => {
    notify(user);
    readyResolve(user);
  });
} else {
  readyResolve(null);
}

window.dispatchEvent(new CustomEvent("retzef-firebase-ready"));
