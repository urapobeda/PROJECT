

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
  
    if (!signupBtn || !createEventButton || !eventGrid || !createEventModal || !createEventForm || !closeModal) {
      console.error("Один или несколько необходимых элементов не найдены в DOM.");
      return;
    }
  
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
      }).catch(error => {
        console.error("Ошибка при загрузке данных пользователя:", error);
      });
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
  
      const name = document.getElementById("eventName").value.trim();
      const description = document.getElementById("eventDescription").value.trim();
      const dateValue = document.getElementById("eventDate").value;
      const location = document.getElementById("eventLocation").value.trim();
      const category = document.getElementById("eventCategory").value.trim();
      const imageFile = document.getElementById("eventImageFile").files[0];
  
      if (!userId) {
        alert("Вы должны быть авторизованы, чтобы создавать ивенты.");
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
          console.error("Ошибка чтения изображения:", err);
          alert("Не удалось прочитать изображение.");
          return;
        }
      }
  
      const newEvent = {
        title: name,
        description,
        date: firebase.firestore.Timestamp.fromDate(new Date(dateValue)),
        location,
        category,
        imageUrl,
        createdBy: userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        participants: [],
        teamMode: false,
        teams: []
      };
  
      try {
        await db.collection("events").add(newEvent);
        alert("Ивент успешно создан!");
        createEventModal.style.display = "none";
        loadEvents();
  
      } catch (error) {
        console.error("Ошибка при создании ивента:", error);
        alert("Ошибка при создании ивента. Попробуйте снова.");
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
  
        snapshot.forEach(doc => {
          const data = doc.data();
          const card = document.createElement("div");
          card.className = "event-card";
  
          card.innerHTML = `
            <img src="${data.imageUrl}" alt="${data.title}" />
            <h3>${data.title}</h3>
            <p>${data.description}</p>
            <button onclick="participateEvent('${doc.id}', '${data.title}')">Participate</button>
          `;
  
          eventGrid.appendChild(card);
        });
      } catch (error) {
        console.error("Ошибка при загрузке ивентов:", error);
      }
    }
  
    loadEvents();
  });
  
  function participateEvent(eventId, eventName) {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Сначала войдите в аккаунт, чтобы участвовать в ивенте.");
      return;
    }
  
    const db = firebase.firestore();
  
    db.collection("events").doc(eventId).update({
      participants: firebase.firestore.FieldValue.arrayUnion(userId)
    });
  
    db.collection("users").doc(userId).update({
      participatedEvents: firebase.firestore.FieldValue.arrayUnion(eventId)
    }).then(() => {
      alert("Вы успешно участвуете в ивенте: " + eventName);
    }).catch(error => {
      console.error("Ошибка при добавлении участия:", error);
      alert("Ошибка при участии в ивенте.");
    });
  }
  