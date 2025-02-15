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

const h1 = document.getElementById('User');
const signout = document.getElementById('signup');

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userEmail = user.email;
        try {
            const userDoc = await db.collection('users').doc(userEmail).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                h1.innerText = "Hello, " + userData.firstname;
                loadParticipatedEvents(userData.participatedEvents || []);
                signout.innerHTML = '<a href="#" id="signout-link">Sign out</a>';
                document.getElementById('signout-link').addEventListener('click', signOutUser);
            } else {
                h1.innerText = "Please sign up";
                signout.innerHTML = '<a href="signup.html">Sign up</a>';
            }
        } catch (error) {
            console.error("Error fetching user data: ", error);
            h1.innerText = "Please sign up";
            signout.innerHTML = '<a href="signup.html">Sign up</a>';
        }
    } else {
        h1.innerText = "Please sign up";
        signout.innerHTML = '<a href="signup.html">Sign up</a>';
    }
});

async function signOutUser() {
    try {
        await auth.signOut();
        h1.innerText = "Please sign up";
        signout.innerHTML = '<a href="signup.html">Sign up</a>';
        location.reload();
    } catch (error) {
        console.error("Error signing out: ", error);
    }
}

function loadParticipatedEvents(participatedEvents) {
    const participatedEventsGrid = document.getElementById('participatedEventsGrid');
    participatedEventsGrid.innerHTML = '';

    if (participatedEvents.length === 0) {
        participatedEventsGrid.innerHTML = "<p>You are not participating in any events yet.</p>";
    } else {
        participatedEvents.forEach(function (eventName, index) {
            const eventCard = document.createElement('div');
            eventCard.classList.add('event-card');
            eventCard.innerHTML = `
                <h3>${eventName}</h3>
                <p>You have shown interest in this event.</p>
                <span class="close" onclick="removeParticipatedEvent('${eventName}')">&times;</span>
            `;
            participatedEventsGrid.appendChild(eventCard);
        });
    }
}

async function removeParticipatedEvent(eventName) {
    const user = auth.currentUser;
    if (user) {
        const userEmail = user.email;
        try {
            const userDoc = await db.collection('users').doc(userEmail).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                let participatedEvents = userData.participatedEvents || [];
                participatedEvents = participatedEvents.filter(event => event !== eventName);
                await db.collection('users').doc(userEmail).update({
                    participatedEvents: participatedEvents
                });
                loadParticipatedEvents(participatedEvents);
            }
        } catch (error) {
            console.error("Error removing event: ", error);
        }
    }
}

window.onload = () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            fetchUserData(user.email);
        } else {
            h1.innerText = "Please sign up";
            signout.innerHTML = '<a href="signup.html">Sign up</a>';
        }
    });
};