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
    await initUserIcon();
  
    const input = document.getElementById("user-input");
    input.addEventListener("keydown", function(event) {
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
          // Сохраняем email в localStorage, если он есть
          if (userData.email) {
            localStorage.setItem("userEmail", userData.email);
          }
        } else {
          resetSignupButton();
        }
      } catch (error) {
        console.error("Firestore error:", error);
        resetSignupButton();
      }
    } else {
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
      // Обновите путь к профилю, если требуется
      signupBtn.href = '../../FindACompany/profile.html';
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
  
    // Получаем email пользователя из localStorage
    const userEmail = localStorage.getItem("userEmail") || "unknown@example.com";
  
    // Для пользователей всегда используем эндпоинт /user/chat
    const chatEndpoint = "http://127.0.0.1:8000/user/chat";
  
    try {
      const response = await fetch(chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email: userEmail })
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
    msg.className = `message ${role}`;
    msg.textContent = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
  }
  