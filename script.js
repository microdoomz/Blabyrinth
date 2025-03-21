let peer;
let conn;
let myConnectionCode = '';
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const myCodeDisplay = document.getElementById('my-code');
const myCodeInput = document.getElementById('my-code-input');
const friendCodeInput = document.getElementById('friend-code');

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
        path: '/'
    });

    peer.on('open', () => {
        status.textContent = "Your ID is set. Share your code with your friend!";
    });

    peer.on('error', (err) => {
        alert("PeerJS error: " + err);
        resetConnection();
    });

    // Handle incoming connections
    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
    });
}

// Connect to your friend's ID
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

    // Connect to the friend's ID
    conn = peer.connect(friendCode);
    setupConnection();
}

// Set up the connection for sending/receiving messages
function setupConnection() {
    conn.on('open', () => {
        status.textContent = "Connected! Start chatting.";
    });

    conn.on('data', (data) => {
        displayMessage(data);
    });

    conn.on('close', () => {
        status.textContent = "Connection closed.";
        conn = null;
    });

    conn.on('error', (err) => {
        alert("Connection error: " + err);
    });
}

// Display incoming or outgoing messages/files
function displayMessage(data) {
    if (typeof data === 'string') {
        const msg = document.createElement('p');
        msg.textContent = data;
        chatBox.appendChild(msg);
    } else {
        const url = URL.createObjectURL(new Blob([data]));
        const element = data.type.startsWith('image') ? document.createElement('img') : document.createElement('video');
        element.src = url;
        element.controls = true;
        element.style.maxWidth = '100%';
        chatBox.appendChild(element);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Send text or file
function sendMessage() {
    if (!conn || !conn.open) {
        alert("Not connected yet! Connect to your friend first.");
        return;
    }

    const text = messageInput.value;
    const file = fileInput.files[0];

    if (text) {
        conn.send("Friend: " + text);
        displayMessage("You: " + text);
        messageInput.value = '';
    }
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            conn.send(reader.result);
            displayMessage(file);
        };
        reader.readAsArrayBuffer(file);
        fileInput.value = '';
    }
}
