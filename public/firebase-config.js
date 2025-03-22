// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';

// Your new Firebase configuration
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

// Initialize Firebase
export const app = initializeApp(firebaseConfig);