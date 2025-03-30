from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import firebase_admin
from firebase_admin import firestore

from .user_chatgpt import ask_gpt_user
from .user_functions import (
    search_events_by_interest,
    search_nearest_events,
    search_friends_by_name,
    search_friends_by_interests,
    analyze_statistics
)

# Используем тот же Firestore, что и в user_functions.py
db = firestore.client()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Модель запроса теперь включает оба поля: userId и email (оба необязательны)
class ChatRequest(BaseModel):
    message: str
    userId: str = None
    email: str = None

@app.post("/user/chat")
async def user_chat_endpoint(req: ChatRequest):
    print(f"\n📥 Received user message: {req.message}")

    # Попытка извлечь email пользователя из Firestore
    user_email = ""
    if req.userId:
        try:
            user_doc = db.collection("users").document(req.userId).get()
            if user_doc.exists:
                user_email = user_doc.to_dict().get("email", "")
            else:
                return {"reply": "User not found."}
        except Exception as e:
            return {"reply": f"Error fetching user info by userId: {str(e)}"}
    elif req.email:
        try:
            # Если userId не передан, ищем пользователя по email
            query = db.collection("users").where("email", "==", req.email).stream()
            docs = list(query)
            if docs:
                user_email = docs[0].to_dict().get("email", "")
            else:
                return {"reply": f"User with email '{req.email}' not found."}
        except Exception as e:
            return {"reply": f"Error fetching user info by email: {str(e)}"}
    else:
        return {"reply": "User ID or email is required."}

    # Отправляем сообщение в GPT для пользователей
    gpt_response = await ask_gpt_user(req.message)
    print(f"🤖 GPT user response: {gpt_response}")

    if "function_call" in gpt_response:
        name = gpt_response["function_call"]["name"]
        args_json = gpt_response["function_call"]["arguments"]
        print(f"⚙️ GPT user called function: {name} with arguments: {args_json}")
        try:
            args = json.loads(args_json)
            result = ""
            if name == "search_events_by_interest":
                result = search_events_by_interest(args.get("interest", ""))
            elif name == "search_nearest_events":
                result = search_nearest_events(
                    args.get("latitude", 0),
                    args.get("longitude", 0),
                    args.get("radius", 0)
                )
            elif name == "search_friends_by_name":
                result = search_friends_by_name(args.get("name", ""))
            elif name == "search_friends_by_interests":
                result = search_friends_by_interests(args.get("interest", ""))
            elif name == "analyze_statistics":
                # Если GPT возвращает "current_user" или пустой email, заменяем его на фактический email
                email_param = args.get("email", "").lower()
                if email_param == "current_user" or not email_param:
                    email_param = user_email if user_email else "unknown@example.com"
                result = analyze_statistics(email_param)
            else:
                result = f"⚠️ Unknown function: {name}"
            print(f"✅ User execution result: {result}")
            return {"reply": result}
        except Exception as error:
            print(f"❌ Error executing user function {name}: {error}")
            return {"reply": f"Error: {error}"}
    return {"reply": gpt_response.get("reply", "No function call returned.")}
