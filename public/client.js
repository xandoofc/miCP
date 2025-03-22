export function initializeChat() {
    const { db, storage, ref, set, onValue, off, push, update, transaction, storageRef, uploadBytes, getDownloadURL } = window.firebaseApp;

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
    let messageCount = 0;

    function generateUserId() {
        const id = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', id);
        return id;
    }

    function generateColor() {
        return `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
    }

    // Autologin
    if (username) {
        loginUser(username, userId, localStorage.getItem('photo'), localStorage.getItem('bio'));
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
        loginUser(username, userId);
    });

    function loginUser(username, userId, photo = '/default-profile.png', bio = 'Sem bio ainda.') {
        const userData = {
            username, userId, online: true,
            photo, bio, joined: Date.now(),
            color: generateColor(), messageCount: 0
        };
        set(ref(db, 'users/' + userId), userData).then(() => {
            welcomeScreen.style.display = 'none';
            chatContainer.style.display = 'block';
            currentUser.textContent = username;
            localStorage.setItem('username', username);
            localStorage.setItem('photo', photo);
            localStorage.setItem('bio', bio);
            updateStatusBar();
            switchTab('#main');
            triggerAdsterraInterstitial();
        }).catch(err => {
            errorMessage.textContent = 'Erro ao conectar: ' + err.message;
        });
    }

    // Atualizar lista de usuários
    onValue(ref(db, 'users'), (snapshot) => {
        userList.innerHTML = '';
        userProfiles.clear();
        snapshot.forEach(child => {
            const user = child.val();
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

    // Carregar mensagens
    function loadMessages(target) {
        const dbRef = target === '#main' ? ref(db, 'forumMessages') : ref(db, 'privateMessages/' + [username, target].sort().join('-'));
        off(dbRef); // Remove listeners anteriores
        onValue(dbRef, (snapshot) => {
            chatBox.innerHTML = `<div>--- ${target === '#main' ? 'Fórum' : `Chat com ${target}`} ---</div>`;
            snapshot.forEach(child => {
                const data = child.val();
                if ((currentChat === '#main' && target === '#main') ||
                    (currentChat !== '#main' && (data.user === currentChat || data.user === username))) {
                    setTimeout(() => {
                        displayMessage(data);
                        messageCount++;
                        if (messageCount % 5 === 0) triggerAdsterraInterstitial();
                    }, 500);
                }
            });
        }, { onlyOnce: false });
    }

    function sendMessage() {
        const text = messageInput.value.trim();
        const file = mediaInput.files[0];
        if (!text && !file) return;

        const message = {
            user: username,
            text,
            timestamp: Date.now(),
            color: userProfiles.get(username).color,
            photo: userProfiles.get(username).photo
        };

        if (file) {
            uploadMedia(file, (mediaData) => {
                message.media = mediaData;
                pushMessage(message, currentChat);
                resetMediaInput();
                triggerAdsterraPopunder();
            });
        } else {
            pushMessage(message, currentChat);
            messageInput.value = '';
        }
    }

    function uploadMedia(file, callback) {
        const fileRef = storageRef(storage, 'uploads/' + Date.now() + '-' + file.name);
        uploadBytes(fileRef, file).then((snapshot) => {
            getDownloadURL(snapshot.ref).then((url) => {
                callback({ filePath: url, type: file.type.startsWith('video') ? 'video' : 'image' });
            });
        }).catch(err => displayMessage({ text: 'Erro ao enviar mídia: ' + err.message, system: true }));
    }

    function pushMessage(message, target) {
        const dbRef = target === '#main' ? ref(db, 'forumMessages') : ref(db, 'privateMessages/' + [username, target].sort().join('-'));
        push(dbRef, message).then(() => {
            transaction(ref(db, 'users/' + userId + '/messageCount'), count => (count || 0) + 1);
        });
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
        loadMessages(target);
        triggerAdsterraInterstitial();
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

    window.closePopup = function(id) {
        document.getElementById(id).style.display = 'none';
    };

    function resetMediaInput() {
        messageInput.value = '';
        mediaInput.value = '';
        mediaPreview.innerHTML = '';
    }

    function triggerAdsterraInterstitial() {
        document.getElementById('adsterraInterstitialScript').innerHTML = `
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
        update(ref(db, 'users/' + userId), { online: false });
        localStorage.clear();
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

    window.sendMessage = sendMessage;
    window.switchTab = switchTab;
    window.showProfilePopup = showProfilePopup;
}