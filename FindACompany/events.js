
const firebaseConfig = {
    apiKey: "AIzaSyAiJUeB2i586x5Ys_WjTeDptMHn102Il9k",
    authDomain: "zharim-5eb40.firebaseapp.com",
    projectId: "zharim-5eb40",
    storageBucket: "zharim-5eb40.firebasestorage.app",
    messagingSenderId: "205812595210",
    appId: "1:205812595210:web:c2014dde403d2f8cc83df3"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


window.onload = async function () {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            const btn = document.getElementById('signup');
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z"/></svg>';
            btn.setAttribute('href', 'profile.html');

           
            await loadEvents();
        } else {
            console.log("User is not signed in.");
        }
    });
};


async function loadEvents() {
    const eventGrid = document.getElementById('eventGrid');
    eventGrid.innerHTML = ''; 

    const eventsSnapshot = await db.collection('events').get();
    eventsSnapshot.forEach(doc => {
        const event = doc.data();
        const newEventCard = document.createElement('div');
        newEventCard.classList.add('event-card');

        newEventCard.innerHTML = `
            <img src="${event.imageUrl}" alt="${event.name}">
            <h3>${event.name}</h3>
            <p>${event.description}</p>
            <button class="participate-btn" onclick="participateEvent('${doc.id}')">Participate</button>
        `;

        eventGrid.appendChild(newEventCard);
    });
}


function searchCompany() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let eventCards = document.querySelectorAll('.event-card');

    eventCards.forEach(function (card) {
        let cardText = card.querySelector('h3').textContent.toLowerCase() + " " + card.querySelector('p').textContent.toLowerCase();
        if (cardText.includes(input)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

document.getElementById('searchInput').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        searchCompany();
    }
});

async function participateEvent(eventId) {
    const user = firebase.auth().currentUser;
    if (user) {
        const userEmail = user.email;
        const eventRef = db.collection('events').doc(eventId);

     
        const eventDoc = await eventRef.get();
        const participants = eventDoc.data().participants || [];

        if (!participants.includes(userEmail)) {
            participants.push(userEmail);
            await eventRef.update({ participants });
            alert("You successfully attended the event!");
        } else {
            alert("You are already taking part in this event!");
        }
    } else {
        alert("Please sign in to participate.");
    }
}


function openCreateEventModal() {
    document.getElementById('createEventModal').style.display = 'block';
}

function closeCreateEventModal() {
    document.getElementById('createEventModal').style.display = 'none';
}

async function submitNewEvent() {
    const eventName = document.getElementById('eventName').value;
    const eventDescription = document.getElementById('eventDescription').value;
    const eventImageUrl = document.getElementById('eventImageUrl').value || 'https://via.placeholder.com/300x200?text=New+Event';

    await db.collection('events').add({
        name: eventName,
        description: eventDescription,
        imageUrl: eventImageUrl,
        participants: []
    });

    document.getElementById('createEventForm').reset();
    closeCreateEventModal();
    await loadEvents(); 
}