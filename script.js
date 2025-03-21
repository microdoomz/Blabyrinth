let peer;
let dataChannel;
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');

// Generate a random connection code for this user
const connectionCode = Math.random().toString(36).substring(2, 10);
status.textContent = `Your connection code: ${connectionCode}. Share it with your friend.`;

// Ask for the friend's code
const friendCode = prompt("Enter your friend's connection code to connect:");

// Initialize WebRTC Peer Connection
function initPeerConnection() {
    peer = new RTCPeerConnection();

    // Create a data channel for sending messages
    dataChannel = peer.createDataChannel('chat');
    dataChannel.onmessage = (event) => displayMessage(event.data);
    dataChannel.onopen = () => status.textContent = "Connected! Start chatting.";
    dataChannel.onclose = () => status.textContent = "Connection closed.";

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
        if (event.candidate) {
            // In a real app, you'd send this to the other peer via a signaling server
            alert("Copy this ICE candidate and send it to your friend:\n" + JSON.stringify(event.candidate));
        }
    };

    // Offer/Answer exchange
    if (!friendCode) {
        // This user initiates the chat
        peer.createOffer()
            .then(offer => peer.setLocalDescription(offer))
            .then(() => {
                alert("Copy this offer and send it to your friend:\n" + JSON.stringify(peer.localDescription));
            });
    }
}

// Display incoming or outgoing messages/files
function displayMessage(data) {
    if (typeof data === 'string') {
        const msg = document.createElement('p');
        msg.textContent = data;
        chatBox.appendChild(msg);
    } else {
        // Handle file (image/video)
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
    if (dataChannel.readyState !== 'open') {
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

// Manual signaling (since no server)
if (friendCode) {
    initPeerConnection();
    const offer = prompt("Paste the offer your friend sent you:");
    peer.setRemoteDescription(JSON.parse(offer))
        .then(() => peer.createAnswer())
        .then(answer => peer.setLocalDescription(answer))
        .then(() => {
            alert("Copy this answer and send it to your friend:\n" + JSON.stringify(peer.localDescription));
        });
    const candidate = prompt("Paste the ICE candidate your friend sent you:");
    peer.addIceCandidate(JSON.parse(candidate));
} else {
    initPeerConnection();
}