let peer;
let conn;
let myConnectionCode = '';
let friendCode = '';
let typingTimeout;
let typingMessageElement = null;
let replyingToMessage = null;
let messageStatuses = new Map();
let chatBox;
let messageInput;
let fileInput;
let filePreview;
let status;
let myCodeDisplay;
let myCodeInput;
let friendCodeInput;
let connectBtn;
let disconnectBtn;
let mediaOverlay;
let mediaOverlayContent;
let downloadBtn;
let replyPreviewArea;
let replyPreview;
let resizeHandle;
let chatHistory = {};
let recentChats = JSON.parse(localStorage.getItem('recentChats')) || [];

const peerJsServers = [
    { host: '0.peerjs.com', port: 443, path: '/' },
    { host: 'peerjs.herokuapp.com', port: 443, path: '/' },
    { host: 'peerjs-server-staging.herokuapp.com', port: 443, path: '/' }
];
let currentServerIndex = 0;

const users = {
    'junaid': 'password123',
    'doom': 'password456',
    'user3': 'password789'
};

const themes = [
    { name: 'Default (Gothic)', class: 'theme-default' },
    { name: 'Midnight Blue', class: 'theme-midnight-blue' },
    { name: 'Forest Green', class: 'theme-forest-green' },
    { name: 'Sunset Orange', class: 'theme-sunset-orange' },
    { name: 'Lavender Dream', class: 'theme-lavender-dream' },
    { name: 'Ocean Breeze', class: 'theme-ocean-breeze' },
    { name: 'Cosmic Purple', class: 'theme-cosmic-purple' },
    { name: 'Warm Sand', class: 'theme-warm-sand' },
    { name: 'Neon Glow', class: 'theme-neon-glow' },
    { name: 'Cherry Blossom', class: 'theme-cherry-blossom' },
    { name: 'Arctic Frost', class: 'theme-arctic-frost' }
];

const gifs = [
    'gifs/happy.gif',
    'gifs/laughing.gif',
    'gifs/sad.gif',
    'gifs/angry.gif',
    'gifs/love.gif'
];

// Initialize based on the current page
window.onload = () => {
    if (window.location.pathname.includes('chat.html')) {
        initializeChatPage();
    } else {
        initializeHomePage();
    }
};

function initializeHomePage() {
    status = document.getElementById('status');
    myCodeDisplay = document.getElementById('my-code');
    myCodeInput = document.getElementById('my-code-input');
    friendCodeInput = document.getElementById('friend-code');
    connectBtn = document.getElementById('connect-btn');
    disconnectBtn = document.getElementById('disconnect-btn');

    const savedMyCode = localStorage.getItem('myConnectionCode');
    if (savedMyCode) {
        myCodeInput.value = savedMyCode;
        myCodeInput.disabled = true;
        myCodeDisplay.textContent = savedMyCode;
        myConnectionCode = savedMyCode;
        connectToNextPeerJsServer();
    }

    displayRecentChats();
}

function initializeChatPage() {
    chatBox = document.getElementById('chat-box');
    messageInput = document.getElementById('message-input');
    fileInput = document.getElementById('file-input');
    filePreview = document.getElementById('file-preview');
    mediaOverlay = document.getElementById('media-overlay');
    mediaOverlayContent = document.getElementById('media-overlay-content');
    downloadBtn = document.getElementById('download-btn');
    replyPreviewArea = document.getElementById('reply-preview-area');
    replyPreview = document.getElementById('reply-preview');
    resizeHandle = document.getElementById('chat-box-resize-handle');

    myConnectionCode = localStorage.getItem('myConnectionCode');
    friendCode = localStorage.getItem('friendCode');
    if (!myConnectionCode || !friendCode) {
        window.location.href = 'index.html';
        return;
    }

    loadChatHistory();
    setupConnection();
    initChatBoxResize();
    applyTheme();
    populateThemeSelector();
    populateGifPicker();

    document.querySelector('.menu-btn').addEventListener('click', () => {
        document.querySelector('.menu-dropdown').classList.toggle('active');
    });
}

function login() {
    const username = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    if (users[username] && users[username] === password) {
        localStorage.setItem('loggedInUser', username);
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('connection-section').style.display = 'block';
    } else {
        alert('Invalid username or password!');
    }
}

function resetConnection() {
    if (peer) {
        peer.destroy();
    }
    peer = null;
    conn = null;
    myConnectionCode = '';
    friendCode = '';
    myCodeDisplay.textContent = '';
    myCodeInput.disabled = false;
    myCodeInput.value = '';
    friendCodeInput.value = '';
    status.textContent = "Disconnected";
    status.classList.remove('connected');
    status.classList.add('disconnected');
    chatBox.innerHTML = '';
    if (typingMessageElement) {
        typingMessageElement.remove();
        typingMessageElement = null;
    }
    connectBtn.disabled = true;
    disconnectBtn.disabled = true;
    localStorage.removeItem('myConnectionCode');
    localStorage.removeItem('friendCode');
    clearFilePreview();
    replyingToMessage = null;
    messageStatuses.clear();
    replyPreviewArea.classList.remove('active');
}

function setMyCode() {
    myConnectionCode = myCodeInput.value.trim();
    if (!myConnectionCode) {
        alert("Please enter a valid code!");
        return;
    }
    myCodeDisplay.textContent = myConnectionCode;
    myCodeInput.disabled = true;
    localStorage.setItem('myConnectionCode', myConnectionCode);
    connectToNextPeerJsServer();
}

function connectToNextPeerJsServer() {
    if (currentServerIndex >= peerJsServers.length) {
        resetConnection();
        return;
    }

    const server = peerJsServers[currentServerIndex];
    status.textContent = `Connecting to PeerJS server: ${server.host}...`;
    status.classList.remove('connected');
    status.classList.add('disconnected');

    if (peer) {
        peer.destroy();
    }

    peer = new Peer(myConnectionCode, {
        host: server.host,
        port: server.port,
        path: server.path,
        debug: 2
    });

    peer.on('open', () => {
        status.textContent = "Your ID is set. Share your code with your friend!";
        status.classList.remove('connected');
        status.classList.add('disconnected');
        connectBtn.disabled = false;
        disconnectBtn.disabled = false;
    });

    peer.on('error', (err) => {
        console.error(`PeerJS error with server ${server.host}:`, err);
        currentServerIndex++;
        connectToNextPeerJsServer();
    });

    peer.on('disconnected', () => {
        currentServerIndex++;
        connectToNextPeerJsServer();
    });

    peer.on('connection', (connection) => {
        conn = connection;
        friendCode = conn.peer;
        localStorage.setItem('friendCode', friendCode);
        if (!recentChats.includes(friendCode)) {
            recentChats.push(friendCode);
            localStorage.setItem('recentChats', JSON.stringify(recentChats));
        }
        window.location.href = 'chat.html';
    });
}

function connectToFriend() {
    if (!myConnectionCode) {
        alert("Please set your connection code first!");
        return;
    }
    friendCode = friendCodeInput.value.trim();
    if (!friendCode) {
        alert("Please enter your friend's connection code!");
        return;
    }

    localStorage.setItem('friendCode', friendCode);
    status.textContent = "Attempting to connect to " + friendCode + "...";
    status.classList.remove('connected');
    status.classList.add('disconnected');
    attemptConnection(friendCode, 3, 2000);
}

function attemptConnection(friendCode, retries, delay) {
    if (retries <= 0) {
        status.textContent = "Failed to connect to " + friendCode + ". Please ensure they are online and try again.";
        status.classList.remove('connected');
        status.classList.add('disconnected');
        return;
    }

    conn = peer.connect(friendCode);
    conn.on('open', () => {
        if (!recentChats.includes(friendCode)) {
            recentChats.push(friendCode);
            localStorage.setItem('recentChats', JSON.stringify(recentChats));
        }
        window.location.href = 'chat.html';
    });

    conn.on('error', (err) => {
        status.textContent = "Connection attempt failed. Retrying... (" + retries + " attempts left)";
        status.classList.remove('connected');
        status.classList.add('disconnected');
        setTimeout(() => {
            attemptConnection(friendCode, retries - 1, delay);
        }, delay);
    });
}

function setupConnection() {
    conn.on('data', (data) => {
        if (typeof data === 'string') {
            if (data.startsWith('typing:')) {
                const isTyping = data.split(':')[1] === 'true';
                if (isTyping) {
                    showTypingIndicator();
                } else {
                    hideTypingIndicator();
                }
            } else if (data.startsWith('media:')) {
                const [_, mediaType, base64Data, fileName, messageId, timestamp] = data.split(':');
                displayMedia(mediaType, base64Data, fileName, 'receiver', messageId, parseInt(timestamp));
                conn.send(`delivered:${messageId}`);
            } else if (data.startsWith('reply:')) {
                const [_, replyToData, message, messageId, timestamp, replyToId, replyToMediaType, replyToMediaSrc] = data.split(':', 8);
                displayMessage(message, 'receiver', replyToData, messageId, parseInt(timestamp), replyToId, replyToMediaType || '', replyToMediaSrc || '');
                conn.send(`delivered:${messageId}`);
            } else if (data.startsWith('delivered:')) {
                const messageId = data.split(':')[1];
                updateMessageStatus(messageId, 'delivered');
            } else if (data.startsWith('seen:')) {
                const messageId = data.split(':')[1];
                updateMessageStatus(messageId, 'seen');
            } else {
                const [messageId, timestamp, ...messageParts] = data.split(':');
                const message = messageParts.join(':');
                displayMessage(message, 'receiver', null, messageId, parseInt(timestamp));
                conn.send(`delivered:${messageId}`);
            }
        }
    });

    conn.on('close', () => {
        window.location.href = 'index.html';
    });

    conn.on('error', (err) => {
        window.location.href = 'index.html';
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const messageId = entry.target.dataset.messageId;
                const currentStatus = messageStatuses.get(messageId);
                if (messageId && currentStatus === 'delivered' && conn && conn.open) {
                    conn.send(`seen:${messageId}`);
                    updateMessageStatus(messageId, 'seen');
                }
            }
        });
    }, { root: chatBox, threshold: 0.5 });

    const observeMessages = () => {
        const messages = chatBox.querySelectorAll('.message.receiver');
        messages.forEach(message => {
            if (!message.dataset.observed) {
                observer.observe(message);
                message.dataset.observed = 'true';
            }
        });
    };

    observeMessages();
    chatBox.addEventListener('scroll', observeMessages);
    const mutationObserver = new MutationObserver(observeMessages);
    mutationObserver.observe(chatBox, { childList: true });
}

function generateMessageId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const istOffset = 5.5 * 60;
    const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    const istMinutes = (utcMinutes + istOffset) % (24 * 60);
    const istHours = Math.floor(istMinutes / 60);
    const minutes = (istMinutes % 60).toString().padStart(2, '0');
    const hours = istHours % 12 || 12;
    const ampm = istHours >= 12 ? 'pm' : 'am';
    return `${hours}:${minutes} ${ampm}`;
}

function updateMessageStatus(messageId, status) {
    const messageDiv = chatBox.querySelector(`[data-message-id="${messageId}"]`);
    if (messageDiv) {
        const statusText = messageDiv.querySelector('.status-text');
        if (statusText) {
            statusText.className = `status-text ${status}`;
            messageStatuses.set(messageId, status);
        }
    }
}

function displayMessage(text, type, replyTo = null, messageId = null, timestamp = null, replyToId = null, replyToMediaType = '', replyToMediaSrc = '') {
    if (!messageId) {
        messageId = generateMessageId();
        timestamp = Date.now();
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    messageDiv.dataset.message = text;
    messageDiv.dataset.messageId = messageId;

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('name');
    nameSpan.textContent = (type === 'sender' ? myConnectionCode : friendCode) + ':';
    messageDiv.appendChild(nameSpan);

    if (replyTo) {
        const repliedMessage = document.createElement('span');
        repliedMessage.classList.add('replied-message');
        if (replyToMediaType && (replyToMediaType.startsWith('image') || replyToMediaType.startsWith('video'))) {
            if (replyToMediaType.startsWith('image')) {
                const img = document.createElement('img');
                img.src = replyToMediaSrc;
                repliedMessage.appendChild(img);
            } else if (replyToMediaType.startsWith('video')) {
                const video = document.createElement('video');
                video.src = replyToMediaSrc;
                video.controls = true;
                repliedMessage.appendChild(video);
            }
        } else {
            repliedMessage.textContent = replyTo;
        }
        if (replyToId) {
            repliedMessage.dataset.replyToId = replyToId;
            repliedMessage.addEventListener('click', () => {
                const originalMessage = chatBox.querySelector(`[data-message-id="${replyToId}"]`);
                if (originalMessage) {
                    originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    originalMessage.classList.add('highlight');
                }
            });
        }
        messageDiv.appendChild(repliedMessage);
    }

    const contentSpan = document.createElement('span');
    contentSpan.classList.add('content');
    contentSpan.textContent = text;
    messageDiv.appendChild(contentSpan);

    const metaDiv = document.createElement('div');
    metaDiv.classList.add('meta');
    const timeSpan = document.createElement('span');
    timeSpan.textContent = formatTimestamp(timestamp);
    metaDiv.appendChild(timeSpan);

    if (type === 'sender') {
        const statusText = document.createElement('span');
        statusText.classList.add('status-text', 'sent');
        metaDiv.appendChild(statusText);
        messageStatuses.set(messageId, 'sent');
    }

    messageDiv.appendChild(metaDiv);
    chatBox.appendChild(messageDiv);
    scrollToBottom();
    addSwipeAndLongPress(messageDiv);

    saveMessage({ text, type, replyTo, messageId, timestamp, replyToId, replyToMediaType, replyToMediaSrc });
    return messageId;
}

function showTypingIndicator() {
    if (typingMessageElement) return;

    typingMessageElement = document.createElement('div');
    typingMessageElement.classList.add('typing-message');
    typingMessageElement.innerHTML = `
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
    `;
    chatBox.appendChild(typingMessageElement);
    scrollToBottom();
}

function hideTypingIndicator() {
    if (typingMessageElement) {
        typingMessageElement.remove();
        typingMessageElement = null;
    }
    scrollToBottom();
}

function displayMedia(mediaType, base64Data, fileName, type, messageId = null, timestamp = null) {
    if (!messageId) {
        messageId = generateMessageId();
        timestamp = Date.now();
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    messageDiv.dataset.message = fileName || 'Media';
    messageDiv.dataset.messageId = messageId;
    messageDiv.dataset.mediaType = mediaType;
    messageDiv.dataset.mediaSrc = `data:${mediaType};base64,${base64Data}`;

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('name');
    nameSpan.textContent = (type === 'sender' ? myConnectionCode : friendCode) + ':';
    messageDiv.appendChild(nameSpan);

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '5px';

    if (mediaType.startsWith('image')) {
        const img = document.createElement('img');
        img.src = `data:${mediaType};base64,${base64Data}`;
        img.onclick = () => openMediaOverlay(img.src, fileName);
        container.appendChild(img);

        const downloadLink = document.createElement('a');
        downloadLink.href = `data:${mediaType};base64,${base64Data}`;
        downloadLink.textContent = '↓';
        downloadLink.download = fileName || 'image';
        downloadLink.style.color = '#a30000';
        downloadLink.style.textDecoration = 'none';
        downloadLink.style.fontSize = '1.2em';
        container.appendChild(downloadLink);
    } else if (mediaType.startsWith('video')) {
        const video = document.createElement('video');
        video.src = `data:${mediaType};base64,${base64Data}`;
        video.controls = true;
        video.onclick = () => openMediaOverlay(video.src, fileName);
        container.appendChild(video);

        const downloadLink = document.createElement('a');
        downloadLink.href = `data:${mediaType};base64,${base64Data}`;
        downloadLink.textContent = '↓';
        downloadLink.download = fileName || 'video';
        downloadLink.style.color = '#a30000';
        downloadLink.style.textDecoration = 'none';
        downloadLink.style.fontSize = '1.2em';
        container.appendChild(downloadLink);
    } else {
        const fileLink = document.createElement('a');
        fileLink.href = `data:${mediaType};base64,${base64Data}`;
        fileLink.textContent = fileName || 'Download File';
        fileLink.download = fileName || 'file';
        fileLink.style.color = '#a30000';
        fileLink.style.textDecoration = 'underline';
        container.appendChild(fileLink);

        const downloadLink = document.createElement('a');
        downloadLink.href = `data:${mediaType};base64,${base64Data}`;
        downloadLink.textContent = '↓';
        downloadLink.download = fileName || 'file';
        downloadLink.style.color = '#a30000';
        downloadLink.style.textDecoration = 'none';
        downloadLink.style.fontSize = '1.2em';
        container.appendChild(downloadLink);
    }

    const metaDiv = document.createElement('div');
    metaDiv.classList.add('meta');
    const timeSpan = document.createElement('span');
    timeSpan.textContent = formatTimestamp(timestamp);
    metaDiv.appendChild(timeSpan);

    if (type === 'sender') {
        const statusText = document.createElement('span');
        statusText.classList.add('status-text', 'sent');
        metaDiv.appendChild(statusText);
        messageStatuses.set(messageId, 'sent');
    }

    messageDiv.appendChild(container);
    messageDiv.appendChild(metaDiv);
    chatBox.appendChild(messageDiv);
    scrollToBottom();
    addSwipeAndLongPress(messageDiv);

    saveMessage({ mediaType, base64Data, fileName, type, messageId, timestamp });
    return messageId;
}

function openMediaOverlay(src, fileName) {
    mediaOverlayContent.innerHTML = '';
    if (src.includes('image')) {
        const img = document.createElement('img');
        img.src = src;
        mediaOverlayContent.appendChild(img);
    } else if (src.includes('video')) {
        const video = document.createElement('video');
        video.src = src;
        video.controls = true;
        mediaOverlayContent.appendChild(video);
    }
    downloadBtn.href = src;
    downloadBtn.download = fileName || 'file';
    mediaOverlay.classList.add('active');
}

function closeMediaOverlay() {
    mediaOverlay.classList.remove('active');
    mediaOverlayContent.innerHTML = '';
}

function compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxWidth = 800;
            const maxHeight = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                callback(blob);
            }, 'image/jpeg', 0.7);
        };
    };
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
}

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        filePreview.innerHTML = '';
        if (file.type.startsWith('image')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            filePreview.appendChild(img);
        } else if (file.type.startsWith('video')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            filePreview.appendChild(video);
        } else {
            const fileName = document.createElement('span');
            fileName.textContent = file.name;
            filePreview.appendChild(fileName);
        }
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        progressBar.innerHTML = '<div class="progress"></div>';
        filePreview.appendChild(progressBar);
    } else {
        clearFilePreview();
    }
});

function clearFilePreview() {
    filePreview.innerHTML = '';
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
    setTimeout(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 0);
}

function sendTypingEvent(isTyping) {
    if (!conn || !conn.open) return;
    conn.send(`typing:${isTyping}`);
}

async function sendMessage() {
    if (!conn || !conn.open) {
        alert("Not connected yet! Connect to your friend first.");
        return;
    }

    const text = messageInput.value.trim();
    const file = fileInput.files[0];
    const messageId = generateMessageId();
    const timestamp = Date.now();

    sendTypingEvent(false);

    if (text) {
        if (replyingToMessage) {
            const replyTo = replyingToMessage.dataset.message;
            const replyToId = replyingToMessage.dataset.messageId;
            const replyToMediaType = replyingToMessage.dataset.mediaType || '';
            const replyToMediaSrc = replyingToMessage.dataset.mediaSrc || '';
            conn.send(`reply:${replyTo}:${text}:${messageId}:${timestamp}:${replyToId}:${replyToMediaType}:${replyToMediaSrc}`);
            displayMessage(text, 'sender', replyTo, messageId, timestamp, replyToId, replyToMediaType, replyToMediaSrc);
            replyingToMessage = null;
            replyPreviewArea.classList.remove('active');
        } else {
            conn.send(`${messageId}:${timestamp}:${text}`);
            displayMessage(text, 'sender', null, messageId, timestamp);
        }
        messageInput.value = '';
    }
    if (file) {
        try {
            let fileToSend = file;
            if (file.type.startsWith('image')) {
                fileToSend = await new Promise((resolve) => {
                    compressImage(file, (compressedFile) => resolve(compressedFile));
                });
            }
            const base64Data = await fileToBase64(fileToSend);
            const chunkSize = 16 * 1024;
            const totalChunks = Math.ceil(base64Data.length / chunkSize);
            let chunksSent = 0;

            const progressBar = filePreview.querySelector('.progress');
            for (let i = 0; i < base64Data.length; i += chunkSize) {
                const chunk = base64Data.slice(i, i + chunkSize);
                conn.send(`media:${fileToSend.type}:${chunk}:${fileToSend.name}:${messageId}:${timestamp}`);
                chunksSent++;
                const progress = (chunksSent / totalChunks) * 100;
                progressBar.style.width = `${progress}%`;
            }
            displayMedia(fileToSend.type, base64Data, fileToSend.name, 'sender', messageId, timestamp);
            fileInput.value = '';
            clearFilePreview();
        } catch (error) {
            console.error('Error sending file:', error);
            alert('Failed to send file. Please try again.');
            clearFilePreview();
        }
    }
}

function shareLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
            const message = `My location: ${locationUrl}`;
            const messageId = generateMessageId();
            const timestamp = Date.now();
            conn.send(`${messageId}:${timestamp}:${message}`);
            displayMessage(message, 'sender', null, messageId, timestamp);
        },
        (error) => {
            console.error('Error getting location:', error);
            alert('Unable to get your location. Please allow location access and try again.');
        }
    );
}

function openGifPicker() {
    document.getElementById('gif-picker').classList.add('active');
}

function closeGifPicker() {
    document.getElementById('gif-picker').classList.remove('active');
}

function populateGifPicker() {
    const gifList = document.getElementById('gif-list');
    gifs.forEach(gif => {
        const img = document.createElement('img');
        img.src = gif;
        img.onclick = () => {
            sendGif(gif);
            closeGifPicker();
        };
        gifList.appendChild(img);
    });
}

function sendGif(gifUrl) {
    fetch(gifUrl)
        .then(response => response.blob())
        .then(blob => {
            const file = new File([blob], 'gif.gif', { type: 'image/gif' });
            fileInput.files = new DataTransfer().files;
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            sendMessage();
        })
        .catch(error => {
            console.error('Error sending GIF:', error);
            alert('Failed to send GIF. Please try again.');
        });
}

function disconnect() {
    if (conn) {
        conn.close();
    }
    if (peer) {
        peer.destroy();
    }
    window.location.href = 'index.html';
}

function goToHome() {
    disconnect();
}

function initChatBoxResize() {
    let isResizing = false;
    let startY;
    let startHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = chatBox.offsetHeight;
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const deltaY = startY - e.clientY;
        const newHeight = startHeight + deltaY;
        const minHeight = 200;
        const maxHeight = window.innerHeight - 220;
        chatBox.style.height = `${Math.max(minHeight, Math.min(newHeight, maxHeight))}px`;
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.userSelect = '';
    });

    resizeHandle.addEventListener('touchstart', (e) => {
        isResizing = true;
        startY = e.touches[0].clientY;
        startHeight = chatBox.offsetHeight;
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;
        const deltaY = startY - e.touches[0].clientY;
        const newHeight = startHeight + deltaY;
        const minHeight = 200;
        const maxHeight = window.innerHeight - 220;
        chatBox.style.height = `${Math.max(minHeight, Math.min(newHeight, maxHeight))}px`;
    });

    document.addEventListener('touchend', () => {
        isResizing = false;
        document.body.style.userSelect = '';
    });
}

function addSwipeAndLongPress(messageDiv) {
    let startX, startY, startTime;

    messageDiv.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
    });

    messageDiv.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const endTime = Date.now();
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const deltaTime = endTime - startTime;

        if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30 && deltaTime > 500) {
            replyingToMessage = messageDiv;
            replyPreview.innerHTML = '';
            if (messageDiv.dataset.mediaType && (messageDiv.dataset.mediaType.startsWith('image') || messageDiv.dataset.mediaType.startsWith('video'))) {
                if (messageDiv.dataset.mediaType.startsWith('image')) {
                    const img = document.createElement('img');
                    img.src = messageDiv.dataset.mediaSrc;
                    replyPreview.appendChild(img);
                } else if (messageDiv.dataset.mediaType.startsWith('video')) {
                    const video = document.createElement('video');
                    video.src = messageDiv.dataset.mediaSrc;
                    video.controls = true;
                    replyPreview.appendChild(video);
                }
            } else {
                replyPreview.textContent = messageDiv.dataset.message;
            }
            replyPreviewArea.classList.add('active');
        } else if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50) {
            if (deltaX > 0) {
                navigator.clipboard.writeText(messageDiv.dataset.message).then(() => {
                    alert('Message copied to clipboard!');
                });
            }
        }
    });

    messageDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        replyingToMessage = messageDiv;
        replyPreview.innerHTML = '';
        if (messageDiv.dataset.mediaType && (messageDiv.dataset.mediaType.startsWith('image') || messageDiv.dataset.mediaType.startsWith('video'))) {
            if (messageDiv.dataset.mediaType.startsWith('image')) {
                const img = document.createElement('img');
                img.src = messageDiv.dataset.mediaSrc;
                replyPreview.appendChild(img);
            } else if (messageDiv.dataset.mediaType.startsWith('video')) {
                const video = document.createElement('video');
                video.src = messageDiv.dataset.mediaSrc;
                video.controls = true;
                replyPreview.appendChild(video);
            }
        } else {
            replyPreview.textContent = messageDiv.dataset.message;
        }
        replyPreviewArea.classList.add('active');
    });
}

function cancelReply() {
    replyingToMessage = null;
    replyPreviewArea.classList.remove('active');
}

messageInput.addEventListener('input', () => {
    if (!conn || !conn.open) return;
    sendTypingEvent(true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        sendTypingEvent(false);
    }, 1000);
});

function saveMessage(message) {
    const chatKey = `${myConnectionCode}-${friendCode}`;
    if (!chatHistory[chatKey]) {
        chatHistory[chatKey] = [];
    }
    chatHistory[chatKey].push(message);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function loadChatHistory() {
    chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || {};
    const chatKey = `${myConnectionCode}-${friendCode}`;
    if (chatHistory[chatKey]) {
        chatHistory[chatKey].forEach(message => {
            if (message.text) {
                displayMessage(
                    message.text,
                    message.type,
                    message.replyTo,
                    message.messageId,
                    message.timestamp,
                    message.replyToId,
                    message.replyToMediaType,
                    message.replyToMediaSrc
                );
            } else if (message.mediaType) {
                displayMedia(
                    message.mediaType,
                    message.base64Data,
                    message.fileName,
                    message.type,
                    message.messageId,
                    message.timestamp
                );
            }
        });
    }
}

function displayRecentChats() {
    const chatList = document.getElementById('chat-list');
    recentChats.forEach(code => {
        const chatItem = document.createElement('div');
        chatItem.classList.add('chat-list-item');
        chatItem.innerHTML = `
            <span class="code">${code}</span>
            <span class="status">Checking...</span>
        `;
        chatList.appendChild(chatItem);

        const tempPeer = new Peer(myConnectionCode + '-temp', {
            host: peerJsServers[0].host,
            port: peerJsServers[0].port,
            path: peerJsServers[0].path
        });

        tempPeer.on('open', () => {
            const tempConn = tempPeer.connect(code);
            tempConn.on('open', () => {
                chatItem.querySelector('.status').textContent = 'Online';
                chatItem.querySelector('.status').classList.add('online');
                tempPeer.destroy();
            });
            tempConn.on('error', () => {
                chatItem.querySelector('.status').textContent = 'Offline';
                chatItem.querySelector('.status').classList.add('offline');
                tempPeer.destroy();
            });
        });

        chatItem.onclick = () => {
            friendCodeInput.value = code;
            connectToFriend();
        };
    });
}

function applyTheme() {
    const selectedTheme = localStorage.getItem('selectedTheme') || 'theme-default';
    document.body.className = '';
    document.body.classList.add(selectedTheme);
}

function populateThemeSelector() {
    const themeList = document.getElementById('theme-list');
    themes.forEach(theme => {
        const themeOption = document.createElement('div');
        themeOption.classList.add('theme-option');
        themeOption.textContent = theme.name;
        if (localStorage.getItem('selectedTheme') === theme.class) {
            themeOption.classList.add('active');
        }
        themeOption.onclick = () => {
            localStorage.setItem('selectedTheme', theme.class);
            applyTheme();
            document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
            themeOption.classList.add('active');
        };
        themeList.appendChild(themeOption);
    });
}

function openThemeSelector() {
    document.getElementById('theme-selector').classList.add('active');
}

function closeThemeSelector() {
    document.getElementById('theme-selector').classList.remove('active');
}
