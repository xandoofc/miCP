export function initializeAdmin() {
    const { db, ref, set } = window.firebaseApp;
    const elements = {
        adminPanel: document.getElementById('adminPanel'),
        newForumInput: document.getElementById('newForumInput'),
        createForumButton: document.getElementById('createForumButton')
    };

    if (localStorage.getItem('isAdmin') === 'true') {
        document.querySelector('.retro-tabs').innerHTML += `<button class="retro-tab" onclick="document.getElementById('adminPanel').style.display = 'block'">Admin</button>`;
    }

    elements.createForumButton.addEventListener('click', () => {
        const forumName = elements.newForumInput.value.trim();
        if (forumName) {
            set(ref(db, 'forums/' + forumName), { created: Date.now(), creator: localStorage.getItem('username') });
            elements.newForumInput.value = '';
            alert('Fórum criado: ' + forumName);
        }
    });

    window.closePopup = (id) => document.getElementById(id).style.display = 'none';
}