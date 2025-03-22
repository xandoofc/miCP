export function initializeAdmin() {
    const { db, ref, set } = window.firebaseApp;
    
    // Create admin panel if it doesn't exist
    let adminPanel = document.getElementById('adminPanel');
    if (!adminPanel) {
        adminPanel = document.createElement('div');
        adminPanel.id = 'adminPanel';
        adminPanel.className = 'popup';
        adminPanel.style.display = 'none';
        
        adminPanel.innerHTML = `
            <div class="popup-header">
                <div class="popup-title">Painel Administrativo</div>
                <button class="popup-close" onclick="closePopup('adminPanel')">&times;</button>
            </div>
            <div class="admin-content">
                <h3>Criar Novo Fórum</h3>
                <div class="admin-group">
                    <input type="text" id="newForumInput" placeholder="Nome do fórum">
                    <button id="createForumButton">Criar</button>
                </div>
                
                <h3>Gerenciar Usuários</h3>
                <div id="adminUserList"></div>
            </div>
        `;
        
        document.body.appendChild(adminPanel);
    }
    
    const elements = {
        adminPanel: adminPanel,
        newForumInput: document.getElementById('newForumInput'),
        createForumButton: document.getElementById('createForumButton'),
        adminUserList: document.getElementById('adminUserList')
    };

    // Only show admin tab for admin users
    if (localStorage.getItem('userRole') === 'admin') {
        const tabsContainer = document.querySelector('.retro-tabs');
        if (tabsContainer && !document.getElementById('adminTab')) {
            const adminTab = document.createElement('div');
            adminTab.id = 'adminTab';
            adminTab.className = 'retro-tab';
            adminTab.textContent = 'Admin';
            adminTab.onclick = () => adminPanel.style.display = 'block';
            tabsContainer.appendChild(adminTab);
        }
    }

    // Setup event listeners if elements exist
    if (elements.createForumButton && elements.newForumInput) {
        elements.createForumButton.addEventListener('click', () => {
            const forumName = elements.newForumInput.value.trim();
            if (forumName) {
                set(ref(db, 'forums/' + forumName), { 
                    created: Date.now(), 
                    creator: localStorage.getItem('username') 
                });
                elements.newForumInput.value = '';
                alert('Fórum criado: ' + forumName);
            }
        });
    }

    // Load user list for admin panel
    if (elements.adminUserList && localStorage.getItem('userRole') === 'admin') {
        const { onValue } = window.firebaseApp;
        onValue(ref(db, 'users'), (snapshot) => {
            elements.adminUserList.innerHTML = '';
            
            snapshot.forEach(child => {
                const user = child.val();
                const userDiv = document.createElement('div');
                userDiv.className = 'admin-user-item';
                
                userDiv.innerHTML = `
                    <div class="user-info">
                        <img src="${user.photo || '/default-profile.png'}" class="admin-user-pic">
                        <span>${user.username}</span>
                        <span class="role-badge ${user.role || 'user'}">${user.role || 'user'}</span>
                    </div>
                    <div class="user-actions">
                        <select class="role-select" data-userid="${user.userId}">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                            <option value="vip" ${user.role === 'vip' ? 'selected' : ''}>VIP</option>
                            <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="save-role-btn" data-userid="${user.userId}">Salvar</button>
                    </div>
                `;
                
                elements.adminUserList.appendChild(userDiv);
            });
            
            // Add event listeners to role change buttons
            const saveRoleBtns = document.querySelectorAll('.save-role-btn');
            saveRoleBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const userId = btn.dataset.userid;
                    const roleSelect = document.querySelector(`.role-select[data-userid="${userId}"]`);
                    const newRole = roleSelect.value;
                    
                    set(ref(db, `users/${userId}/role`), newRole)
                        .then(() => alert('Role atualizada com sucesso!'))
                        .catch(err => alert('Erro: ' + err.message));
                });
            });
        });
    }
}