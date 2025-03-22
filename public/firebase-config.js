import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';

export const firebaseConfig = {
    apiKey: "AIzaSyC7rQ2Gi9hElKD_WsUI1On5K6Bzq-25CwA",
    authDomain: "micp-chat.firebaseapp.com",
    projectId: "micp-chat",
    storageBucket: "micp-chat.firebasestorage.app",
    messagingSenderId: "349850829293",
    appId: "1:349850829293:web:db975d86c67f83a26527e4"
};

export const app = initializeApp(firebaseConfig);