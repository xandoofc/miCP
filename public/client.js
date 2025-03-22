export function initializeChat() {
    const { db, ref, set, onValue, off, push, update, runTransaction, get } = window.firebaseApp;

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
        statusBar: document.getElementById('statusBar'),
        loginForm: document.getElementById('loginForm'),
        profileEdit: document.getElementById('profileEdit'),
        profileWidget: document.getElementById('profileWidget'),
        widgetPhoto: document.getElementById('widgetPhoto'),
        widgetName: document.getElementById('widgetName'),
        widgetBio: document.getElementById('widgetBio'),
        roleSelect: document.getElementById('roleSelect'),
        themeSelector: document.getElementById('themeSelector')
    };

    let username = localStorage.getItem('username') || '';
    let userId = localStorage.getItem('userId') || generateUserId();
    let currentChat = '#main';
    let userProfiles = new Map();
    let messageIds = new Set();
    let lastMessage = '';
    let lastMessageTime = 0;
    let userRole = localStorage.getItem('userRole') || 'user';

    // Available roles and their permissions
    const roles = {
        admin: { canDelete: true, canBan: true, canPromote: true, color: '#ff5555' },
        moderator: { canDelete: true, canBan: true, canPromote: false, color: '#5555ff' },
        vip: { canDelete: false, canBan: false, canPromote: false, color: '#ffaa00' },
        user: { canDelete: false, canBan: false, canPromote: false, color: '#ffffff' }
    };

    // Available themes
    const themes = [
        { id: 'theme-vaporwave', name: 'Windows 98' },
        { id: 'theme-retro', name: 'DOS Terminal' },
        { id: 'theme-frutiger', name: 'Commodore 64' },
        { id: 'theme-win95', name: 'AMIGA' },
        { id: 'theme-modern', name: 'Modern Dark' },
        { id: 'theme-light', name: 'Modern Light' },
        { id: 'theme-cyberpunk', name: 'Cyberpunk' },
        { id: 'theme-matrix', name: 'Matrix' }
    ];

    // Initialize theme selector if it exists
    if (elements.themeSelector) {
        elements.themeSelector.innerHTML = '';
        themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.name;
            elements.themeSelector.appendChild(option);
        });
        
        elements.themeSelector.addEventListener('change', () => {
            const selectedTheme = elements.themeSelector.value;
            document.body.className = selectedTheme;
            localStorage.setItem('theme', selectedTheme);
            
            if (username) {
                update(ref(db, 'users/' + userId), { theme: selectedTheme });
            }
        });
    }

    function generateUserId() {
        const id = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', id);
        return id;
    }

    function generateColor() {
        return `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
    }

    function toggleAdminLogin() {
        elements.passwordInput.style.display = elements.passwordInput.style.display === 'none' ? 'block' : 'none';
    }

    // Check if user exists and auto-login
    if (username) {
        get(ref(db, 'users/' + userId)).then((snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                loginUser(
                    userData.username, 
                    userId, 
                    userData.photo, 
                    userData.bio, 
                    userData.theme, 
                    userData.color,
                    userData.role || 'user'
                );
            } else {
                // User not found in database, clear localStorage
                localStorage.removeItem('username');
                localStorage.removeItem('userId');
                elements.welcomeScreen.style.display = 'block';
            }
        }).catch(() => {
            elements.welcomeScreen.style.display = 'block';
        });
    } else {
        elements.welcomeScreen.style.display = 'block';
    }

    elements.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        username = elements.usernameInput.value.trim();
        const password = elements.passwordInput.value;
        
        if (username.length < 3) {
            elements.errorMessage.textContent = 'Nick mínimo 3 caracteres!';
            return;
        }
        
        elements.errorMessage.textContent = 'Conectando...';
        
        // Check if username already exists
        get(ref(db, 'usernames/' + username)).then((snapshot) => {
            if (snapshot.exists() && snapshot.val().userId !== userId) {
                elements.errorMessage.textContent = 'Este nick já está em uso!';
                return;
            }
            
            let role = 'user';
            if (password === '681227' && username === 'admin') {
                role = 'admin';
            }
            
            loginUser(username, userId, null, null, null, null, role);
        });
    });

    function loginUser(username, userId, photo = '/default-profile.png', bio = 'Sem bio ainda.', theme = 'theme-vaporwave', color = generateColor(), role = 'user') {
        const userData = {
            username, 
            userId, 
            online: true, 
            photo, 
            bio, 
            theme, 
            color, 
            joined: Date.now(),
            messageCount: 0, 
            lastSeen: Date.now(), 
            role
        };
        
        // Update user data in database
        set(ref(db, 'users/' + userId), userData)
        .then(() => {
            // Also store username reference for uniqueness check
            set(ref(db, 'usernames/' + username), { userId });
            
            elements.welcomeScreen.style.display = 'none';
            elements.chatContainer.style.display = 'block';
            elements.currentUser.textContent = username;
            
            localStorage.setItem('username', username);
            localStorage.setItem('photo', photo);
            localStorage.setItem('bio', bio);
            localStorage.setItem('theme', theme);
            localStorage.setItem('color', color);
            localStorage.setItem('userRole', role);
            
            userRole = role;
            document.body.className = theme;
            
            // Update theme selector if it exists
            if (elements.themeSelector) {
                elements.themeSelector.value = theme;
            }
            
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
            li.dataset.role = user.role || 'user';
            
            const roleInfo = roles[user.role || 'user'];
            const roleIcon = roleInfo ? `<span class="role-icon ${user.role}"></span>` : '';
            
            li.innerHTML = `${roleIcon}<img src="${user.photo}" class="profile-pic" alt="${user.username}" onerror="this.src='/default-profile.png'"> ${user.username}`;
            li.style.color = user.color;
            li.onclick = () => showProfileWidget(user);
            
            elements.userList.appendChild(li);
        });
        
        updateStatusBar();
    });

    function loadMessages(target) {
        if (target === '#profile') {
            elements.chatBox.innerHTML = `<div class="system-message">--- Perfil ---</div>`;
            elements.profileEdit.style.display = 'block';
            
            const user = userProfiles.get(username);
            if (user) {
                document.getElementById('editPhotoPreview').src = user.photo;
                document.getElementById('editBioInput').value = user.bio;
                document.getElementById('profileColorInput').value = user.color;
                
                if (document.getElementById('themeSelect')) {
                    document.getElementById('themeSelect').value = user.theme;
                }
                
                // Show role selector for admins
                if (elements.roleSelect && userRole === 'admin') {
                    elements.roleSelect.style.display = 'block';
                } else if (elements.roleSelect) {
                    elements.roleSelect.style.display = 'none';
                }
            }
            return;
        }

        const dbRef = target === '#main' ? ref(db, 'forumMessages') : 
                    target === '#hentai' ? ref(db, 'hentaiMessages') : 
                    ref(db, 'privateMessages/' + [username, target].sort().join('-'));
        
        off(dbRef);
        onValue(dbRef, (snapshot) => {
            const targetName = target === '#main' ? 'Fórum' : 
                            target === '#hentai' ? 'Hentai (Somente Leitura)' : 
                            `Chat com ${target}`;
            
            elements.chatBox.innerHTML = `<div class="system-message">--- ${targetName} ---</div>`;
            messageIds.clear();
            
            snapshot.forEach(child => {
                const data = child.val();
                data.id = child.key;
                
                if (!messageIds.has(data.id)) {
                    messageIds.add(data.id);
                    displayMessage(data, target === '#hentai');
                }
            });
        }, { onlyOnce: false });
    }

    function sendMessage() {
        const text = elements.messageInput.value.trim();
        const now = Date.now();
        
        if (!text || (text === lastMessage && now - lastMessageTime < 1000) || currentChat === '#hentai') {
            return;
        }

        const message = {
            user: username,
            text,
            timestamp: now,
            color: userProfiles.get(username)?.color || '#ffffff',
            photo: userProfiles.get(username)?.photo || '/default-profile.png',
            role: userRole
        };
        
        // Check for media upload
        const mediaInput = document.getElementById('mediaInput');
        if (mediaInput && mediaInput.files.length > 0) {
            const file = mediaInput.files[0];
            // Here you'd typically upload the file to storage and get URL
            // For now, we'll just use it directly
            const isVideo = file.type.startsWith('video/');
            
            message.media = {
                filePath: URL.createObjectURL(file),
                type: isVideo ? 'video' : 'image'
            };
            
            // Clear file input
            mediaInput.value = null;
        }
        
        pushMessage(message, currentChat);
        elements.messageInput.value = '';
        lastMessage = text;
        lastMessageTime = now;
    }

    function pushMessage(message, target) {
        const dbRef = target === '#main' ? 
                    ref(db, 'forumMessages') : 
                    ref(db, 'privateMessages/' + [username, target].sort().join('-'));
        
        push(dbRef, message).then(() => {
            runTransaction(ref(db, 'users/' + userId + '/messageCount'), (count) => (count || 0) + 1);
        });
    }

    function displayMessage(data, isHentai = false) {
        const div = document.createElement('div');
        div.className = isHentai ? 'hentai-post' : 'message';
        div.dataset.id = data.id;
        div.dataset.role = data.role || 'user';
        
        let mediaContent = '';
        
        // Handle problematic image sources
        if (data.media) {
            const filePath = data.media.filePath || '';
            
            // Replace problematic image sources with fallbacks
            if (filePath.includes('placeholder.com') || 
                filePath.includes('storageimagedisplay.com') || 
                !filePath.startsWith('http') && !filePath.startsWith('blob:')) {
                data.media.filePath = '/default-profile.png';
            }
            
            if (data.media.type === 'video') {
                mediaContent = `
                    <div class="video-container">
                        <video src="${data.media.filePath}" class="media" controls 
                            controlsList="nodownload" playsinline
                            onerror="this.style.display='none'"></video>
                    </div>`;
            } else {
                mediaContent = `<img src="${data.media.filePath}" class="media" alt="Media" 
                    onerror="this.src='/default-profile.png'; this.onerror=null;">`;
            }
        }
        
        // Add role badge if user has a special role
        const roleInfo = roles[data.role || 'user'];
        const roleBadge = (data.role && data.role !== 'user') ? 
            `<span class="role-badge ${data.role}">${data.role}</span>` : '';
        
        div.innerHTML = isHentai ? `
            ${mediaContent}
            <div class="hentai-info">
                <span style="color: ${data.color}">${data.user}</span> ${roleBadge} - Tags: ${data.text}
                <span class="timestamp">[${new Date(data.timestamp).toLocaleTimeString()}]</span>
            </div>
        ` : `
            <div class="message-container">
                <div class="message-header">
                    <img src="${data.photo}" class="profile-pic" alt="${data.user}" 
                        onerror="this.src='/default-profile.png';" 
                        onclick="showProfileWidget(userProfiles.get('${data.user}'))">
                    <div class="message-user">
                        <span style="color: ${data.color}" 
                            onclick="showProfileWidget(userProfiles.get('${data.user}'))">${data.user}</span>
                        ${roleBadge}
                    </div>
                    <span class="timestamp">[${new Date(data.timestamp).toLocaleTimeString()}]</span>
                </div>
                <div class="message-content">
                    <div class="message-text">${data.text || ''}</div>
                    ${mediaContent}
                </div>
            </div>
        `;
        
        // Add delete button for admin and moderators
        if ((userRole === 'admin' || userRole === 'moderator') && !isHentai) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-message';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.onclick = () => deleteMessage(data.id, currentChat);
            div.appendChild(deleteBtn);
        }
        
        elements.chatBox.appendChild(div);
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    }

    function deleteMessage(messageId, target) {
        if (userRole !== 'admin' && userRole !== 'moderator') return;
        
        const dbRef = target === '#main' ? 
                    ref(db, `forumMessages/${messageId}`) : 
                    target === '#hentai' ? 
                        ref(db, `hentaiMessages/${messageId}`) : 
                        ref(db, `privateMessages/${[username, target].sort().join('-')}/${messageId}`);
        
        set(dbRef, null).then(() => {
            const element = document.querySelector(`[data-id="${messageId}"]`);
            if (element) element.remove();
        });
    }

    function switchTab(target) {
        if (target.includes('#') && target !== '#main' && target !== '#hentai' && target !== '#profile') return;
        
        currentChat = target;
        elements.forumTab.classList.toggle('active', target === '#main');
        elements.privateTab.classList.toggle('active', target !== '#main' && target !== '#profile' && target !== '#hentai');
        elements.profileTab.classList.toggle('active', target === '#profile');
        elements.hentaiTab.classList.toggle('active', target === '#hentai');
        
        elements.chatInput.style.display = target === '#profile' || target === '#hentai' ? 'none' : 'block';
        elements.profileEdit.style.display = 'none';
        
        loadMessages(target);
    }

    function updateStatusBar() {
        const user = userProfiles.get(username);
        const roleName = user?.role ? ` | Role: ${user.role}` : '';
        elements.statusBar.textContent = `Nick: ${username}${roleName} | Msgs: ${user?.messageCount || 0} | Online: ${userProfiles.size}`;
    }

    function showProfileWidget(user) {
        if (!user) return;
        
        elements.widgetPhoto.src = user.photo || '/default-profile.png';
        elements.widgetPhoto.onerror = () => elements.widgetPhoto.src = '/default-profile.png';
        
        elements.widgetName.textContent = user.username;
        elements.widgetName.style.color = user.color || '#ffffff';
        
        const roleBadge = user.role && user.role !== 'user' ? 
            `<span class="role-badge ${user.role}">${user.role}</span>` : '';
        
        elements.widgetBio.innerHTML = `${roleBadge} ${user.bio || 'Sem bio ainda.'}`;
        
        // Add private message button if not self
        const actionArea = document.getElementById('profileActions');
        if (actionArea) {
            actionArea.innerHTML = '';
            
            if (user.username !== username) {
                const pmButton = document.createElement('button');
                pmButton.textContent = 'Mensagem Privada';
                pmButton.onclick = () => {
                    switchTab(user.username);
                    closePopup('profileWidget');
                };
                actionArea.appendChild(pmButton);
            }
            
            // Add role control for admins
            if (userRole === 'admin' && user.username !== username) {
                const roleSelect = document.createElement('select');
                roleSelect.className = 'role-select';
                
                Object.keys(roles).forEach(role => {
                    const option = document.createElement('option');
                    option.value = role;
                    option.textContent = role;
                    roleSelect.appendChild(option);
                });
                
                roleSelect.value = user.role || 'user';
                
                const changeRoleBtn = document.createElement('button');
                changeRoleBtn.textContent = 'Mudar Role';
                changeRoleBtn.onclick = () => {
                    update(ref(db, 'users/' + user.userId), { role: roleSelect.value });
                    closePopup('profileWidget');
                };
                
                actionArea.appendChild(roleSelect);
                actionArea.appendChild(changeRoleBtn);
            }
        }
        
        elements.profileWidget.style.display = 'block';
    }

    function logoutUser() {
        if (userId) {
            update(ref(db, 'users/' + userId), { online: false, lastSeen: Date.now() })
            .then(() => {
                localStorage.removeItem('username');
                localStorage.removeItem('userId');
                localStorage.removeItem('photo');
                localStorage.removeItem('bio');
                localStorage.removeItem('color');
                localStorage.removeItem('userRole');
                
                window.location.reload();
            });
        }
    }

    // Expose necessary functions to window
    window.sendMessage = sendMessage;
    window.switchTab = switchTab;
    window.toggleAdminLogin = toggleAdminLogin;
    window.generateColor = generateColor;
    window.showProfileWidget = showProfileWidget;
    window.closePopup = (id) => document.getElementById(id).style.display = 'none';
    window.userProfiles = userProfiles;
    window.logoutUser = logoutUser;
    window.deleteMessage = deleteMessage;
}