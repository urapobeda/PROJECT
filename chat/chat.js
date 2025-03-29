async function sendMessage() {
    const input = document.getElementById("user-input");
    const message = input.value.trim();
    if (!message) return;
  
    addMessage("user", message);
    input.value = "";
  
    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
  
      const data = await response.json();
      addMessage("bot", data.reply);
    } catch (error) {
      console.error("❌ Ошибка соединения:", error);
      addMessage("bot", "❌ Сервер недоступен.");
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
  