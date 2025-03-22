const socket = io('https://extraordinary-yeot-cba061.netlify.app/'); // Substitua pelo URL do backend

const welcomeScreen = document.getElementById('welcomeScreen');
const chatContainer = document.getElementById('chatContainer');
const usernameInput = document.getElementById('usernameInput');
const joinButton = document.getElementById('joinButton');
const currentUser = document.getElementById('currentUser');
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const mediaInput = document.getElementById('mediaInput');
const userList = document.getElementById('userList');
const errorMessage = document.getElementById('errorMessage');
const logoutButton = document.getElementById('logoutButton');
const forumTab = document.getElementById('forumTab');
const privateTab = document.getElementById('privateTab');
const sendButton = document.getElementById('sendButton');
const mediaPreview = document.getElementById('mediaPreview');
const statusBar = document.getElementById('statusBar');
const profilePopup = document.getElementById('profilePopup');
const popupPhoto = document.getElementById('popupPhoto');
const popupUsername = document.getElementById('popupUsername');
const popupBio = document.getElementById('popupBio');

let username = localStorage.getItem('username') || '';
let userId = localStorage.getItem('userId') || generateUserId();
let currentChat = '#main';
let userProfiles = new Map();
let messageCount = 0; // Contador para controlar pop-ups por mensagem

function generateUserId() {
    const id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', id);
    return id;
}

// Autologin
if (username) {
    socket.emit('registerUser', {
        username,
        userId,
        photo: localStorage.getItem('photo'),
        bio: localStorage.getItem('bio')
    });
} else {
    welcomeScreen.style.display = 'block';
}

joinButton.addEventListener('click', () => {
    username = usernameInput.value.trim();
    if (username.length < 3) {
        errorMessage.textContent = 'Nick mínimo 3 caracteres!';
        return;
    }
    errorMessage.textContent = 'Conectando...';
    socket.emit('registerUser', {
        username,
        userId,
        photo: localStorage.getItem('photo'),
        bio: localStorage.getItem('bio')
    });
});

socket.on('loginSuccess', (userData) => {
    welcomeScreen.style.display = 'none';
    chatContainer.style.display = 'block';
    currentUser.textContent = username;
    localStorage.setItem('username', username);
    localStorage.setItem('photo', userData.photo);
    localStorage.setItem('bio', userData.bio);
    updateStatusBar();
    switchTab('#main');
    triggerAdsterraInterstitial(); // Pop-up ao logar
});

socket.on('loginError', (msg) => {
    errorMessage.textContent = msg;
});

socket.on('updateUsers', (users) => {
    userList.innerHTML = '';
    users.forEach(user => {
        userProfiles.set(user.username, user);
        const li = document.createElement('li');
        li.textContent = user.username;
        li.style.color = user.color;
        li.onclick = () => switchTab(user.username);
        li.ondblclick = () => showProfilePopup(user.username);
        userList.appendChild(li);
    });
    updateStatusBar();
});

socket.on('newMessage', (data) => {
    if ((currentChat === '#main' && data.target === '#main') ||
        (currentChat !== '#main' && (data.user === currentChat || data.user === username))) {
        setTimeout(() => {
            displayMessage(data);
            // Pop-up a cada 5 mensagens
            messageCount++;
            if (messageCount % 5 === 0) triggerAdsterraInterstitial();
        }, 500);
    }
});

socket.on('systemMessage', (text) => {
    displayMessage({ text: `*** ${text} ***`, system: true });
});

socket.on('loadMessages', (history) => {
    chatBox.innerHTML = `<div>--- ${currentChat === '#main' ? 'Fórum' : `Chat com ${currentChat}`} ---</div>`;
    history.forEach(displayMessage);
});

function sendMessage() {
    const text = messageInput.value.trim();
    const file = mediaInput.files[0];
    if (!text && !file) return;

    if (file) {
        uploadMedia(file, (mediaData) => {
            socket.emit('sendMessage', { text, target: currentChat, media: mediaData });
            resetMediaInput();
            triggerAdsterraPopunder(); // Pop-up ao enviar mídia
        });
    } else {
        socket.emit('sendMessage', { text, target: currentChat });
        messageInput.value = '';
    }
}

function uploadMedia(file, callback) {
    const formData = new FormData();
    formData.append('media', file);
    fetch('https://extraordinary-yeot-cba061.netlify.app/, { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => callback(data))
        .catch(err => displayMessage({ text: 'Erro ao enviar mídia', system: true }));
}

function displayMessage(data) {
    const div = document.createElement('div');
    div.className = 'message';
    if (data.system) {
        div.textContent = data.text;
        div.style.color = '#00ffff';
    } else {
        const mediaContent = data.media
            ? data.media.type === 'video'
                ? `<div class="video-player"><video controls src="${data.media.filePath}"></video></div>`
                : `<img src="${data.media.filePath}" alt="Mídia" class="media">`
            : '';
        div.innerHTML = `
            <img src="${data.photo}" class="profile-pic" alt="${data.user}">
            <span style="color: ${data.color}" onclick="showProfilePopup('${data.user}')">${data.user}</span>: ${data.text}
            ${mediaContent}
            <span style="color: #00ffff">[${new Date(data.timestamp).toLocaleTimeString()}]</span>
        `;
    }
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function switchTab(target) {
    currentChat = target;
    chatBox.innerHTML = `<div>--- ${target === '#main' ? 'Fórum' : `Chat com ${target}`} ---</div>`;
    forumTab.classList.toggle('active', target === '#main');
    privateTab.classList.toggle('active', target !== '#main');
    privateTab.textContent = target === '#main' ? 'Privado' : `Chat: ${target}`;
    socket.emit('loadChat', target);
    triggerAdsterraInterstitial(); // Pop-up ao mudar de chat
}

function updateStatusBar() {
    const user = userProfiles.get(username);
    statusBar.textContent = `Nick: ${username} | Mensagens: ${user?.messageCount || 0}`;
}

function showProfilePopup(user) {
    const profile = userProfiles.get(user);
    if (profile) {
        popupPhoto.src = profile.photo;
        popupUsername.textContent = `Nick: ${profile.username}`;
        popupBio.textContent = `Bio: ${profile.bio}`;
        profilePopup.style.display = 'block';
    }
}

function closePopup(id) {
    document.getElementById(id).style.display = 'none';
}

function resetMediaInput() {
    messageInput.value = '';
    mediaInput.value = '';
    mediaPreview.innerHTML = '';
}

function triggerAdsterraInterstitial() {
    const script = document.getElementById('adsterraInterstitialScript');
    script.innerHTML = `
        var adsterraPopUp2 = {
            key: 'd556b97f30a68f48c48b9698bb048bcc',
            format: 'interstitial',
            params: {}
        };
        (function() {
            var s = document.createElement('script');
            s.src = '//www.topcreativeformat.com/d556b97f30a68f48c48b9698bb048bcc/invoke.js';
            s.async = true;
            document.head.appendChild(s);
        })();
    `;
}

function triggerAdsterraPopunder() {
    const script = document.createElement('script');
    script.innerHTML = `
        var adsterraPopUp3 = {
            key: 'd556b97f30a68f48c48b9698bb048bcc',
            format: 'popunder',
            params: {}
        };
        (function() {
            var s = document.createElement('script');
            s.src = '//www.topcreativeformat.com/d556b97f30a68f48c48b9698bb048bcc/invoke.js';
            s.async = true;
            document.head.appendChild(s);
        })();
    `;
    document.head.appendChild(script);
}

logoutButton.addEventListener('click', () => {
    localStorage.clear();
    socket.disconnect();
    window.location.reload();
});

mediaInput.addEventListener('change', () => {
    const file = mediaInput.files[0];
    if (file) {
        mediaPreview.innerHTML = file.type.startsWith('video')
            ? `<video src="${URL.createObjectURL(file)}" controls></video>`
            : `<img src="${URL.createObjectURL(file)}" alt="Prévia">`;
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});