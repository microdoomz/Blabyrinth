let peer;
let dataChannel;
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const myCodeDisplay = document.getElementById('my-code');
const friendCodeInput = document.getElementById('friend-code');

// Generate and display your connection code
const connectionCode = Math.random().toString(36).substring(2, 10);
myCodeDisplay.textContent = connectionCode;

// Initialize WebRTC Peer Connection
function initPeerConnection(isInitiator) {
    peer = new RTCPeerConnection();

    if (isInitiator) {
        // Create a data channel if initiating
        dataChannel = peer.createDataChannel('chat');
        dataChannel.onmessage = (event) => displayMessage(event.data);
        dataChannel.onopen = () => status.textContent = "Connected! Start chatting.";
        dataChannel.onclose = () => status.textContent = "Connection closed.";
    } else {
        // Wait for the other peer to create the channel
        peer.ondatachannel = (event) => {
            dataChannel = event.channel;
            dataChannel.onmessage = (event) => displayMessage(event.data);
            dataChannel.onopen = () => status.textContent = "Connected! Start chatting.";
            dataChannel.onclose = () => status.textContent = "Connection closed.";
        };
    }

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
        if (event.candidate) {
            alert("Copy this ICE candidate and send it to your friend:\n" + JSON.stringify(event.candidate));
        }
    };

    if (isInitiator) {
        peer.createOffer()
            .then(offer => peer.setLocalDescription(offer))
            .then(() => {
                alert("Copy this offer and send it to your friend:\n" + JSON.stringify(peer.localDescription));
            });
    }
}

// Start the connection when the user clicks "Connect"
function startConnection() {
    const friendCode = friendCodeInput.value.trim();
    if (!friendCode) {
        alert("Please enter your friend's connection code!");
        return;
    }

    // Decide who initiates based on code comparison (simple heuristic)
    const isInitiator = connectionCode < friendCode;
    initPeerConnection(isInitiator);

    if (!isInitiator) {
        const offer = prompt("Paste the offer your friend sent you:");
        peer.setRemoteDescription(JSON.parse(offer))
            .then(() => peer.createAnswer())
            .then(answer => peer.setLocalDescription(answer))
            .then(() => {
                alert("Copy this answer and send it to your friend:\n" + JSON.stringify(peer.localDescription));
            });
        const candidate = prompt("Paste the ICE candidate your friend sent you:");
        peer.addIceCandidate(JSON.parse(candidate));
    }
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
    if (!dataChannel || dataChannel.readyState !== 'open') {
        alert("Not connected yet! Exchange connection details first.");
        return;
    }

    const text = messageInput.value;
    const file = fileInput.files[0];

    if (text) {
        dataChannel.send(text);
        displayMessage("You: " + text);
        messageInput.value = '';
    }
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            dataChannel.send(reader.result);
            displayMessage(file);
        };
        reader.readAsArrayBuffer(file);
        fileInput.value = '';
    }
}
