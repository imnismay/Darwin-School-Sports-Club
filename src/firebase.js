// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔴 REPLACE THIS VARIABLE WITH YOUR COPIED CONFIG FROM FIREBASE CONSOLE 🔴
const firebaseConfig = {
  apiKey: "YOUR API",
  authDomain: "YOUR AUTHDOMAIN.firebaseapp.com",
  projectId: "YOUR PROJECT ID",
  storageBucket: "YOUR STORAGE BACKET.firebasestorage.app",
  messagingSenderId: "YOUR ID",
  appId: "YOUR APPID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Database

export const db = getFirestore(app);
