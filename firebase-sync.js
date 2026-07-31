import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
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
  await setPersistence(auth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

async function signOutUser() {
  if (!auth) return;
  await signOut(auth);
}

async function upload(payload) {
  const user = currentUser ?? auth?.currentUser;
  if (!user) throw new Error("צריך להתחבר עם Google.");
  await setDoc(doc(database, "users", user.uid, "data", "retzef"), payload);
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
  onAuthStateChanged(auth, (user) => {
    notify(user);
    readyResolve(user);
  });
} else {
  readyResolve(null);
}

window.dispatchEvent(new CustomEvent("retzef-firebase-ready"));
