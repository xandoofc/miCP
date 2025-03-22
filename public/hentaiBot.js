export function initializeHentaiBot() {
    const { db, ref, push } = window.firebaseApp;

    function fetchHentai() {
        fetch('https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=1')
            .then(response => response.json())
            .then(data => {
                if (data.post && data.post.length > 0) {
                    const post = data.post[0];
                    const message = {
                        user: 'HentaiBot',
                        text: `Nova imagem: ${post.tags}`,
                        media: { filePath: post.file_url, type: 'image' },
                        timestamp: Date.now(),
                        color: '#ff00ff',
                        photo: '/default-profile.png'
                    };
                    push(ref(db, 'hentaiMessages'), message);
                }
            }).catch(err => console.error('HentaiBot error:', err));
    }

    setInterval(fetchHentai, 60000); // Every 1 minute
    fetchHentai(); // Initial fetch
}