// Updated events.js with error fixes and safeguards

document.addEventListener("DOMContentLoaded", () => {
  const firebaseConfig = {
    apiKey: "AIzaSyAiJUeB2i586x5Ys_WjTeDptMHn102Il9k",
    authDomain: "zharim-5eb40.firebaseapp.com",
    projectId: "zharim-5eb40",
    storageBucket: "zharim-5eb40.appspot.com",
    messagingSenderId: "205812595210",
    appId: "1:205812595210:web:c2014dde403d2f8cc83df3"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  const userId = localStorage.getItem("userId");
  const signupBtn = document.getElementById("signup");
  const createEventButton = document.getElementById("createEventButton");
  const eventGrid = document.getElementById("eventGrid");
  const createEventModal = document.getElementById("createEventModal");
  const createEventForm = document.getElementById("createEventForm");
  const closeModal = document.querySelector(".modal .close");
  const eventDetailModal = document.getElementById("eventDetailModal");
  const eventDetailContent = document.getElementById("eventDetailContent");

  if (!signupBtn || !createEventButton || !eventGrid || !createEventModal || !createEventForm || !closeModal) {
    console.error("Missing elements in DOM");
    return;
  }

  window.closeCreateEventModal = function() {
    createEventModal.style.display = "none";
  };

  if (userId) {
    db.collection("users").doc(userId).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        const profileImg = document.createElement("img");
        profileImg.src = data.profilePicture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        profileImg.style = 'width: 40px; height: 40px; border-radius: 50%; object-fit: cover;';
        profileImg.title = data.name;
        signupBtn.innerHTML = '';
        signupBtn.appendChild(profileImg);
        signupBtn.href = 'profile.html';
      }
    }).catch(error => console.error("Error loading user data:", error));
  }

  createEventButton.addEventListener("click", () => {
    createEventModal.style.display = "block";
    createEventForm.reset();
  });

  closeModal.addEventListener("click", () => {
    createEventModal.style.display = "none";
  });

  createEventForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameEl = document.getElementById("eventName");
    const descriptionEl = document.getElementById("eventDescription");
    const dateEl = document.getElementById("eventDate");
    const locationEl = document.getElementById("eventLocation");
    const categoryEl = document.getElementById("eventCategory");
    const urlLinkEl = document.getElementById("eventUrlLink");
    const imageFileEl = document.getElementById("eventImageFile");

    if (!nameEl || !descriptionEl || !dateEl || !locationEl || !categoryEl || !urlLinkEl || !imageFileEl) {
      console.error("Some input elements are missing");
      return;
    }

    const name = nameEl.value.trim();
    const description = descriptionEl.value.trim();
    const dateValue = dateEl.value;
    const location = locationEl.value.trim();
    const category = categoryEl.value.trim();
    const urlLink = urlLinkEl.value.trim();
    const imageFile = imageFileEl.files[0];

    if (!userId) {
      alert("Please log in to create events.");
      return;
    }

    let imageUrl = null;
    if (imageFile) {
      try {
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      } catch (err) {
        console.error("Image reading error:", err);
        alert("Image reading failed.");
        return;
      }
    }

    const newEvent = {
      title: name,
      description,
      date: firebase.firestore.Timestamp.fromDate(new Date(dateValue)),
      location,
      category,
      urlLink,
      imageUrl,
      createdBy: userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      participants: [],
      teamMode: false,
      teams: []
    };

    try {
      await db.collection("events").add(newEvent);
      alert("Event created successfully!");
      createEventModal.style.display = "none";
      loadEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Event creation failed. Try again.");
    }
  });

  async function loadEvents() {
    eventGrid.innerHTML = "";

    try {
      const snapshot = await db.collection("events").orderBy("createdAt", "desc").get();
      if (snapshot.empty) {
        eventGrid.innerHTML = "<p>No events available.</p>";
        return;
      }

      let participatedEventIds = [];
      if (userId) {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
          participatedEventIds = userDoc.data().participatedEvents || [];
        }
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        const eventId = doc.id;
        const isParticipated = participatedEventIds.includes(eventId);

        const card = document.createElement("div");
        card.className = "event-card";

        const buttonHTML = isParticipated
          ? `<button disabled class="already-participated-btn">Already Participated</button>`
          : `<button class="participate-btn" data-id="${eventId}">Participate</button>`;

        card.innerHTML = `
          <img src="${data.imageUrl}" alt="${data.title}" />
          <h3>${data.title}</h3>
          <p>${data.description}</p>
          ${buttonHTML}
        `;

        eventGrid.appendChild(card);
      });

      document.querySelectorAll(".participate-btn").forEach(button => {
        button.addEventListener("click", async (e) => {
          const eventId = e.target.getAttribute("data-id");
          const eventDoc = await db.collection("events").doc(eventId).get();
          const eventData = eventDoc.data();

          const eventDateStr = eventData.date?.toDate ? eventData.date.toDate().toLocaleString() : new Date(eventData.date).toLocaleString();

          eventDetailContent.innerHTML = `
            <div class="modal-body">
              <img src="${eventData.imageUrl}" alt="${eventData.title}" class="modal-img" />
              <div class="modal-info">
                <h3>${eventData.title}</h3>
                <p>${eventData.description}</p>
                <p><strong>Date:</strong> ${eventDateStr}</p>
                <p><strong>Location:</strong> ${eventData.location}</p>
                <p><strong>Category:</strong> ${eventData.category}</p>
                ${eventData.urlLink ? `<a href="${eventData.urlLink}" target="_blank">Official Registration</a>` : ""}
                <div class="modal-actions">
                  <button id="cancelPopup">Cancel</button>
                  <button id="registerNow">Register</button>
                </div>
              </div>
            </div>
          `;

          document.getElementById("cancelPopup").addEventListener("click", () => {
            eventDetailModal.style.display = "none";
          });

          document.getElementById("registerNow").addEventListener("click", async () => {
            await db.collection("events").doc(eventId).update({
              participants: firebase.firestore.FieldValue.arrayUnion(userId)
            });

            await db.collection("users").doc(userId).update({
              participatedEvents: firebase.firestore.FieldValue.arrayUnion(eventId)
            });

            alert("You are registered for the event!");
            eventDetailModal.style.display = "none";
            loadEvents();
          });

          eventDetailModal.style.display = "block";
        });
      });

    } catch (error) {
      console.error("Error loading events:", error);
    }
  }

  loadEvents();
});
