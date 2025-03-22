export function initializeChat() {
    const { db, ref, set, onValue, off, push, update, runTransaction } = window.firebaseApp;

    const elements = {
        welcomeScreen: document.getElementById('welcomeScreen'),
        chatContainer: document.getElementById('chatContainer'),
        usernameInput: document.getElementById('usernameInput'),
        passwordInput: document.getElementById('passwordInput'),
        joinButton: document.getElementById('joinButton'),
        currentUser: document.getElementById('currentUser'),
        chatBox: document.getElementById('chatBox'),
        messageInput: document.getElementById('messageInput'),
        userList: document.getElementById('userList'),
        errorMessage: document.getElementById('errorMessage'),
        logoutButton: document.getElementById('logoutButton'),
        forumTab: document.getElementById('forumTab'),
        privateTab: document.getElementById('privateTab'),
        profileTab: document.getElementById('profileTab'),
        hentaiTab: document.getElementById('hentaiTab'),
        sendButton: document.getElementById('sendButton'),
        chatInput: document.getElementById('chatInput'),
        statusBar: document.getElementById('statusBar')
    };

    let username = localStorage.getItem('username') || '';
    let userId = localStorage.getItem('userId') || generateUserId();
    let currentChat = '#main';
    let userProfiles = new Map();
    let messageIds = new Set(); // Track message IDs to prevent duplication
    let lastMessage = '';
    let lastMessageTime = 0;

    function generateUserId() {
        const id = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', id);
        return id;
    }

    if (username) loginUser(username, userId, localStorage.getItem('photo'), localStorage.getItem('bio'));
    else elements.welcomeScreen.style.display = 'block';

    elements.joinButton.addEventListener('click', () => {
        username = elements.usernameInput.value.trim();
        const password = elements.passwordInput.value;
        if (username.length < 3) {
            elements.errorMessage.textContent = 'Nick mínimo 3 caracteres!';
            return;
        }
        elements.errorMessage.textContent = 'Conectando...';
        loginUser(username, userId, null, null, password === '681227' && username === 'admin');
    });

    function loginUser(username, userId, photo = '/default-profile.png', bio = 'Sem bio ainda.', isAdmin = false) {
        const userData = {
            username, userId, online: true, photo, bio, joined: Date.now(),
            color: generateColor(), messageCount: 0, lastSeen: Date.now(), admin: isAdmin
        };
        set(ref(db, 'users/' + userId), userData).then(() => {
            elements.welcomeScreen.style.display = 'none';
            elements.chatContainer.style.display = 'block';
            elements.currentUser.textContent = username;
            localStorage.setItem('username', username);
            localStorage.setItem('photo', photo);
            localStorage.setItem('bio', bio);
            localStorage.setItem('isAdmin', isAdmin);
            updateStatusBar();
            switchTab('#main');
        }).catch(err => {
            elements.errorMessage.textContent = 'Erro ao conectar: ' + err.message;
        });
    }

    onValue(ref(db, 'users'), (snapshot) => {
        elements.userList.innerHTML = '';
        userProfiles.clear();
        snapshot.forEach(child => {
            const user = child.val();
            userProfiles.set(user.username, user);
            const li = document.createElement('li');
            li.innerHTML = `<img src="${user.photo}" class="profile-pic" alt="${user.username}" onerror="this.src='/default-profile.png'"> ${user.username}`;
            li.style.color = user.color;
            li.onclick = () => switchTab(user.username);
            elements.userList.appendChild(li);
        });
        updateStatusBar();
    });

    function loadMessages(target) {
        const dbRef = target === '#main' ? ref(db, 'forumMessages') : 
                     target === '#hentai' ? ref(db, 'hentaiMessages') : 
                     ref(db, 'privateMessages/' + [username, target].sort().join('-'));
        off(dbRef);
        onValue(dbRef, (snapshot) => {
            elements.chatBox.innerHTML = `<div>--- ${target === '#main' ? 'Fórum' : target === '#hentai' ? 'Hentai (Somente Leitura)' : `Chat com ${target}`} ---</div>`;
            messageIds.clear();
            snapshot.forEach(child => {
                const data = child.val();
                data.id = child.key;
                if (!messageIds.has(data.id)) {
                    messageIds.add(data.id);
                    displayMessage(data);
                }
            });
        }, { onlyOnce: false });
    }

    function sendMessage() {
        const text = elements.messageInput.value.trim();
        const now = Date.now();
        if (!text || (text === lastMessage && now - lastMessageTime < 1000) || currentChat === '#hentai') return;

        const message = {
            user: username,
            text,
            timestamp: now,
            color: userProfiles.get(username).color,
            photo: userProfiles.get(username).photo
        };
        pushMessage(message, currentChat);
        elements.messageInput.value = '';
        lastMessage = text;
        lastMessageTime = now;
    }

    function pushMessage(message, target) {
        const dbRef = target === '#main' ? ref(db, 'forumMessages') : ref(db, 'privateMessages/' + [username, target].sort().join('-'));
        push(dbRef, message).then(() => {
            runTransaction(ref(db, 'users/' + userId + '/messageCount'), (count) => (count || 0) + 1);
        });
    }

    function displayMessage(data) {
        const div = document.createElement('div');
        div.className = 'message';
        div.dataset.id = data.id;
        const mediaContent = data.media ? `<video src="${data.media.filePath}" class="media" controls></video>` : '';
        div.innerHTML = `
            <img src="${data.photo}" class="profile-pic" alt="${data.user}" onerror="this.src='/default-profile.png'">
            <span style="color: ${data.color}">${data.user}</span>: ${data.text || ''}
            ${mediaContent}
            <span style="color: #000080">[${new Date(data.timestamp).toLocaleTimeString()}]</span>
        `;
        elements.chatBox.appendChild(div);
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    }

    function switchTab(target) {
        currentChat = target;
        elements.forumTab.classList.toggle('active', target === '#main');
        elements.privateTab.classList.toggle('active', target !== '#main' && target !== '#profile' && target !== '#hentai');
        elements.profileTab.classList.toggle('active', target === '#profile');
        elements.hentaiTab.classList.toggle('active', target === '#hentai');
        elements.chatInput.style.display = target === '#profile' || target === '#hentai' ? 'none' : 'block';
        loadMessages(target);
    }

    function updateStatusBar() {
        const user = userProfiles.get(username);
        elements.statusBar.textContent = `Nick: ${username} | Msgs: ${user?.messageCount || 0} | Online: ${userProfiles.size}`;
    }

    window.sendMessage = sendMessage;
    window.switchTab = switchTab;
    window.toggleAdminLogin = () => {
        elements.passwordInput.style.display = elements.passwordInput.style.display === 'none' ? 'block' : 'none';
    };
    window.generateColor = () => `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
}