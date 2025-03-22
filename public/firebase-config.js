// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';

// Your web app's Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyC7rQ2Gi9hElKD_WsUI1On5K6Bzq-25CwA",
    authDomain: "micp-chat.firebaseapp.com",
    projectId: "micp-chat",
    storageBucket: "micp-chat.firebasestorage.app",
    messagingSenderId: "349850829293",
    appId: "1:349850829293:web:db975d86c67f83a26527e4"
};

// Exportar app inicializado para uso em outros arquivos
export const app = initializeApp(firebaseConfig);