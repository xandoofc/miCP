export function initializeHentaiBot() {
    const { db, ref, push } = window.firebaseApp;

    // Random tags to fetch diverse images
    const tagSets = [
        '-video+rating:safe+scenery',
        '-video+rating:safe+landscape',
        '-video+rating:safe+animal',
        '-video+rating:safe+flowers',
        '-video+rating:safe+nature',
        '-video+rating:safe+city',
        '-video+rating:safe+beach'
    ];

    function fetchHentai() {
        // Get a random tag set
        const randomTags = tagSets[Math.floor(Math.random() * tagSets.length)];
        
        // Use the CORS proxy
        const proxyUrl = 'https://corsproxy.io/?';
        const targetUrl = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=10&tags=${randomTags}`;
        
        fetch(proxyUrl + encodeURIComponent(targetUrl))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.post && data.post.length > 0) {
                    // Get a random image from the results
                    const randomIndex = Math.floor(Math.random() * data.post.length);
                    const post = data.post[randomIndex];
                    
                    // Validate image URL
                    if (!post.file_url || !post.file_url.startsWith('http')) {
                        throw new Error('Invalid image URL');
                    }
                    
                    // Create message with random colors
                    const message = {
                        user: 'ImageBot',
                        text: `Tags: ${post.tags.split(' ').slice(0, 10).join(', ')}`,
                        media: { filePath: post.file_url, type: 'image' },
                        timestamp: Date.now(),
                        color: getRandomColor(),
                        role: 'bot'
                    };
                    
                    push(ref(db, 'hentaiMessages'), message);
                } else {
                    throw new Error('No images found');
                }
            })
            .catch(err => {
                console.error('HentaiBot error:', err);
                
                // Create fallback message with local image
                const fallbackMessage = {
                    user: 'ImageBot',
                    text: 'Não foi possível carregar imagens neste momento.',
                    timestamp: Date.now(),
                    color: getRandomColor(),
                    role: 'bot'
                };
                
                push(ref(db, 'hentaiMessages'), fallbackMessage);
            });
    }

    // Generate a random color
    function getRandomColor() {
        const colors = ['#ff5555', '#55ff55', '#5555ff', '#ffff55', '#ff55ff', '#55ffff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Fetch an image immediately and then every 30 seconds
    fetchHentai();
    setInterval(fetchHentai, 30000);
}