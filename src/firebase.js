// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔴 REPLACE THIS VARIABLE WITH YOUR COPIED CONFIG FROM FIREBASE CONSOLE 🔴
const firebaseConfig = {
  apiKey: "AIzaSyDuy3qRqt9nc668NHNAWIyXsBuRRPNicC8",
  authDomain: "darwin-sports-fe2b5.firebaseapp.com",
  projectId: "darwin-sports-fe2b5",
  storageBucket: "darwin-sports-fe2b5.firebasestorage.app",
  messagingSenderId: "825616469213",
  appId: "1:825616469213:web:b842c5fd18ebfcf4035f34"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Database
export const db = getFirestore(app);