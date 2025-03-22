export function initializeChat() {
    const { db, storage, ref, set, onValue, off, push, update, runTransaction, storageRef, uploadBytes, getDownloadURL } = window.firebaseApp;

    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatContainer = document.getElementById('chatContainer');
    const usernameInput = document.getElementById('usernameInput');
    const profilePhotoInput = document.getElementById('profilePhotoInput');
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
    const profileTab = document.getElementById('profileTab');
    const sendButton = document.getElementById('sendButton');
    const mediaPreview = document.getElementById('mediaPreview');
    const photoPreview = document.getElementById('photoPreview');
    const statusBar = document.getElementById('statusBar');
    const profilePopup = document.getElementById('profilePopup');
    const popupPhoto = document.getElementById('popupPhoto');
    const popupUsername = document.getElementById('popupUsername');
    const popupBio = document.getElementById('popupBio');
    const chatInput = document.getElementById('chatInput');
    const profileEdit = document.getElementById('profileEdit');
    const editPhotoInput = document.getElementById('editPhotoInput');
    const editPhotoPreview = document.getElementById('editPhotoPreview');
    const editBioInput = document.getElementById('editBioInput');
    const saveProfileButton = document.getElementById('saveProfileButton');

    let username = localStorage.getItem('username') || '';
    let userId = localStorage.getItem('userId') || generateUserId();
    let currentChat = '#main';
    let userProfiles = new Map();
    let messageCount = 0;
    let lastMessage = '';
    let lastMessageTime = 0;

    function generateUserId() {
        const id = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', id);
        return id;
    }

    function generateColor() {
        return `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
    }

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
        const file = profilePhotoInput.files[0];
        if (file) {
            uploadPhoto(file, (photoUrl) => {
                loginUser(username, userId, photoUrl);
            });
        } else {
            loginUser(username, userId);
        }
    });

    profilePhotoInput.addEventListener('change', () => {
        const file = profilePhotoInput.files[0];
        if (file) {
            photoPreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Prévia">`;
            triggerAdsterraPopunder();
        }
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
            console.error(err);
        });
    }

    onValue(ref(db, 'users'), (snapshot) => {
        userList.innerHTML = '';
        userProfiles.clear();
        snapshot.forEach(child => {
            const user = child.val();
            userProfiles.set(user.username, user);
            const li = document.createElement('li');
            li.innerHTML = `<img src="${user.photo}" class="profile-pic" alt="${user.username}" onerror="this.src='/default-profile.png'"> ${user.username}`;
            li.style.color = user.color;
            li.onclick = () => switchTab(user.username);
            li.ondblclick = () => showProfilePopup(user.username);
            userList.appendChild(li);
        });
        updateStatusBar();
    });

    function loadMessages(target) {
        const dbRef = target === '#main' ? ref(db, 'forumMessages') : ref(db, 'privateMessages/' + [username, target].sort().join('-'));
        off(dbRef);
        onValue(dbRef, (snapshot) => {
            if (!chatBox.innerHTML.includes(`--- ${target === '#main' ? 'Fórum' : `Chat com ${target}`} ---`)) {
                chatBox.innerHTML = `<div>--- ${target === '#main' ? 'Fórum' : `Chat com ${target}`} ---</div>`;
            }
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
        const now = Date.now();

        if ((!text && !file) || (text === lastMessage && now - lastMessageTime < 1000)) {
            displayMessage({ text: 'Aguarde 1 segundo ou evite repetir mensagens!', system: true });
            return;
        }

        if (now - lastMessageTime < 1000) {
            setTimeout(sendMessage, 1000 - (now - lastMessageTime));
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
                triggerAdsterraPopunder();
            });
        } else {
            pushMessage(message, currentChat);
            messageInput.value = '';
            triggerAdsterraInterstitial();
        }

        lastMessage = text;
        lastMessageTime = now;
    }

    function uploadPhoto(file, callback) {
        const fileRef = storageRef(storage, 'profiles/' + userId + '-' + file.name);
        uploadBytes(fileRef, file).then((snapshot) => {
            getDownloadURL(snapshot.ref).then((url) => {
                callback(url);
            }).catch(err => {
                displayMessage({ text: 'Erro ao obter URL da foto: ' + err.message, system: true });
                console.error(err);
            });
        }).catch(err => {
            displayMessage({ text: 'Erro ao enviar foto: ' + err.message, system: true });
            console.error(err);
        });
    }

    function uploadMedia(file, callback) {
        const fileRef = storageRef(storage, 'uploads/' + Date.now() + '-' + file.name);
        uploadBytes(fileRef, file).then((snapshot) => {
            getDownloadURL(snapshot.ref).then((url) => {
                callback({ filePath: url, type: file.type.startsWith('video') ? 'video' : 'image' });
            }).catch(err => {
                displayMessage({ text: 'Erro ao obter URL da mídia: ' + err.message, system: true });
                console.error(err);
            });
        }).catch(err => {
            displayMessage({ text: 'Erro ao enviar mídia: ' + err.message, system: true });
            console.error(err);
        });
    }

    function pushMessage(message, target) {
        const dbRef = target === '#main' ? ref(db, 'forumMessages') : ref(db, 'privateMessages/' + [username, target].sort().join('-'));
        push(dbRef, message).then(() => {
            runTransaction(ref(db, 'users/' + userId + '/messageCount'), (count) => {
                return (count || 0) + 1;
            });
            displayMessage(message);
        }).catch(err => {
            displayMessage({ text: 'Erro ao enviar mensagem: ' + err.message, system: true });
            console.error(err);
        });
    }

    function displayMessage(data) {
        const div = document.createElement('div');
        div.className = 'message';
        if (data.system) {
            div.textContent = data.text;
            div.style.color = '#ff0000';
        } else {
            const mediaContent = data.media
                ? data.media.type === 'video'
                    ? `<div class="video-player"><video controls src="${data.media.filePath}" onerror="this.src='/default-profile.png'"></video></div>`
                    : `<img src="${data.media.filePath}" alt="Mídia" class="media" onerror="this.src='/default-profile.png'">`
                : '';
            div.innerHTML = `
                <img src="${data.photo}" class="profile-pic" alt="${data.user}" onerror="this.src='/default-profile.png'">
                <span style="color: ${data.color}" onclick="showProfilePopup('${data.user}')">${data.user}</span>: ${data.text}
                ${mediaContent}
                <span style="color: #00b7eb">[${new Date(data.timestamp).toLocaleTimeString()}]</span>
            `;
        }
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
        triggerAdsterraPopunder();
    }

    function switchTab(target) {
        currentChat = target;
        chatBox.innerHTML = `<div>--- ${target === '#main' ? 'Fórum' : target === '#profile' ? 'Perfil' : `Chat com ${target}`} ---</div>`;
        forumTab.classList.toggle('active', target === '#main');
        privateTab.classList.toggle('active', target !== '#main' && target !== '#profile');
        profileTab.classList.toggle('active', target === '#profile');
        privateTab.textContent = target === '#main' || target === '#profile' ? 'Privado' : `Chat: ${target}`;
        
        chatInput.style.display = target === '#profile' ? 'none' : 'block';
        profileEdit.style.display = target === '#profile' ? 'block' : 'none';

        if (target === '#profile') {
            loadProfile();
        } else {
            loadMessages(target);
        }
        triggerAdsterraInterstitial();
    }

    function loadProfile() {
        const user = userProfiles.get(username);
        if (user) {
            editPhotoPreview.src = user.photo;
            editBioInput.value = user.bio;
        }
    }

    editPhotoInput.addEventListener('change', () => {
        const file = editPhotoInput.files[0];
        if (file) {
            editPhotoPreview.src = URL.createObjectURL(file);
            triggerAdsterraPopunder();
        }
    });

    saveProfileButton.addEventListener('click', () => {
        const file = editPhotoInput.files[0];
        const bio = editBioInput.value.trim();
        if (file) {
            uploadPhoto(file, (photoUrl) => {
                updateProfile(photoUrl, bio);
            });
        } else {
            updateProfile(userProfiles.get(username).photo, bio);
        }
    });

    function updateProfile(photo, bio) {
        update(ref(db, 'users/' + userId), { photo, bio }).then(() => {
            localStorage.setItem('photo', photo);
            localStorage.setItem('bio', bio);
            displayMessage({ text: 'Perfil atualizado com sucesso!', system: true });
            triggerAdsterraInterstitial();
        }).catch(err => {
            displayMessage({ text: 'Erro ao atualizar perfil: ' + err.message, system: true });
            console.error(err);
        });
    }

    function updateStatusBar() {
        const user = userProfiles.get(username);
        statusBar.textContent = `Nick: ${username} | Mensagens: ${user?.messageCount || 0}`;
        triggerAdsterraPopunder();
    }

    function showProfilePopup(user) {
        const profile = userProfiles.get(user);
        if (profile) {
            popupPhoto.src = profile.photo;
            popupUsername.textContent = `Nick: ${profile.username}`;
            popupBio.textContent = `Bio: ${profile.bio}`;
            profilePopup.style.display = 'block';
            triggerAdsterraInterstitial();
        }
    }

    window.closePopup = function(id) {
        document.getElementById(id).style.display = 'none';
        triggerAdsterraPopunder();
    };

    function resetMediaInput() {
        messageInput.value = '';
        mediaInput.value = '';
        mediaPreview.innerHTML = '';
    }

    function triggerAdsterraInterstitial() {
        document.getElementById('adsterraInterstitialScript').innerHTML = `
            (function() {
                var s = document.createElement('script');
                s.src = '//pl26183298.effectiveratecpm.com/d3/57/0b/d3570b7eea87093e0e4caffd3d7a819a.js';
                s.async = true;
                document.head.appendChild(s);
            })();
        `;
    }

    function triggerAdsterraPopunder() {
        const script = document.createElement('script');
        script.src = '//pl26183298.effectiveratecpm.com/d3/57/0b/d3570b7eea87093e0e4caffd3d7a819a.js';
        script.async = true;
        document.head.appendChild(script);
    }

    logoutButton.addEventListener('click', () => {
        update(ref(db, 'users/' + userId), { online: false });
        localStorage.clear();
        window.location.reload();
        triggerAdsterraInterstitial();
    });

    mediaInput.addEventListener('change', () => {
        const file = mediaInput.files[0];
        if (file) {
            mediaPreview.innerHTML = file.type.startsWith('video')
                ? `<video src="${URL.createObjectURL(file)}" controls></video>`
                : `<img src="${URL.createObjectURL(file)}" alt="Prévia">`;
            triggerAdsterraPopunder();
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    window.sendMessage = sendMessage;
    window.switchTab = switchTab;
    window.showProfilePopup = showProfilePopup;
}