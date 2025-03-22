// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getDatabase, ref, set, onValue, off, push, update, runTransaction, get } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

// Your Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAq9kTw-ZuPWnwSFzrfdBCRPpRBinCREdQ",
  authDomain: "xyzfyrebase.firebaseapp.com",
  databaseURL: "https://xyzfyrebase-default-rtdb.firebaseio.com",
  projectId: "xyzfyrebase",
  storageBucket: "xyzfyrebase.appspot.com",
  messagingSenderId: "454185287009",
  appId: "1:454185287009:web:4d5b7e8007f11b82b5d920",
  measurementId: "G-SQPB4QBFFM"
};

// Initialize Firebase and expose functionality to the window object
export function initializeFirebaseApp() {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const storage = getStorage(app);
  
  // Create a global object with all Firebase functionality
  window.firebaseApp = { 
    app, 
    db, 
    storage, 
    ref, 
    set, 
    onValue, 
    off, 
    push, 
    update, 
    runTransaction, 
    get,
    storageRef, 
    uploadBytes, 
    getDownloadURL 
  };
  
  return window.firebaseApp;
}