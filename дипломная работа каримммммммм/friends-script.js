const firebaseConfig = {
    apiKey: "AIzaSyAiJUeB2i586x5Ys_WjTeDptMHn102Il9k",
    authDomain: "zharim-5eb40.firebaseapp.com",
    projectId: "zharim-5eb40",
    storageBucket: "zharim-5eb40.firebasestorage.app",
    messagingSenderId: "205812595210",
    appId: "1:205812595210:web:c2014dde403d2f8cc83df3"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

const btn = document.getElementById('signup');

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userEmail = user.email;
        try {
            const userDoc = await db.collection('users').doc(userEmail).get();
            if (userDoc.exists) {
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z"/></svg>';
                btn.setAttribute('href', 'profile.html');
            }
        } catch (error) {
            console.error("Error fetching user data: ", error);
        }
    }
});

function openAddFriendModal() {
    const user = auth.currentUser;
    if (user) {
        document.getElementById('addFriendModal').style.display = 'block';
    } else {
        alert("Please sign in");
    }
}

function closeAddFriendModal() {
    document.getElementById('addFriendModal').style.display = 'none';
}

async function addFriend() {
    const user = auth.currentUser;
    if (user) {
        const userEmail = user.email;
        let friendName = document.getElementById('newFriendName').value;
        let friendStatus = document.getElementById('newFriendStatus').value;
        let friendImageUrl = document.getElementById('newFriendImageUrl').value || 'https://via.placeholder.com/150?text=New+Friend';

        if (friendName.trim() === "") {
            alert("Please enter the name.");
            return;
        }

        try {
            const userDoc = await db.collection('users').doc(userEmail).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const friends = userData.friends || [];

                friends.push({
                    name: friendName,
                    status: friendStatus,
                    imageUrl: friendImageUrl
                });

                await db.collection('users').doc(userEmail).update({
                    friends: friends
                });

                loadFriends();
                document.getElementById('addFriendForm').reset();
                closeAddFriendModal();
            }
        } catch (error) {
            console.error("Error adding friend: ", error);
        }
    }
}

async function loadFriends() {
    const user = auth.currentUser;
    if (user) {
        const userEmail = user.email;
        try {
            const userDoc = await db.collection('users').doc(userEmail).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const friends = userData.friends || [];
                const friendsGrid = document.getElementById('friendsGrid');
                friendsGrid.innerHTML = '';

                friends.forEach((friend, index) => {
                    const friendId = 'friend-' + friend.name.toLowerCase().replace(/\s+/g, '-');
                    const newFriendCard = document.createElement('div');
                    newFriendCard.classList.add('friend-card');
                    newFriendCard.id = friendId;
                    newFriendCard.innerHTML = `
                        <img src="${friend.imageUrl}" alt="${friend.name}'s Profile">
                        <h3>${friend.name}</h3>
                        <p>Status: ${friend.status}</p>
                        <button class="message-btn" onclick="openMessageModal('${friend.name}')">Message</button>
                        <button class="remove-btn" onclick="removeFriend('${friendId}', '${friend.name}')">Remove Friend</button>
                    `;
                    friendsGrid.appendChild(newFriendCard);
                });
            }
        } catch (error) {
            console.error("Error loading friends: ", error);
        }
    }
}

async function removeFriend(friendId, friendName) {
    const user = auth.currentUser;
    if (user) {
        const userEmail = user.email;
        if (confirm('Do you really want to delete this friend?')) {
            try {
                const userDoc = await db.collection('users').doc(userEmail).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const friends = userData.friends || [];
                    const updatedFriends = friends.filter(friend => friend.name !== friendName);

                    await db.collection('users').doc(userEmail).update({
                        friends: updatedFriends
                    });

                    loadFriends();
                }
            } catch (error) {
                console.error("Error removing friend: ", error);
            }
        }
    }
}

function openMessageModal(friendName) {
    document.getElementById('friendName').textContent = friendName;
    document.getElementById('messageModal').style.display = 'block';
}

function closeMessageModal() {
    document.getElementById('messageModal').style.display = 'none';
    document.getElementById('messageContent').value = '';
}

function sendMessage() {
    const messageContent = document.getElementById('messageContent').value;
    const friendName = document.getElementById('friendName').textContent;

    if (messageContent.trim() !== '') {
        alert(`Message sent to ${friendName}: "${messageContent}"`);
        closeMessageModal();
    } else {
        alert('Please type a message before sending.');
    }
}

window.onload = () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            loadFriends();
        }
    });
};