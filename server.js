const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/webm'];
        cb(null, allowedTypes.includes(file.mimetype));
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.static(__dirname + '/public'));
app.post('/upload', upload.single('media'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ filePath, type: req.file.mimetype.startsWith('video') ? 'video' : 'image' });
});

const users = new Map();
const messages = new Map();
const forumMessages = [];

function generateColor() {
    return `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
}

io.on('connection', (socket) => {
    socket.on('registerUser', ({ username, userId, photo, bio }) => {
        if (Array.from(users.values()).some(u => u.username === username && u.userId !== userId)) {
            socket.emit('loginError', 'Nick já em uso.');
            return;
        }
        const userData = {
            username, userId, online: true,
            photo: photo || '/default-profile.png',
            bio: bio || 'Sem bio ainda.',
            joined: Date.now(),
            color: generateColor(),
            messageCount: 0
        };
        users.set(socket.id, userData);
        socket.username = username;
        socket.userId = userId;
        socket.join('#main');
        io.emit('updateUsers', Array.from(users.values()));
        socket.emit('loginSuccess', userData);
    });

    socket.on('loadChat', (target) => {
        const room = target === '#main' ? '#main' : [socket.username, target].sort().join('-');
        socket.join(room);
        const chatHistory = room === '#main' ? forumMessages : messages.get(room) || [];
        socket.emit('loadMessages', chatHistory);
    });

    socket.on('sendMessage', ({ text, target, media }) => {
        const room = target === '#main' ? '#main' : [socket.username, target].sort().join('-');
        const message = {
            user: socket.username, text, media,
            timestamp: Date.now(),
            color: users.get(socket.id).color,
            photo: users.get(socket.id).photo
        };
        if (room === '#main') {
            forumMessages.push(message);
            io.to(room).emit('newMessage', message);
        } else {
            if (!messages.has(room)) messages.set(room, []);
            messages.get(room).push(message);
            io.to(room).emit('newMessage', message);
        }
        users.get(socket.id).messageCount++;
    });

    socket.on('disconnect', () => {
        if (users.has(socket.id)) {
            io.to('#main').emit('systemMessage', `${socket.username} saiu`);
            users.delete(socket.id);
            io.emit('updateUsers', Array.from(users.values()));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[SERVER] Rodando na porta ${PORT}`));