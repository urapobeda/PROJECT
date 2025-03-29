from openai import OpenAI

client = OpenAI(api_key="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")  # ← Замените на ваш API-ключ

# Описание функций для вызова GPT (админские функции)
function_definitions = [
    {
        "name": "create_event",
        "description": "Создать мероприятие на основе структурированных данных.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "date": {"type": "string"},
                "time": {"type": "string"},
                "location": {"type": "string"},
                "description": {
                    "type": "string",
                    "description": "Дополнительное описание мероприятия (необязательно)"
                }
            },
            "required": ["title", "date", "time", "location"]
        }
    },
    {
        "name": "delete_event",
        "description": "Удалить мероприятие по ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "event_id": {"type": "string"}
            },
            "required": ["event_id"]
        }
    },
    {
        "name": "update_event",
        "description": "Обновить данные мероприятия.",
        "parameters": {
            "type": "object",
            "properties": {
                "event_id": {"type": "string"},
                "field": {"type": "string"},
                "value": {"type": "string"}
            },
            "required": ["event_id", "field", "value"]
        }
    },
    {
        "name": "create_event_from_link",
        "description": "Создать мероприятие, извлекая информацию из ссылки на страницу мероприятия.",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "URL страницы с информацией об ивенте"
                }
            },
            "required": ["url"]
        }
    }
]

async def ask_gpt(user_input: str) -> dict:
    try:
        response = client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Ты — AI-ассистент FindACompany для администраторов. "
                        "Если тебе передается неструктурированный текст или ссылка с информацией об ивенте, "
                        "твой ответ должен быть вызовом функции. Если это ссылка, верни вызов create_event_from_link с параметром url. "
                        "Если это обычный текст с данными, верни вызов create_event с параметрами: title, date, time, location и description. "
                        "Не отвечай текстом, а возвращай только вызов функции."
                    )
                },
                {"role": "user", "content": user_input}
            ],
            functions=function_definitions,
            function_call="auto"
        )

        message = response.choices[0].message
        print("📨 GPT message:", message)

        if message.function_call:
            return {
                "function_call": {
                    "name": message.function_call.name,
                    "arguments": message.function_call.arguments
                }
            }
        return {"reply": message.content}

    except Exception as e:
        print(f"❌ GPT API error: {e}")
        return {"reply": f"GPT Error: {str(e)}"}
