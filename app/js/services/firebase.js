// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQFbIPuXWP9JuOmJ-beEjYowtcvZEJrlc",
  authDomain: "vitamindeficiency-ae82f.firebaseapp.com",
  projectId: "vitamindeficiency-ae82f",
  storageBucket: "vitamindeficiency-ae82f.firebasestorage.app",
  messagingSenderId: "636315539699",
  appId: "1:636315539699:web:1ce574029ba2680181ff86",
  measurementId: "G-Q1TTDQ57GF"
};

// Initialize Firebase using the CDN "compat" method
firebase.initializeApp(firebaseConfig);

// Initialize Cloud Firestore so you can save data
const db = firebase.firestore();

// Also expose it on window.firestoreDb — script.js's fetchUserHistory()
// checks this first and falls back to the bare `db` global, so this line
// isn't strictly required, but keeps things resilient either way.
window.firestoreDb = db;