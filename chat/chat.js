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

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM fully loaded');

  // Проверяем, имеет ли пользователь права администратора; если нет – перенаправляем на user чат
  await checkAdminAccess();
  // Инициализируем иконку пользователя (или кнопку регистрации)
  await initUserIcon();

  const input = document.getElementById("user-input");
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });

  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }
});

async function checkAdminAccess() {
  // Если текущая страница – admin чат (например, chat.html)
  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage !== "chat.html") return;

  const userId = localStorage.getItem('userId');
  if (!userId) {
    console.log("No userId; redirecting to user chat page");
    window.location.href = "user/chat.html";
    return;
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      window.location.href = "user/chat.html";
      return;
    }

    const userData = doc.data();
    const isAdmin = userData.admin === true;
    localStorage.setItem("userRole", isAdmin ? "admin" : "user");

    if (!isAdmin) {
      alert("⚠ Only admins can access this chat. Redirecting you to user chat.");
      window.location.href = "user/chat.html";
    }
  } catch (error) {
    console.error("Error checking admin role:", error);
    window.location.href = "user/chat.html";
  }
}

async function initUserIcon() {
  const signupBtn = document.getElementById('mainsignup');
  const userId = localStorage.getItem('userId');
  console.log('User logged in:', !!userId);

  if (!signupBtn) return;

  if (userId) {
    try {
      const userRef = db.collection('users').doc(userId);
      const doc = await userRef.get();
      if (doc.exists) {
        const userData = doc.data();
        updateProfileButton(userData);
      } else {
        console.warn('User document not found');
        resetSignupButton();
      }
    } catch (error) {
      console.error("Firestore error:", error);
      resetSignupButton();
    }
  } else {
    console.log('No userId in localStorage');
    resetSignupButton();
  }

  function updateProfileButton(userData) {
    const profileImg = document.createElement('img');
    profileImg.alt = 'Profile Picture';
    profileImg.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      cursor: pointer;
      border: 2px solid #fff;
      background-color: #f0f0f0;
    `;
    const profilePicture = userData.profilePicture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    profileImg.src = `${profilePicture}?${Date.now()}`;

    signupBtn.innerHTML = '';
    signupBtn.appendChild(profileImg);
    // Обновите путь к профилю, если необходимо
    signupBtn.href = '../FindACompany/profile.html';
  }

  function resetSignupButton() {
    signupBtn.innerHTML = '<button>Sign up</button>';
    signupBtn.href = 'signup.html';
  }
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if (!message) return;

  addMessage("user", message);
  input.value = "";

  // Выбираем эндпоинт на основе роли (admin или user)
  const userRole = localStorage.getItem("userRole") || "user";
  const chatEndpoint = userRole.toLowerCase() === "admin"
    ? "http://127.0.0.1:8000/chat"
    : "http://127.0.0.1:8000/user/chat";

  try {
    const response = await fetch(chatEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    addMessage("bot", data.reply);
  } catch (error) {
    console.error("Connection error:", error);
    addMessage("bot", "❌ Server unavailable.");
  }
}

function addMessage(role, text) {
  const box = document.getElementById("chat-box");
  const msg = document.createElement("div");
  // Используем шаблонную строку для класса
  msg.className = `message ${role}`;
  msg.textContent = text;
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
}
