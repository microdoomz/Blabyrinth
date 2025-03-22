let node;
let myConnectionCode = '';
let typingTimeout;
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const myCodeDisplay = document.getElementById('my-code');
const myCodeInput = document.getElementById('my-code-input');
const peerIdDisplay = document.getElementById('peer-id');
const friendPeerIdInput = document.getElementById('friend-peer-id');
const typingIndicator = document.getElementById('typing-indicator');

// Reset UI on page load
window.onload = () => {
    resetConnection();
};

// Reset connection state
function resetConnection() {
    if (node) {
        node.stop();
    }
    node = null;
    myConnectionCode = '';
    myCodeDisplay.textContent = '';
    peerIdDisplay.textContent = '';
    myCodeInput.disabled = false;
    myCodeInput.value = '';
    friendPeerIdInput.value = '';
    status.textContent = '';
    chatBox.innerHTML = '';
    typingIndicator.textContent = '';
}

// Set your custom connection code and initialize IPFS
async function setMyCode() {
    myConnectionCode = myCodeInput.value.trim();
    if (!myConnectionCode) {
        alert("Please enter a valid code!");
        return;
    }
    myCodeDisplay.textContent = myConnectionCode;
    myCodeInput.disabled = true;

    // Initialize IPFS node
    status.textContent = "Initializing IPFS node...";
    try {
        node = await Ipfs.create({
            repo: 'ipfs-' + Math.random(),
            config: {
                Addresses: {
                    Swarm: [
                        '/dns4/wss0.bootstrap.libp2p.io/tcp/443/wss/p2p-websocket-star',
                        '/dns4/wss1.bootstrap.libp2p.io/tcp/443/wss/p2p-websocket-star'
                    ]
                }
            }
        });

        const peerInfo = await node.id();
        peerIdDisplay.textContent = peerInfo.id;
        status.textContent = "IPFS node started. Share your Peer ID with your friend!";
    } catch (err) {
        status.textContent = "Failed to start IPFS node: " + err;
    }
}

// Connect to your friend's IPFS Peer ID
async function connectToFriend() {
    if (!myConnectionCode || !node) {
        alert("Please set your connection code first!");
        return;
    }
    const friendPeerId = friendPeerIdInput.value.trim();
    if (!friendPeerId) {
        alert("Please enter your friend's IPFS Peer ID!");
        return;
    }

    // Try to connect to the friend's peer
    status.textContent = "Connecting to friend...";
    try {
        await node.swarm.connect(`/p2p/${friendPeerId}`);
        status.textContent = "Connected to friend! Subscribing to chat channel...";

        // Use a pubsub channel based on the connection codes
        const channel = `chat-${[myConnectionCode, friendPeerId].sort().join('-')}`;
        await node.pubsub.subscribe(channel, (msg) => {
            const data = new TextDecoder().decode(msg.data);
            try {
                const parsedData = JSON.parse(data);
                if (parsedData.type === 'typing') {
                    if (parsedData.isTyping) {
                        typingIndicator.textContent = "Friend is typing...";
                    } else {
                        typingIndicator.textContent = "";
                    }
                } else {
                    displayMessage(parsedData);
                }
            } catch (err) {
                displayMessage(data);
            }
        });
        status.textContent = "Connected! Start chatting.";
    } catch (err) {
        status.textContent = "Failed to connect: " + err;
    }
}

// Display incoming or outgoing messages/files
function displayMessage(data) {
    if (typeof data === 'string') {
        const msg = document.createElement('p');
        msg.textContent = data;
        chatBox.appendChild(msg);
    } else if (data.type && data.content) {
        // Handle media
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
async function sendTypingEvent(isTyping) {
    if (!node || !friendPeerIdInput.value.trim()) return;

    const channel = `chat-${[myConnectionCode, friendPeerIdInput.value.trim()].sort().join('-')}`;
    const message = JSON.stringify({ type: 'typing', isTyping });
    await node.pubsub.publish(channel, new TextEncoder().encode(message));
}

// Send text or file
async function sendMessage() {
    if (!node) {
        alert("Not connected yet! Connect to your friend first.");
        return;
    }

    const friendPeerId = friendPeerIdInput.value.trim();
    if (!friendPeerId) {
        alert("Please enter your friend's IPFS Peer ID!");
        return;
    }

    const channel = `chat-${[myConnectionCode, friendPeerId].sort().join('-')}`;
    const text = messageInput.value;
    const file = fileInput.files[0];

    // Clear typing indicator when sending a message
    await sendTypingEvent(false);

    if (text) {
        const message = "Friend: " + text;
        await node.pubsub.publish(channel, new TextEncoder().encode(message));
        displayMessage("You: " + text);
        messageInput.value = '';
    }
    if (file) {
        const reader = new FileReader();
        reader.onload = async () => {
            const arrayBuffer = reader.result;
            const message = JSON.stringify({
                type: file.type,
                content: Array.from(new Uint8Array(arrayBuffer))
            });
            await node.pubsub.publish(channel, new TextEncoder().encode(message));
            displayMessage({ type: file.type, content: new Uint8Array(arrayBuffer) });
        };
        reader.readAsArrayBuffer(file);
        fileInput.value = '';
    }
}

// Add typing event listener
messageInput.addEventListener('input', () => {
    if (!node || !friendPeerIdInput.value.trim()) return;

    // Send typing event when user starts typing
    sendTypingEvent(true);

    // Clear typing event after 2 seconds of inactivity
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        sendTypingEvent(false);
    }, 2000);
});
