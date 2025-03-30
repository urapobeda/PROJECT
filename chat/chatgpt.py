from openai import OpenAI
from .ka_env import API_KEY  
client = OpenAI(api_key=API_KEY)

# Function schema for GPT (admin functions)
function_definitions = [
    {
        "name": "create_event",
        "description": "Create an event from structured data. Include imageUrl if available.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "date": {"type": "string"},
                "time": {"type": "string"},
                "location": {"type": "string"},
                "description": {"type": "string", "description": "Event description (optional)"},
                "imageUrl": {"type": "string", "description": "URL of the event image (optional, can be Base64)"}
            },
            "required": ["title", "date", "time", "location"]
        }
    },
    {
        "name": "delete_event_by_title",
        "description": "Delete an event by its exact title.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Exact title of the event to delete"}
            },
            "required": ["title"]
        }
    },
    {
        "name": "update_event_by_title_multiple",
        "description": "Update an event by its exact title using two links. Provide parameters: 'oldTitle' (current title), 'eventUrl' (new event page URL) and 'imageUrl' (new image URL). The function will extract updated data from eventUrl, override imageUrl, and update all fields.",
        "parameters": {
            "type": "object",
            "properties": {
                "oldTitle": {"type": "string", "description": "Exact current title of the event to update"},
                "eventUrl": {"type": "string", "description": "URL of the event page to extract updated data"},
                "imageUrl": {"type": "string", "description": "Direct URL for the updated event image"}
            },
            "required": ["oldTitle", "eventUrl", "imageUrl"]
        }
    },
    {
        "name": "delete_event",
        "description": "Delete an event by its ID.",
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
        "description": "Update event data by its ID.",
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
        "description": "Create an event by extracting information from an event page URL.",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL of the event page"}
            },
            "required": ["url"]
        }
    },
    {
        "name": "create_event_from_links",
        "description": "Create an event by extracting information from an event page URL and using a provided image URL.",
        "parameters": {
            "type": "object",
            "properties": {
                "eventUrl": {"type": "string", "description": "URL of the event page"},
                "imageUrl": {"type": "string", "description": "Direct URL of the event image (optional, can be Base64)"}
            },
            "required": ["eventUrl", "imageUrl"]
        }
    }
]

async def ask_gpt(user_input: str) -> dict:
    try:
        response = client.chat.completions.create(
            model="gpt-4o", 
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are the FindACompany AI assistant for administrators. "
                        "When you receive unstructured text, a URL with event information, or two URLs (one for the event page and one for the event image), "
                        "return a function call. If a single URL is provided, return a call to create_event_from_link; "
                        "if two URLs are provided, return a call to create_event_from_links. "
                        "If structured data is provided, return a call to create_event with parameters: title, date, time, location, description, and imageUrl (optional). "
                        "Additionally, you can delete or update events by their exact title by calling delete_event_by_title or update_event_by_title_multiple. "
                        "For update_event_by_title_multiple, return a JSON object with 'oldTitle', 'eventUrl', and 'imageUrl'. "
                        "Reply only with the function call."
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
