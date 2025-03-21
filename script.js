let peer;
let dataChannel;
let myConnectionCode = '';
let isInitiator = false;
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const myCodeDisplay = document.getElementById('my-code');
const myCodeInput = document.getElementById('my-code-input');
const friendCodeInput = document.getElementById('friend-code');
const offerOutput = document.getElementById('offer-output');
const iceOutput = document.getElementById('ice-output');
const friendOfferInput = document.getElementById('friend-offer');
const friendIceInput = document.getElementById('friend-ice');
const copyOfferBtn = document.getElementById('copy-offer');
const copyIceBtn = document.getElementById('copy-ice');
const roleInfo = document.getElementById('role-info');

// Reset UI and connection on page load/refresh
window.onload = () => {
    resetConnection();
};

// Reset connection state
function resetConnection() {
    if (peer) {
        peer.close();
    }
    peer = null;
    dataChannel = null;
    myConnectionCode = '';
    isInitiator = false;
    myCodeDisplay.textContent = '';
    myCodeInput.disabled = false;
    myCodeInput.value = '';
    friendCodeInput.value = '';
    offerOutput.textContent = '';
    iceOutput.textContent = '';
    friendOfferInput.value = '';
    friendIceInput.value = '';
    copyOfferBtn.style.display = 'none';
    copyIceBtn.style.display = 'none';
    roleInfo.textContent = 'Your role will appear here after connecting.';
    status.textContent = '';
    chatBox.innerHTML = '';
}

// Set your custom connection code
function setMyCode() {
    myConnectionCode = myCodeInput.value.trim();
    if (!myConnectionCode) {
        alert("Please enter a valid code!");
        return;
    }
    myCodeDisplay.textContent = myConnectionCode;
    myCodeInput.disabled = true;
}

// Initialize WebRTC Peer Connection
function initPeerConnection() {
    peer = new RTCPeerConnection();

    if (isInitiator) {
        dataChannel = peer.createDataChannel('chat');
        dataChannel.onmessage = (event) => displayMessage(event.data);
        dataChannel.onopen = () => status.textContent = "Connected! Start chatting.";
        dataChannel.onclose = () => status.textContent = "Connection closed.";
    } else {
        peer.ondatachannel = (event) => {
            dataChannel = event.channel;
            dataChannel.onmessage = (event) => displayMessage(event.data);
            dataChannel.onopen = () => status.textContent = "Connected! Start chatting.";
            dataChannel.onclose = () => status.textContent = "Connection closed.";
        };
    }

    peer.onicecandidate = (event) => {
        if (event.candidate) {
            iceOutput.textContent = JSON.stringify(event.candidate);
            copyIceBtn.style.display = 'inline';
        }
    };

    if (isInitiator) {
        peer.createOffer()
            .then(offer => peer.setLocalDescription(offer))
            .then(() => {
                offerOutput.textContent = JSON.stringify(peer.localDescription);
                copyOfferBtn.style.display = 'inline';
            })
            .catch(err => alert("Error creating offer: " + err));
    }
}

// Start the connection process
function startConnection() {
    if (!myConnectionCode) {
        alert("Please set your connection code first!");
        return;
    }
    const friendCode = friendCodeInput.value.trim();
    if (!friendCode) {
        alert("Please enter your friend's connection code!");
        return;
    }

    isInitiator = myConnectionCode < friendCode;
    roleInfo.textContent = isInitiator 
        ? "You are the initiator. Share your Offer and ICE with your friend."
        : "You are the responder. Wait for your friend's Offer and ICE.";
    initPeerConnection();
    status.textContent = "Waiting for signaling details...";
}

// Complete the connection with friend's offer/answer and ICE
function completeConnection() {
    const friendOffer = friendOfferInput.value.trim();
    const friendIce = friendIceInput.value.trim();

    if (!friendOffer || !friendIce) {
        alert("Please paste both your friend's offer/answer and ICE candidate!");
        return;
    }

    if (!peer) {
        alert("Connection not initialized. Please click 'Connect' again.");
        return;
    }

    if (isInitiator) {
        // Initiator sets the answer from the responder
        if (peer.signalingState !== 'have-local-offer') {
            alert("Invalid state: Expected 'have-local-offer', got " + peer.signalingState);
            return;
        }
        peer.setRemoteDescription(new RTCSessionDescription(JSON.parse(friendOffer)))
            .then(() => peer.addIceCandidate(JSON.parse(friendIce)))
            .catch(err => alert("Error setting answer: " + err));
    } else {
        // Responder sets the offer, creates an answer, and adds ICE
        if (peer.signalingState !== 'stable') {
            alert("Invalid state: Expected 'stable', got " + peer.signalingState);
            return;
        }
        peer.setRemoteDescription(new RTCSessionDescription(JSON.parse(friendOffer)))
            .then(() => peer.createAnswer())
            .then(answer => peer.setLocalDescription(answer))
            .then(() => {
                offerOutput.textContent = JSON.stringify(peer.localDescription);
                copyOfferBtn.style.display = 'inline';
                roleInfo.textContent = "Send this Answer back to your friend.";
            })
            .then(() => peer.addIceCandidate(JSON.parse(friendIce)))
            .catch(err => alert("Error setting offer/answer: " + err));
    }
}

// Copy text to clipboard
function copyText(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text)
        .then(() => alert("Copied to clipboard!"))
        .catch(err => alert("Failed to copy: " + err));
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
        alert("Not connected yet! Finish the connection first.");
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
