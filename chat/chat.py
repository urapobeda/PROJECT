from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

from .chatgpt import ask_gpt
from .functions import create_event, delete_event, update_event, create_event_from_website

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    print(f"\n📥 Получено сообщение от клиента: {req.message}")
    gpt_response = await ask_gpt(req.message)
    print(f"🤖 Ответ от GPT: {gpt_response}")

    if "function_call" in gpt_response:
        name = gpt_response["function_call"]["name"]
        args_json = gpt_response["function_call"]["arguments"]
        print(f"⚙️ GPT вызвал функцию: {name} с аргументами: {args_json}")

        try:
            args = json.loads(args_json)
            if name == "create_event":
                result = create_event(**args)
            elif name == "delete_event":
                result = delete_event(**args)
            elif name == "update_event":
                result = update_event(**args)
            elif name == "create_event_from_link":
                result = create_event_from_website(**args)
            else:
                result = f"⚠️ Неизвестная функция: {name}"
            print(f"✅ Результат выполнения: {result}")
            return {"reply": result}
        except Exception as e:
            print(f"❌ Ошибка при выполнении функции {name}: {e}")
            return {"reply": f"Ошибка: {str(e)}"}
    return {"reply": gpt_response["reply"]}
