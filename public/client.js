export function initializeChat() {
    const { db, storage, ref, set, onValue, off, push, update, runTransaction, storageRef, uploadBytes, getDownloadURL } = window.firebaseApp;

    const elements = {
        welcomeScreen: document.getElementById('welcomeScreen'),
        chatContainer: document.getElementById('chatContainer'),
        usernameInput: document.getElementById('usernameInput'),
        profilePhotoInput: document.getElementById('profilePhotoInput'),
        joinButton: document.getElementById('joinButton'),
        currentUser: document.getElementById('currentUser'),
        chatBox: document.getElementById('chatBox'),
        messageInput: document.getElementById('messageInput'),
        mediaInput: document.getElementById('mediaInput'),
        userList: document.getElementById('userList'),
        errorMessage: document.getElementById('errorMessage'),
        logoutButton: document.getElementById('logoutButton'),
        forumTab: document.getElementById('forumTab'),
        privateTab: document.getElementById('privateTab'),
        profileTab: document.getElementById('profileTab'),
        sendButton: document.getElementById('sendButton'),
        mediaPreview: document.getElementById('mediaPreview'),
        photoPreview: document.getElementById('photoPreview'),
        statusBar: document.getElementById('statusBar'),
        profilePopup: document.getElementById('profilePopup'),
        popupPhoto: document.getElementById('popupPhoto'),
        popupUsername: document.getElementById('popupUsername'),
        popupBio: document.getElementById('popupBio'),
        chatInput: document.getElementById('chatInput'),
        profileEdit: document.getElementById('profileEdit'),
        editPhotoInput: document.getElementById('editPhotoInput'),
        editPhotoPreview: document.getElementById('editPhotoPreview'),
        editBioInput: document.getElementById('editBioInput'),
        saveProfileButton: document.getElementById('saveProfileButton')
    };

    let username = localStorage.getItem('username') || '';
    let userId = localStorage.getItem('userId') || generateUserId();
    let currentChat = '#main';
    let userProfiles = new Map();
    let messageCount = 0;
    let lastMessage = '';
    let lastMessageTime = 0;
    let userColors = {};
    let typingUsers = new Set();

    function generateUserId() {
        const id = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', id);
        return id;
    }

    function generateColor() {
        return `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
    }

    if (username) loginUser(username, userId, localStorage.getItem('photo'), localStorage.getItem('bio'));
    else elements.welcomeScreen.style.display = 'block';

    elements.joinButton.addEventListener('click', () => {
        username = elements.usernameInput.value.trim();
        if (username.length < 3) {
            elements.errorMessage.textContent = 'Nick mínimo 3 caracteres!';
            return;
        }
        elements.errorMessage.textContent = 'Conectando...';
        const file = elements.profilePhotoInput.files[0];
        if (file) uploadPhoto(file, (photoUrl) => loginUser(username, userId, photoUrl));
        else loginUser(username, userId);
    });

    elements.profilePhotoInput.addEventListener('change', () => {
        const file = elements.profilePhotoInput.files[0];
        if (file) elements.photoPreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Prévia">`;
    });

    function loginUser(username, userId, photo = '/default-profile.png', bio = 'Sem bio ainda.') {
        const userData = {
            username, userId, online: true, photo, bio, joined: Date.now(),
            color: generateColor(), messageCount: 0, lastSeen: Date.now()
        };
        set(ref(db, 'users/' + userId), userData).then(() => {
            elements.welcomeScreen.style.display = 'none';
            elements.chatContainer.style.display = 'block';
            elements.currentUser.textContent = username;
            localStorage.setItem('username', username);
            localStorage.setItem('photo', photo);
            localStorage.setItem('bio', bio);
            updateStatusBar();
            switchTab('#main');
            startTypingDetection();
        }).catch(err => {
            elements.errorMessage.textContent = 'Erro ao conectar: ' + err.message;
            console.error(err);
        });
    }

    onValue(ref(db, 'users'), (snapshot) => {
        elements.userList.innerHTML = '';
        userProfiles.clear();
        snapshot.forEach(child => {
            const user = child.val();
            userProfiles.set(user.username, user);
            userColors[user.username] = user.color;
            const li = document.createElement('li');
            li.innerHTML = `<img src="${user.photo}" class="profile-pic" alt="${user.username}" onerror="this.src='/default-profile.png'"> ${user.username} ${user.typing ? '[Digitando...]' : ''}`;
            li.style.color = user.color;
            li.onclick = () => switchTab(user.username);
            li.ondblclick = () => showProfilePopup(user.username);
            elements.userList.appendChild(li);
        });
        updateStatusBar();
    });

    function loadMessages(target) {
        const dbRef = target === '#main' ? ref(db, 'forumMessages') : ref(db, 'privateMessages/' + [username, target].sort().join('-'));
        off(dbRef);
        onValue(dbRef, (snapshot) => {
            if (!elements.chatBox.innerHTML.includes(`--- ${target === '#main' ? 'Fórum' : `Chat com ${target}`} ---`)) {
                elements.chatBox.innerHTML = `<div>--- ${target === '#main' ? 'Fórum' : `Chat com ${target}`} ---</div>`;
            }
            snapshot.forEach(child => {
                const data = child.val();
                if ((currentChat === '#main' && target === '#main') ||
                    (currentChat !== '#main' && (data.user === currentChat || data.user === username))) {
                    displayMessage(data);
                }
            });
        }, { onlyOnce: false });
    }

    function sendMessage() {
        const text = elements.messageInput.value.trim();
        const file = elements.mediaInput.files[0];
        const now = Date.now();

        if ((!text && !file) || (text === lastMessage && now - lastMessageTime < 1000)) {
            displayMessage({ text: 'Aguarde 1 segundo ou evite repetir mensagens!', system: true });
            return;
        }

        const message = {
            user: username,
            text,
            timestamp: now,
            color: userProfiles.get(username).color,
            photo: userProfiles.get(username).photo
        };

        if (file) {
            uploadMedia(file, (mediaData) => {
                message.media = mediaData;
                pushMessage(message, currentChat);
                resetMediaInput();
            });
        } else {
            pushMessage(message, currentChat);
            elements.messageInput.value = '';
        }

        lastMessage = text;
        lastMessageTime = now;
    }

    async function uploadPhoto(file, callback) {
        const compressedFile = await compressFile(file, 0.7, 100); // Smaller for profile
        const fileRef = storageRef(storage, 'profiles/' + userId + '-' + Date.now() + '.jpg');
        uploadBytes(fileRef, compressedFile).then((snapshot) => {
            getDownloadURL(snapshot.ref).then(callback).catch(err => {
                displayMessage({ text: 'Erro ao obter URL da foto: ' + err.message, system: true });
            });
        }).catch(err => {
            displayMessage({ text: 'Erro ao enviar foto: ' + err.message, system: true });
        });
    }

    async function uploadMedia(file, callback) {
        const compressedFile = await compressFile(file, 0.8, 600); // Optimized for media
        const fileRef = storageRef(storage, 'uploads/' + Date.now() + '.media');
        uploadBytes(fileRef, compressedFile).then((snapshot) => {
            getDownloadURL(snapshot.ref).then((url) => {
                callback({ filePath: url, type: file.type.startsWith('video') ? 'video' : 'image' });
            }).catch(err => {
                displayMessage({ text: 'Erro ao obter URL da mídia: ' + err.message, system: true });
            });
        }).catch(err => {
            displayMessage({ text: 'Erro ao enviar mídia: ' + err.message, system: true });
        });
    }

    function pushMessage(message, target) {
        const dbRef = target === '#main' ? ref(db, 'forumMessages') : ref(db, 'privateMessages/' + [username, target].sort().join('-'));
        push(dbRef, message).then(() => {
            runTransaction(ref(db, 'users/' + userId + '/messageCount'), (count) => (count || 0) + 1);
            displayMessage(message);
            notifyUser(message);
        }).catch(err => {
            displayMessage({ text: 'Erro ao enviar mensagem: ' + err.message, system: true });
        });
    }

    function displayMessage(data) {
        if (localStorage.getItem(`ignore_${data.user}`)) return;
        const div = document.createElement('div');
        div.className = 'message';
        if (data.system) {
            div.textContent = data.text;
            div.style.color = '#ff0000';
        } else {
            const mediaContent = data.media
                ? data.media.type === 'video'
                    ? `<div class="video-player" data-src="${data.media.filePath}"></div>`
                    : `<img src="${data.media.filePath}" alt="Mídia" class="media" onerror="this.src='/default-profile.png'">`
                : '';
            div.innerHTML = `
                <img src="${data.photo}" class="profile-pic" alt="${data.user}" onerror="this.src='/default-profile.png'">
                <span style="color: ${data.color}" onclick="showProfilePopup('${data.user}')">${data.user}</span>: ${data.text}
                ${mediaContent}
                <span style="color: #00b7eb">[${new Date(data.timestamp).toLocaleTimeString()}]</span>
            `;
            if (data.media && data.media.type === 'video') initWebGLVideo(div.querySelector('.video-player'));
        }
        elements.chatBox.appendChild(div);
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    }

    function switchTab(target) {
        currentChat = target;
        elements.chatBox.innerHTML = `<div>--- ${target === '#main' ? 'Fórum' : target === '#profile' ? 'Perfil' : `Chat com ${target}`} ---</div>`;
        elements.forumTab.classList.toggle('active', target === '#main');
        elements.privateTab.classList.toggle('active', target !== '#main' && target !== '#profile');
        elements.profileTab.classList.toggle('active', target === '#profile');
        elements.privateTab.textContent = target === '#main' || target === '#profile' ? 'Privado' : `Chat: ${target}`;
        elements.chatInput.style.display = target === '#profile' ? 'none' : 'block';
        elements.profileEdit.style.display = target === '#profile' ? 'block' : 'none';
        if (target === '#profile') loadProfile();
        else loadMessages(target);
    }

    function loadProfile() {
        const user = userProfiles.get(username);
        if (user) {
            elements.editPhotoPreview.src = user.photo;
            elements.editBioInput.value = user.bio;
        }
    }

    elements.editPhotoInput.addEventListener('change', () => {
        const file = elements.editPhotoInput.files[0];
        if (file) elements.editPhotoPreview.src = URL.createObjectURL(file);
    });

    elements.saveProfileButton.addEventListener('click', () => {
        const file = elements.editPhotoInput.files[0];
        const bio = elements.editBioInput.value.trim();
        if (file) uploadPhoto(file, (photoUrl) => updateProfile(photoUrl, bio));
        else updateProfile(userProfiles.get(username).photo, bio);
    });

    function updateProfile(photo, bio) {
        update(ref(db, 'users/' + userId), { photo, bio }).then(() => {
            localStorage.setItem('photo', photo);
            localStorage.setItem('bio', bio);
            displayMessage({ text: 'Perfil atualizado com sucesso!', system: true });
        }).catch(err => {
            displayMessage({ text: 'Erro ao atualizar perfil: ' + err.message, system: true });
        });
    }

    function updateStatusBar() {
        const user = userProfiles.get(username);
        elements.statusBar.textContent = `Nick: ${username} | Msgs: ${user?.messageCount || 0} | Online: ${userProfiles.size}`;
    }

    function showProfilePopup(user) {
        const profile = userProfiles.get(user);
        if (profile) {
            elements.popupPhoto.src = profile.photo;
            elements.popupUsername.textContent = `Nick: ${profile.username}`;
            elements.popupBio.textContent = `Bio: ${profile.bio}`;
            elements.profilePopup.style.display = 'block';
        }
    }

    window.closePopup = function(id) {
        document.getElementById(id).style.display = 'none';
    };

    function resetMediaInput() {
        elements.messageInput.value = '';
        elements.mediaInput.value = '';
        elements.mediaPreview.innerHTML = '';
    }

    async function compressFile(file, quality, maxSize) {
        if (file.type.startsWith('video')) return file;
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
            };
        });
    }

    function initWebGLVideo(container) {
        const video = document.createElement('video');
        video.src = container.dataset.src;
        video.controls = true;
        const canvas = document.createElement('canvas');
        canvas.width = 150;
        canvas.height = 100;
        const gl = canvas.getContext('webgl');
        if (!gl) return container.appendChild(video);
        container.appendChild(canvas);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        video.onplay = () => {
            function render() {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
                requestAnimationFrame(render);
            }
            render();
        };
        video.play();
    }

    function notifyUser(message) {
        if (message.user !== username && document.hidden) {
            new Notification(`Nova mensagem de ${message.user}`, { body: message.text });
        }
    }

    function startTypingDetection() {
        elements.messageInput.addEventListener('input', () => {
            update(ref(db, 'users/' + userId), { typing: true });
            clearTimeout(typingUsers[userId]);
            typingUsers[userId] = setTimeout(() => update(ref(db, 'users/' + userId), { typing: false }), 2000);
        });
    }

    // mIRC-like Commands
    window.commands = {
        '/nick': (newNick) => update(ref(db, 'users/' + userId), { username: newNick }),
        '/color': (color) => update(ref(db, 'users/' + userId), { color }),
        '/kick': (target) => userProfiles.get(username).admin && update(ref(db, 'users/' + userProfiles.get(target).userId), { online: false }),
        '/ban': (target) => userProfiles.get(username).admin && set(ref(db, 'bans/' + userProfiles.get(target).userId), { banned: true }),
        '/topic': (topic) => set(ref(db, 'forumTopic'), { text: topic, setBy: username }),
        '/whois': (user) => showProfilePopup(user),
        '/clear': () => elements.chatBox.innerHTML = '',
        '/pm': (user, msg) => sendPrivateMessage(user, msg),
        '/me': (action) => pushMessage({ user: username, text: `* ${username} ${action}`, system: true }, currentChat),
        '/join': (channel) => switchTab(channel),
        '/ignore': (user) => localStorage.setItem(`ignore_${user}`, true),
        '/unignore': (user) => localStorage.removeItem(`ignore_${user}`),
        '/list': () => displayMessage({ text: `Usuários: ${Array.from(userProfiles.keys()).join(', ')}`, system: true }),
        '/stats': () => displayMessage({ text: `Mensagens: ${messageCount}, Online: ${userProfiles.size}`, system: true }),
        '/away': (msg) => update(ref(db, 'users/' + userId), { away: msg || 'Ausente' }),
        '/back': () => update(ref(db, 'users/' + userId), { away: null }),
        '/quote': (text) => pushMessage({ user: username, text: `> ${text}`, system: true }, currentChat),
        '/roll': () => pushMessage({ user: username, text: `Rolou: ${Math.floor(Math.random() * 6) + 1}`, system: true }, currentChat),
        '/time': () => displayMessage({ text: `Hora: ${new Date().toLocaleTimeString()}`, system: true }),
        '/mode': (mode) => displayMessage({ text: `Modo ${mode} não implementado`, system: true }),
        '/op': (user) => userProfiles.get(username).admin && update(ref(db, 'users/' + userProfiles.get(user).userId), { admin: true }),
        '/deop': (user) => userProfiles.get(username).admin && update(ref(db, 'users/' + userProfiles.get(user).userId), { admin: false }),
        '/mute': (user) => userProfiles.get(username).admin && update(ref(db, 'users/' + userProfiles.get(user).userId), { muted: true }),
        '/unmute': (user) => userProfiles.get(username).admin && update(ref(db, 'users/' + userProfiles.get(user).userId), { muted: false }),
        '/invite': (user) => displayMessage({ text: `${user} foi convidado (simulação)`, system: true })
    };

    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = elements.messageInput.value.trim();
            if (text.startsWith('/')) {
                const [cmd, ...args] = text.split(' ');
                if (window.commands[cmd]) window.commands[cmd](...args);
                else displayMessage({ text: 'Comando inválido!', system: true });
                elements.messageInput.value = '';
            } else sendMessage();
        }
    });

    function sendPrivateMessage(user, msg) {
        pushMessage({ user: username, text: msg, timestamp: Date.now(), color: userProfiles.get(username).color, photo: userProfiles.get(username).photo }, user);
    }

    // WebSocket Fix (Removed placeholder, using Firebase instead)
    // If you have a WebSocket server, replace with real URL and uncomment:
    // const socket = new WebSocket('wss://your-real-server-url');
    // socket.onmessage = (event) => {
    //     const data = JSON.parse(event.data);
    //     if (data.type === 'message') displayMessage(data);
    // };

    window.sendMessage = sendMessage;
    window.switchTab = switchTab;
    window.showProfilePopup = showProfilePopup;
}