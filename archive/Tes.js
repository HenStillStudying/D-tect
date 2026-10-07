// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvQP9fzYwjv7Nph9Pu0igYmCOm83gFSK0",
  authDomain: "vitamindcheck.firebaseapp.com",
  projectId: "vitamindcheck",
  storageBucket: "vitamindcheck.firebasestorage.app",
  messagingSenderId: "395228797742",
  appId: "1:395228797742:web:20994d208e652d5ce578bf",
  measurementId: "G-E1BMCLTPR3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);