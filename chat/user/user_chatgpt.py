from openai import OpenAI
from .ka_env import API_KEY
client = OpenAI(api_key=API_KEY)

# Схемы функций для пользовательского чата (plain‑text ответы)
function_definitions = [
    {
        "name": "search_events_by_interest",
        "description": "Search for events based on an interest keyword. Returns a plain text summary of matching events.",
        "parameters": {
            "type": "object",
            "properties": {
                "interest": {
                    "type": "string",
                    "description": "Interest keyword to search for in events"
                }
            },
            "required": ["interest"]
        }
    },
    {
        "name": "search_nearest_events",
        "description": "Search for nearest events based on geolocation. Expects latitude, longitude, and radius (in km). Returns a plain text summary of matching events.",
        "parameters": {
            "type": "object",
            "properties": {
                "latitude": {"type": "number", "description": "Your latitude"},
                "longitude": {"type": "number", "description": "Your longitude"},
                "radius": {"type": "number", "description": "Search radius in kilometers"}
            },
            "required": ["latitude", "longitude", "radius"]
        }
    },
    {
        "name": "search_friends_by_name",
        "description": "Search for friends by exact name. Returns a plain text summary of matching users.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name to search for"}
            },
            "required": ["name"]
        }
    },
    {
        "name": "search_friends_by_interests",
        "description": "Search for friends with common interests. Returns a plain text summary of matching users.",
        "parameters": {
            "type": "object",
            "properties": {
                "interest": {"type": "string", "description": "Interest keyword to search in friends' profiles"}
            },
            "required": ["interest"]
        }
    },
    {
        "name": "analyze_statistics",
        "description": (
            "Analyze the user's attended events statistics and return a plain text summary of their interests. "
            "For analyze_statistics, if the user's email is not provided, set the parameter 'email' to 'current_user'."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "email": {
                    "type": "string",
                    "description": "User email for which to analyze statistics. If unknown, use 'current_user'."
                }
            },
            "required": ["email"]
        }
    }
]

async def ask_gpt_user(user_input: str) -> dict:
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are the FindACompany AI assistant for users. "
                        "Help users by classifying their message into one of the following types and returning a function call: "
                        "1) search_events_by_interest: for finding events based on interests or wishes; "
                        "2) search_nearest_events: for finding nearby events using geolocation; "
                        "3) search_friends_by_name: for finding friends by exact name; "
                        "4) search_friends_by_interests: for finding friends with common interests; "
                        "5) analyze_statistics: for analyzing attended events and summarizing user interests. "
                        "Return only one function call with its parameters in JSON format."
                    )
                },
                {"role": "user", "content": user_input}
            ],
            functions=function_definitions,
            function_call="auto"
        )
        message = response.choices[0].message
        print("📨 GPT user message:", message)
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
