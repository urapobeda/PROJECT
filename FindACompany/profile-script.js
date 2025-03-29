// profile-script.js

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAiJUeB2i586x5Ys_WjTeDptMHn102Il9k",
    authDomain: "zharim-5eb40.firebaseapp.com",
    projectId: "zharim-5eb40",
    storageBucket: "zharim-5eb40.appspot.com",
    messagingSenderId: "205812595210",
    appId: "1:205812595210:web:c2014dde403d2f8cc83df3"
  };
  
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  const db = firebase.firestore();
  
  window.addEventListener("DOMContentLoaded", async () => {
    const signupBtn = document.getElementById("signup");
    const userId = localStorage.getItem("userId");
  
    if (!userId) {
      document.getElementById("User").innerText = "Please sign in.";
      signupBtn.innerHTML = '<button>Sign in</button>';
      signupBtn.href = 'signup.html';
      return;
    }
  
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        document.getElementById("User").innerText = "User not found.";
        return;
      }
  
      const userData = userDoc.data();
      document.getElementById("User").innerText = `Hello, ${userData.name || "User"}`;
  
      document.getElementById("profileImage").src = userData.profilePicture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
      document.getElementById("profileName").innerText = userData.name || "Anonymous";
      document.getElementById("profileGender").innerText = userData.gender || "Not specified";
      document.getElementById("profileAge").innerText = userData.age || "Not specified";
      document.getElementById("profileEmail").innerText = userData.email || "No email";
      document.getElementById("profileStatus").innerText = userData.admin ? "Admin" : "User";
  
      signupBtn.innerHTML = '<button id="logout-btn">Sign out</button>';
      signupBtn.href = '#';
      document.getElementById("logout-btn").addEventListener("click", () => {
        localStorage.removeItem("userId");
        window.location.reload();
      });
  
      loadParticipatedEvents(userData.participatedEvents || []);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  });
  
  async function loadParticipatedEvents(eventIds) {
    const container = document.getElementById("participatedEventsGrid");
    container.innerHTML = "";
  
    if (eventIds.length === 0) {
      container.innerHTML = "<p>You are not participating in any events yet.</p>";
      return;
    }
  
    const db = firebase.firestore();
  
    for (const eventId of eventIds) {
      try {
        const eventDoc = await db.collection("events").doc(eventId).get();
        if (eventDoc.exists) {
          const data = eventDoc.data();
  
          const card = document.createElement("div");
          card.className = "event-card";
          card.innerHTML = `
            <img src="${data.imageUrl || '#'}" alt="${data.title}" />
            <h3>${data.title}</h3>
            <p>${data.description}</p>
          `;
  
          container.appendChild(card);
        }
      } catch (error) {
        console.error("Error loading event:", error);
      }
    }
  }
  