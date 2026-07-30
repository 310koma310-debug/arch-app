import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA28JUJlqBkOUWhBkgWewdBbYtl5XBMoLw",
  authDomain: "arch-community-6c4ce.firebaseapp.com",
  projectId: "arch-community-6c4ce",
  storageBucket: "arch-community-6c4ce.firebasestorage.app",
  messagingSenderId: "599172888374",
  appId: "1:599172888374:web:da55da7673c8b66eb6e597",
  measurementId: "G-X10XFDMFNS"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage
};
