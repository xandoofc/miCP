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

    // Alternate APIs to try if Gelbooru fails
    const imageAPIs = [
        {
            name: 'Gelbooru',
            url: (tags) => `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=10&tags=${tags}`,
            parser: (data) => {
                if (data.post && data.post.length > 0) {
                    const post = data.post[Math.floor(Math.random() * data.post.length)];
                    return {
                        url: post.file_url,
                        tags: post.tags
                    };
                }
                return null;
            }
        },
        {
            name: 'Picsum',
            url: () => 'https://picsum.photos/600',
            parser: () => {
                return {
                    url: 'https://picsum.photos/600',
                    tags: 'random,photo,landscape'
                };
            }
        },
        {
            name: 'Local',
            url: () => null,
            parser: () => {
                // Use a local fallback image
                return {
                    url: '/default-profile.png',
                    tags: 'local,fallback,image'
                };
            }
        }
    ];

    // Keep track of failed attempts
    let currentAPIIndex = 0;
    let failCount = 0;

    function fetchHentai() {
        // Get a random tag set
        const randomTags = tagSets[Math.floor(Math.random() * tagSets.length)];
        
        // Use the current API
        const currentAPI = imageAPIs[currentAPIIndex];
        
        // Generate a message with the bot name
        const botMessage = {
            user: 'ImageBot',
            text: 'Carregando imagem...',
            timestamp: Date.now(),
            color: getRandomColor(),
            photo: '/default-profile.png',
            role: 'bot'
        };
        
        // If we're using the local fallback directly
        if (currentAPIIndex === imageAPIs.length - 1) {
            const result = currentAPI.parser();
            if (result) {
                botMessage.text = `Tags: ${result.tags}`;
                botMessage.media = { 
                    filePath: result.url,
                    type: 'image'
                };
                push(ref(db, 'hentaiMessages'), botMessage);
                return;
            }
        }
        
        // Try to fetch from API if not local
        const apiUrl = currentAPI.url(randomTags);
        
        // If it's Picsum (direct image), use it directly
        if (currentAPIIndex === 1) {
            botMessage.text = `Tags: random,landscape,photo`;
            botMessage.media = { 
                filePath: apiUrl,
                type: 'image'
            };
            push(ref(db, 'hentaiMessages'), botMessage);
            return;
        }
        
        // Use a CORS proxy for other APIs
        const proxyUrl = 'https://corsproxy.io/?';
        
        fetch(proxyUrl + encodeURIComponent(apiUrl))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const result = currentAPI.parser(data);
                if (!result) {
                    throw new Error('No images found');
                }
                
                // Validate image URL
                if (!result.url || !result.url.startsWith('http')) {
                    throw new Error('Invalid image URL');
                }
                
                // Update message with image info
                botMessage.text = `Tags: ${result.tags}`;
                botMessage.media = { 
                    filePath: result.url,
                    type: 'image'
                };
                
                // Reset fail count on success
                failCount = 0;
                
                push(ref(db, 'hentaiMessages'), botMessage);
            })
            .catch(err => {
                console.warn(`${currentAPI.name} error:`, err.message);
                
                // Increment fail count and try next API
                failCount++;
                
                // Switch to next API after too many failures
                if (failCount >= 3) {
                    currentAPIIndex = (currentAPIIndex + 1) % imageAPIs.length;
                    failCount = 0;
                    console.log(`Switching to ${imageAPIs[currentAPIIndex].name} API`);
                }
                
                // Create fallback message with local image
                botMessage.text = 'Tags: bot,image,fallback';
                botMessage.media = { 
                    filePath: '/default-profile.png',
                    type: 'image'
                };
                
                push(ref(db, 'hentaiMessages'), botMessage);
            });
    }

    // Generate a random color
    function getRandomColor() {
        const colors = ['#ff5555', '#55ff55', '#5555ff', '#ffff55', '#ff55ff', '#55ffff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Fetch an image immediately and then every 30 seconds
    fetchHentai();
    const interval = setInterval(fetchHentai, 30000);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(interval);
    });
}