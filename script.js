let peer;
let conn;
let myConnectionCode = '';
let friendCode = '';
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
    friendCode = '';
    myCodeDisplay.textContent = '';
    myCodeInput.disabled = false;
    myCodeInput.value = '';
    friendCodeInput.value = '';
    status.textContent = "Disconnected";
    status.classList.remove('connected');
    status.classList.add('disconnected');
    chatBox.innerHTML = '';
    typingIndicator.classList.remove('active');
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
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        debug: 2
    });

    peer.on('open', () => {
        status.textContent = "Your ID is set. Share your code with your friend!";
        status.classList.remove('connected');
        status.classList.add('disconnected');
        connectBtn.disabled = false;
    });

    peer.on('error', (err) => {
        status.textContent = "PeerJS error: " + err;
        status.classList.remove('connected');
        status.classList.add('disconnected');
        console.error("PeerJS error:", err);
        resetConnection();
    });

    // Handle incoming connections
    peer.on('connection', (connection) => {
        conn = connection;
        friendCode = conn.peer; // Set friendCode to the peer's ID
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
                typingIndicator.classList.toggle('active', isTyping);
            } else {
                displayMessage(data, 'receiver');
            }
        } else {
            displayMessage(data, 'receiver');
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

// Display incoming or outgoing messages/files
function displayMessage(data, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);

    if (typeof data === 'string') {
        const name
