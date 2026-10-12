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

// Also expose it on window.firestoreDb — history.js checks this first and
// falls back to the bare `db` global.
window.firestoreDb = db;

// Anonymous sign-in gives each browser a stable, private user ID
// (request.auth.uid). Firestore rules only let a user read/delete history
// entries saved under their own uid. Firebase keeps the session in the
// browser, so the same visitor gets the same uid on later visits.
// Resolves to the uid, or rejects if sign-in fails (e.g. Anonymous auth
// not enabled in the Firebase console).
window.authReady = new Promise(function(resolve, reject) {
  var unsubscribe = firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      unsubscribe();
      resolve(user.uid);
    }
  });
  firebase.auth().signInAnonymously().catch(function(err) {
    console.error("Anonymous sign-in failed — history is unavailable:", err);
    unsubscribe();
    reject(err);
  });
});
// Avoid an "uncaught rejection" warning when nothing is waiting on it yet
window.authReady.catch(function() {});