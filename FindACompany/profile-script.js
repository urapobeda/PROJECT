document.addEventListener("DOMContentLoaded", async () => {
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

    const userId = localStorage.getItem("userId");
    const userIsAdmin = localStorage.getItem("isAdmin") === "true";
    const userNameElem = document.getElementById("User");
    const signoutBtn = document.getElementById("signup");
    const eventGrid = document.getElementById("participatedEventsGrid");

    if (!userId) {
        userNameElem.textContent = "Please sign in";
        signoutBtn.innerHTML = '<a href="signup.html">Sign up</a>';
        return;
    }

    try {
        const doc = await db.collection("users").doc(userId).get();
        if (!doc.exists) {
            userNameElem.textContent = "Please sign in";
            signoutBtn.innerHTML = '<a href="signup.html">Sign up</a>';
            return;
        }

        const data = doc.data();
        userNameElem.textContent = `Hello, ${data.name}`;

        signoutBtn.textContent = "Sign out";
        signoutBtn.addEventListener("click", () => {
            localStorage.removeItem("userId");
            localStorage.removeItem("isAdmin");
            window.location.reload();
        });

        const participated = data.participatedEvents || [];

        if (participated.length === 0) {
            eventGrid.innerHTML = "<p>You are not participating in any events yet.</p>";
        } else {
            const eventsSnapshot = await db.collection("events")
                .where(firebase.firestore.FieldPath.documentId(), "in", participated)
                .get();

            eventsSnapshot.forEach(doc => {
                const e = doc.data();

                const card = document.createElement("div");
                card.className = "event-card";
                card.innerHTML = `
                    <img src="${e.imageUrl}" alt="${e.title}" />
                    <h3>${e.title}</h3>
                    <p>${e.description}</p>
                `;
                eventGrid.appendChild(card);
            });
        }

    } catch (err) {
        console.error("Error fetching profile:", err);
        userNameElem.textContent = "Error loading profile.";
    }
});
