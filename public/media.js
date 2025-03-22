export function initializeMedia() {
    const { storage, storageRef, uploadBytes, getDownloadURL } = window.firebaseApp;
    const elements = {
        profilePhotoInput: document.getElementById('profilePhotoInput'),
        mediaInput: document.getElementById('mediaInput'),
        photoPreview: document.getElementById('photoPreview'),
        mediaPreview: document.getElementById('mediaPreview'),
        editPhotoInput: document.getElementById('editPhotoInput'),
        editPhotoPreview: document.getElementById('editPhotoPreview'),
        saveProfileButton: document.getElementById('saveProfileButton')
    };

    elements.profilePhotoInput.addEventListener('change', () => {
        const file = elements.profilePhotoInput.files[0];
        if (file) elements.photoPreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Prévia">`;
    });

    elements.mediaInput.addEventListener('change', () => {
        const file = elements.mediaInput.files[0];
        if (file) {
            elements.mediaPreview.innerHTML = file.type.startsWith('video') ? 
                `<video src="${URL.createObjectURL(file)}" controls></video>` : 
                `<img src="${URL.createObjectURL(file)}" alt="Prévia">`;
            uploadMedia(file, (mediaData) => {
                const message = {
                    user: localStorage.getItem('username'),
                    media: mediaData,
                    timestamp: Date.now(),
                    color: localStorage.getItem('color') || window.generateColor(),
                    photo: localStorage.getItem('photo')
                };
                window.pushMessage(message, window.currentChat);
            });
        }
    });

    elements.editPhotoInput.addEventListener('change', () => {
        const file = elements.editPhotoInput.files[0];
        if (file) elements.editPhotoPreview.src = URL.createObjectURL(file);
    });

    elements.saveProfileButton.addEventListener('click', () => {
        const file = elements.editPhotoInput.files[0];
        const bio = document.getElementById('editBioInput').value.trim();
        const color = document.getElementById('profileColorInput').value;
        const theme = document.getElementById('themeSelect').value;
        if (file) uploadPhoto(file, (photoUrl) => updateProfile(photoUrl, bio, theme, color));
        else updateProfile(localStorage.getItem('photo'), bio, theme, color);
    });

    async function uploadPhoto(file, callback) {
        const compressedFile = await compressFile(file, 0.7, 150);
        const fileRef = storageRef(storage, 'profiles/' + localStorage.getItem('userId') + '-' + Date.now() + '.jpg');
        uploadBytes(fileRef, compressedFile).then((snapshot) => getDownloadURL(snapshot.ref).then(callback));
    }

    async function uploadMedia(file, callback) {
        const compressedFile = await compressFile(file, 0.8, 800);
        const fileRef = storageRef(storage, 'uploads/' + Date.now() + '.media');
        uploadBytes(fileRef, compressedFile).then((snapshot) => {
            getDownloadURL(snapshot.ref).then((url) => callback({ filePath: url, type: file.type.startsWith('video') ? 'video' : 'image' }));
        });
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

    function updateProfile(photo, bio, theme, color) {
        const { db, ref, update } = window.firebaseApp;
        update(ref(db, 'users/' + localStorage.getItem('userId')), { photo, bio, theme, color }).then(() => {
            localStorage.setItem('photo', photo);
            localStorage.setItem('bio', bio);
            localStorage.setItem('theme', theme);
            localStorage.setItem('color', color);
            document.body.className = theme;
        });
    }

    window.pushMessage = window.pushMessage || ((message, target) => {
        const { db, ref, push } = window.firebaseApp;
        const dbRef = target === '#main' ? ref(db, 'forumMessages') : ref(db, 'privateMessages/' + [localStorage.getItem('username'), target].sort().join('-'));
        push(dbRef, message);
    });
}