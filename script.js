let peer;
let conn;
let myConnectionCode = '';
let typingTimeout;
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const myCodeDisplay = document.getElementById('my-code');
const myCodeInput = document.getElementById('my-code-input');
const friendCodeInput = document.getElementById('friend-code');
const typingIndicator = document.getElementById('typing-indicator');
const connectBtn = document.getElementById('connect-btn');

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
    myCodeDisplay.textContent = '';
    myCodeInput.disabled = false;
    myCodeInput.value = '';
    friendCodeInput.value = '';
    status.textContent = '';
    chatBox.innerHTML = '';
    typingIndicator.textContent = '';
    connectBtn.disabled = true;
}

// Set your custom connection code and initialize PeerJS
function setMyCode() {
    myConnectionCode = myCodeInput.value.trim();
    if (!myConnectionCode) {
        alert("Please enter a valid code!");
        return;
    }
    myCodeDisplay.textContent = myConnectionCode;
    myCodeInput.disabled = true;

    // Initialize PeerJS with your custom ID
    peer = new Peer(myConnectionCode, {
        host: '0.peerjs.com', // Free PeerJS signaling server
        port: 443,
        path: '/',
        debug: 2 // Enable debug logs for troubleshooting
    });

    peer.on('open', () => {
        status.textContent = "Your ID is set. Share your code with your friend!";
        connectBtn.disabled = false; // Enable the Connect button
    });

    peer.on('error', (err) => {
        status.textContent = "PeerJS error: " + err;
        console.error("PeerJS error:", err);
        resetConnection();
    });

    // Handle incoming connections
    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
    });
}

// Connect to your friend's ID with retry logic
function connectToFriend() {
    if (!myConnectionCode) {
        alert("Please set your connection code first!");
        return;
    }
    const friendCode = friendCodeInput.value.trim();
    if (!friendCode) {
        alert("Please enter your friend's connection code!");
        return;
    }

    status.textContent = "Attempting to connect to " + friendCode + "...";
    attemptConnection(friendCode, 3, 2000); // Retry 3 times, 2-second delay
}

// Retry connection with delay
function attemptConnection(friendCode, retries, delay) {
    if (retries <= 0) {
        status.textContent = "Failed to connect to " + friendCode + ". Please ensure they are online and try again.";
        return;
    }

    conn = peer.connect(friendCode);
    conn.on('open', () => {
        setupConnection();
    });

    conn.on('error', (err) => {
        status.textContent = "Connection attempt failed. Retrying... (" + retries + " attempts left)";
        setTimeout(() => {
            attemptConnection(friendCode, retries - 1, delay);
        }, delay);
    });
}

// Set up the connection for sending/receiving messages
function setupConnection() {
    status.textContent = "Connected! Start chatting.";
    conn.on('data', (data) => {
        if (typeof data === 'string') {
            if (data.startsWith('typing:')) {
                const isTyping = data.split(':')[1] === 'true';
                typingIndicator.textContent = isTyping ? "Friend is typing..." : "";
            } else {
                displayMessage(data);
            }
        } else {
            displayMessage(data);
        }
    });

    conn.on('close', () => {
        status.textContent = "Connection closed.";
        conn = null;
    });

    conn.on('error', (err) => {
        status.textContent = "Connection error: " + err;
    });
}

// Display incoming or outgoing messages/files
function displayMessage(data) {
    if (typeof data === 'string') {
        const msg = document.createElement('p');
        msg.textContent = data;
        chatBox.appendChild(msg);
    } else if (data.type && data.content) {
        const blob = new Blob([new Uint8Array(data.content)], { type: data.type });
        const url = URL.createObjectURL(blob);
        const element = data.type.startsWith('image') ? document.createElement('img') : document.createElement('video');
        element.src = url;
        if (element.tagName === 'VIDEO') {
            element.controls = true;
        }
        element.style.maxWidth = '100%';
        chatBox.appendChild(element);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Send typing event
function sendTypingEvent(isTyping) {
    if (!conn || !conn.open) return;
    conn.send(`typing:${isTyping}`);
}

// Send text or file
function sendMessage() {
    if (!conn || !conn.open) {
        alert("Not connected yet! Connect to your friend first.");
        return;
    }

    const text = messageInput.value;
    const file = fileInput.files[0];

    // Clear typing indicator when sending a message
    sendTypingEvent(false);

    if (text) {
        conn.send("Friend: " + text);
        displayMessage("You: " + text);
        messageInput.value = '';
    }
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result;
            const message = {
                type: file.type,
                content: Array.from(new Uint8Array(arrayBuffer))
            };
            conn.send(message);
            displayMessage(message);
        };
        reader.readAsArrayBuffer(file);
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
