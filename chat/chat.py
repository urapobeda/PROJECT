from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

from .chatgpt import ask_gpt
from .functions import (
    create_event, delete_event, update_event,
    delete_event_by_title, update_event_by_title_multiple,
    create_event_from_website, create_event_from_links
)

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
    print(f"\n📥 Received message from client: {req.message}")
    gpt_response = await ask_gpt(req.message)
    print(f"🤖 GPT response: {gpt_response}")

    if "function_call" in gpt_response:
        name = gpt_response["function_call"]["name"]
        args_json = gpt_response["function_call"]["arguments"]
        print(f"⚙️ GPT called function: {name} with arguments: {args_json}")
        try:
            args = json.loads(args_json)
            if name == "create_event":
                result = create_event(**args)
            elif name == "delete_event_by_title":
                result = delete_event_by_title(**args)
            elif name == "update_event_by_title_multiple":
                result = update_event_by_title_multiple(**args)
            elif name == "delete_event":
                result = delete_event(**args)
            elif name == "update_event":
                result = update_event(**args)
            elif name == "create_event_from_link":
                result = create_event_from_website(**args)
            elif name == "create_event_from_links":
                result = create_event_from_links(**args)
            else:
                result = f"⚠️ Unknown function: {name}"
            print(f"✅ Execution result: {result}")
            return {"reply": result}
        except Exception as e:
            print(f"❌ Error executing function {name}: {e}")
            return {"reply": f"Error: {str(e)}"}
    return {"reply": gpt_response["reply"]}
