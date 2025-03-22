export function initializeHentaiBot() {
    const { db, ref, push } = window.firebaseApp;

    function fetchHentai() {
        // Option 1: Using a CORS proxy service
        const proxyUrl = 'https://corsproxy.io/?';
        const targetUrl = 'https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=1&tags=-video+rating:safe';
        
        fetch(proxyUrl + encodeURIComponent(targetUrl))
            .then(response => response.json())
            .then(data => {
                if (data.post && data.post.length > 0) {
                    const post = data.post[0];
                    
                    // Validate image URL - use a default if not available
                    const imageUrl = post.file_url && post.file_url.startsWith('http') 
                        ? post.file_url 
                        : '/default-profile.png';
                    
                    const message = {
                        user: 'HentaiBot',
                        text: `Nova imagem: ${post.tags}`,
                        media: { filePath: imageUrl, type: 'image' },
                        timestamp: Date.now(),
                        color: '#ffffff',
                        photo: '/default-profile.png'
                    };
                    push(ref(db, 'hentaiMessages'), message);
                }
            }).catch(err => {
                console.error('HentaiBot error:', err);
                // Send a fallback message when API fails
                const fallbackMessage = {
                    user: 'HentaiBot',
                    text: 'Não foi possível carregar imagens neste momento.',
                    timestamp: Date.now(),
                    color: '#ffffff',
                    photo: '/default-profile.png'
                };
                push(ref(db, 'hentaiMessages'), fallbackMessage);
            });
    }

    setInterval(fetchHentai, 60000); // Every 1 minute
    fetchHentai(); // Initial fetch
}