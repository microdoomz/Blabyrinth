let peer;
let conn;
let myConnectionCode = '';
let friendCode = '';
let typingTimeout;
let typingMessageElement = null;
let replyingToMessage = null;
let messageStatuses = new Map();
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const status = document.getElementById('status');
const myCodeDisplay = document.getElementById('my-code');
const myCodeInput = document.getElementById('my-code-input');
const friendCodeInput = document.getElementById('friend-code');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const mediaOverlay = document.getElementById('media-overlay');
const mediaOverlayContent = document.getElementById('media-overlay-content');
const downloadBtn = document.getElementById('download-btn');
const replyPreviewArea = document.getElementById('reply-preview-area');
const replyPreview = document.getElementById('reply-preview');
const resizeHandle = document.getElementById('chat-box-resize-handle');

// List of PeerJS servers for fallback
const peerJsServers = [
    { host: '0.peerjs.com', port: 443, path: '/' },
    { host: 'peerjs.herokuapp.com', port: 443, path: '/' },
    { host: 'peerjs-server-staging.herokuapp.com', port: 443, path: '/' }
];
let currentServerIndex = 0;

// Load saved connection details from localStorage
window.onload = () => {
    const savedMyCode = localStorage.getItem('myConnectionCode');
    const savedFriendCode = localStorage.getItem('friendCode');
    if (savedMyCode) {
        myCodeInput.value = savedMyCode;
        myCodeInput.disabled = true;
        myCodeDisplay.textContent = savedMyCode;
        myConnectionCode = savedMyCode;
        connectToNextPeerJsServer();
    }
    if (savedFriendCode) {
        friendCodeInput.value = savedFriendCode;
        friendCode = savedFriendCode;
        if (myConnectionCode) {
            connectToFriend();
        }
    }
    // Ensure reply preview area is hidden on load
    replyPreviewArea.classList.remove('active');
    // Initialize chat box resizing
    initChatBoxResize();
};

// Reset connection state
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

// Set your custom connection code and initialize PeerJS with fallback
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

// Connect to a PeerJS server with fallback mechanism
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

    // Handle incoming connections
    peer.on('connection', (connection) => {
        conn = connection;
        friendCode = conn.peer;
        localStorage.setItem('friendCode', friendCode);
        setupConnection();
    });
}

// Connect to your friend's ID with retry logic
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

// Retry connection with delay
function attemptConnection(friendCode, retries, delay) {
    if (retries <= 0) {
        status.textContent = "Failed to connect to " + friendCode + ". Please ensure they are online and try again.";
        status.classList.remove('connected');
        status.classList.add('disconnected');
        return;
    }

    conn = peer.connect(friendCode);
    conn.on('open', () => {
        setupConnection();
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

// Set up the connection for sending/receiving messages
function setupConnection() {
    status.textContent = "Connected! Start chatting.";
    status.classList.remove('disconnected');
    status.classList.add('connected');
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
        status.textContent = "Connection closed.";
        status.classList.remove('connected');
        status.classList.add('disconnected');
        conn = null;
    });

    conn.on('error', (err) => {
        status.textContent = "Connection error: " + err;
        status.classList.remove('connected');
        status.classList.add('disconnected');
    });

    // Mark messages as seen when they come into view
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

    // Observe existing messages and new ones
    const observeMessages = () => {
        const messages = chatBox.querySelectorAll('.message.receiver');
        messages.forEach(message => {
            if (!message.dataset.observed) {
                observer.observe(message);
                message.dataset.observed = 'true';
            }
        });
    };

    // Initial observation
    observeMessages();

    // Observe on scroll and new messages
    chatBox.addEventListener('scroll', observeMessages);
    const mutationObserver = new MutationObserver(observeMessages);
    mutationObserver.observe(chatBox, { childList: true });
}

// Generate a unique message ID
function generateMessageId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Convert timestamp to IST and format like WhatsApp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    // Get the UTC time and adjust for IST (UTC +5:30)
    const istOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
    const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    const istMinutes = (utcMinutes + istOffset) % (24 * 60);
    const istHours = Math.floor(istMinutes / 60);
    const minutes = (istMinutes % 60).toString().padStart(2, '0');
    const hours = istHours % 12 || 12;
    const ampm = istHours >= 12 ? 'pm' : 'am';
    return `${hours}:${minutes} ${ampm}`;
}

// Update message status
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

// Display incoming or outgoing text messages
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
    return messageId;
}

// Show typing indicator inside chat box
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

// Hide typing indicator
function hideTypingIndicator() {
    if (typingMessageElement) {
        typingMessageElement.remove();
        typingMessageElement = null;
    }
    scrollToBottom();
}

// Display media from Base64 data
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
    return messageId;
}

// Open media in full-screen overlay
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

// Close media overlay
function closeMediaOverlay() {
    mediaOverlay.classList.remove('active');
    mediaOverlayContent.innerHTML = '';
}

// Convert file to Base64 and send
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

// Show file preview
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
    } else {
        clearFilePreview();
    }
});

// Clear file preview
function clearFilePreview() {
    filePreview.innerHTML = '';
}

// Scroll to bottom of chat box
function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
    setTimeout(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 0);
}

// Send typing event
function sendTypingEvent(isTyping) {
    if (!conn || !conn.open) return;
    conn.send(`typing:${isTyping}`);
}

// Send text or file
async function sendMessage() {
    if (!conn || !conn.open) {
        alert("Not connected yet! Connect to your friend first.");
        return;
    }

    const text = messageInput.value.trim();
    const file = fileInput.files[0];
    const messageId = generateMessageId();
    const timestamp = Date.now();

    // Clear typing indicator when sending a message
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
            const base64Data = await fileToBase64(file);
            const message = `media:${file.type}:${base64Data}:${file.name}:${messageId}:${timestamp}`;
            conn.send(message);
            displayMedia(file.type, base64Data, file.name, 'sender', messageId, timestamp);
        } catch (err) {
            console.error("Failed to encode file to Base64:", err);
            alert("Failed to encode and send media.");
        }
        fileInput.value = '';
        clearFilePreview();
    }
}

// Disconnect manually
function disconnect() {
    resetConnection();
}

// Add typing event listener
messageInput.addEventListener('input', () => {
    if (!conn || !conn.open) return;

    // Send typing event when user starts typing
    sendTypingEvent(true);

    // Clear typing event after 2 seconds of inactivity
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        sendTypingEvent(false);
    }, 2000);
});

// Send message on Enter key
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

// Swipe and long-press for reply
function addSwipeAndLongPress(messageDiv) {
    let startX = 0;
    let isSwiping = false;

    messageDiv.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isSwiping = true;
    });

    messageDiv.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        const currentX = e.touches[0].clientX;
        const diffX = currentX - startX;
        if (diffX > 50) {
            messageDiv.style.transform = 'translateX(50px)';
            showReplyPreview(messageDiv);
            // Automatically open the keyboard
            messageInput.focus();
        } else {
            messageDiv.style.transform = 'translateX(0)';
            replyPreviewArea.classList.remove('active');
        }
    });

    messageDiv.addEventListener('touchend', (e) => {
        const currentX = e.changedTouches[0].clientX;
        const diffX = currentX - startX;
        if (diffX > 50) {
            // Keep the preview visible for user to type or cancel
        } else {
            replyPreviewArea.classList.remove('active');
            replyingToMessage = null;
        }
        messageDiv.style.transform = 'translateX(0)';
        isSwiping = false;
    });

    messageDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showReplyPreview(messageDiv);
        messageInput.focus();
    });
}

function showReplyPreview(messageDiv) {
    replyingToMessage = messageDiv;
    replyPreviewArea.classList.add('active');

    // Show preview (image, video, or text)
    replyPreview.innerHTML = '';
    if (messageDiv.dataset.mediaType) {
        if (messageDiv.dataset.mediaType.startsWith('image')) {
            const img = document.createElement('img');
            img.src = messageDiv.dataset.mediaSrc;
            replyPreview.appendChild(img);
        } else if (messageDiv.dataset.mediaType.startsWith('video')) {
            const video = document.createElement('video');
            video.src = messageDiv.dataset.mediaSrc;
            video.controls = true;
            replyPreview.appendChild(video);
        } else {
            replyPreview.textContent = messageDiv.dataset.message;
        }
    } else {
        replyPreview.textContent = messageDiv.dataset.message;
    }
}

function cancelReply() {
    replyingToMessage = null;
    replyPreviewArea.classList.remove('active');
    messageInput.blur(); // Close the keyboard if open
}

// Initialize chat box resizing
function initChatBoxResize() {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = chatBox.offsetHeight;
        document.body.style.userSelect = 'none'; // Prevent text selection while resizing
    });

    resizeHandle.addEventListener('touchstart', (e) => {
        isResizing = true;
        startY = e.touches[0].clientY;
        startHeight = chatBox.offsetHeight;
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const deltaY = e.clientY - startY;
        let newHeight = startHeight + deltaY;
        // Enforce minimum and maximum heights
        const minHeight = 200; // Same as CSS min-height
        const maxHeight = window.innerHeight - 200; // Same as CSS max-height
        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
        chatBox.style.height = `${newHeight}px`;
    });

    document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;
        const deltaY = e.touches[0].clientY - startY;
        let newHeight = startHeight + deltaY;
        const minHeight = 200;
        const maxHeight = window.innerHeight - 220; // Adjust for mobile
        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
        chatBox.style.height = `${newHeight}px`;
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.userSelect = '';
    });

    document.addEventListener('touchend', () => {
        isResizing = false;
        document.body.style.userSelect = '';
    });
}
