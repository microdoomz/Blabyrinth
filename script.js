let peer;
let conn;
let myConnectionCode = '';
let friendCode = '';
let typingTimeout;
let typingMessageElement = null;
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const myCodeDisplay = document.getElementById('my-code');
const myCodeInput = document.getElementById('my-code-input');
const friendCodeInput = document.getElementById('friend-code');
const connectBtn = document.getElementById('connect-btn');

// List of PeerJS servers for fallback
const peerJsServers = [
    { host: '0.peerjs.com', port: 443, path: '/' },
    { host: 'peerjs.herokuapp.com', port: 443, path: '/' },
    { host: 'peerjs-server-staging.herokuapp.com', port: 443, path: '/' }
];
let currentServerIndex = 0;

// Reset UI on page load
window.onload = () => {
    resetConnection();
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

    connectToNextPeerJsServer();
}

// Connect to a PeerJS server with fallback mechanism
function connectToNextPeerJsServer() {
    if (currentServerIndex >= peerJsServers.length) {
        status.textContent = "Failed to connect to any PeerJS server.";
        status.classList.remove('connected');
        status.classList.add('disconnected');
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
                const [_, mediaType, base64Data] = data.split(':');
                displayMedia(mediaType, base64Data, 'receiver');
            } else {
                displayMessage(data, 'receiver');
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
}

// Display incoming or outgoing text messages
function displayMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('name');
    nameSpan.textContent = (type === 'sender' ? myConnectionCode : friendCode) + ':';
    messageDiv.appendChild(nameSpan);

    const contentSpan = document.createElement('span');
    contentSpan.textContent = text;
    messageDiv.appendChild(contentSpan);

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
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
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    if (typingMessageElement) {
        typingMessageElement.remove();
        typingMessageElement = null;
    }
}

// Display media from Base64 data
function displayMedia(mediaType, base64Data, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('name');
    nameSpan.textContent = (type === 'sender' ? myConnectionCode : friendCode) + ':';
    messageDiv.appendChild(nameSpan);

    const element = mediaType.startsWith('image') ? document.createElement('img') : document.createElement('video');
    element.src = `data:${mediaType};base64,${base64Data}`;
    if (element.tagName === 'VIDEO') {
        element.controls = true;
    }
    element.style.maxWidth = '100%';
    messageDiv.appendChild(element);

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Convert file to Base64 and send
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1]; // Remove "data:mime/type;base64," prefix
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
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

    // Clear typing indicator when sending a message
    sendTypingEvent(false);

    if (text) {
        conn.send(text);
        displayMessage(text, 'sender');
        messageInput.value = '';
    }
    if (file) {
        try {
            const base64Data = await fileToBase64(file);
            const message = `media:${file.type}:${base64Data}`;
            conn.send(message);
            displayMedia(file.type, base64Data, 'sender');
        } catch (err) {
            console.error("Failed to encode file to Base64:", err);
            alert("Failed to encode and send media.");
        }
        fileInput.value = '';
    }
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
