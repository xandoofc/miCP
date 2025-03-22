export function initializeHentaiBot() {
    const { db, ref, push } = window.firebaseApp;

    function fetchHentai() {
        // Mock data since Gelbooru API doesn't support CORS and proxy failed
        const mockPosts = [
            { tags: "anime girl", file_url: "https://via.placeholder.com/300x200.png?text=Hentai+1" },
            { tags: "cute neko", file_url: "https://via.placeholder.com/300x200.png?text=Hentai+2" },
            { tags: "maid outfit", file_url: "https://via.placeholder.com/300x200.png?text=Hentai+3" }
        ];
        const post = mockPosts[Math.floor(Math.random() * mockPosts.length)];
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

    setInterval(fetchHentai, 60000); // Every 1 minute
    fetchHentai(); // Initial fetch
}