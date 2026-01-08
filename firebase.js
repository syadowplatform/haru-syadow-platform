import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 하루의 Firebase 설정 (syadow-pro)
const firebaseConfig = {
  apiKey: "AIzaSyAKejKVDzOx2V-OUzIKKcsJFxw9uTuH2wM",
  authDomain: "syadow-pro.firebaseapp.com",
  projectId: "syadow-pro",
  storageBucket: "syadow-pro.firebasestorage.app",
  messagingSenderId: "137444359015",
  appId: "1:137444359015:web:83e9b7fc050fa45cda8dc2",
  measurementId: "G-36J8B53HMG"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
console.log("🔥 firebase.js loaded", location.pathname);
