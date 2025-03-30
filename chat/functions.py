import requests
from bs4 import BeautifulSoup
import openai
import json
import re
import io
from urllib.parse import urljoin


import firebase_admin
from firebase_admin import credentials, firestore


if not firebase_admin._apps:
    cred = credentials.Certificate("C:/Users/User/Desktop/PROJECT-main/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
db = firestore.client()


from .ka_env import API_KEY  
openai.api_key = API_KEY
client = openai.OpenAI(api_key=openai.api_key)

def extract_full_text(url: str) -> str:
    """
    Loads the page from the given URL and returns all text extracted from its HTML.
    """
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to load URL: {url}. Status code: {response.status_code}")
    soup = BeautifulSoup(response.text, 'html.parser')
    return soup.get_text(separator="\n", strip=True)

def remove_code_fence(text: str) -> str:
    """
    Removes markdown code fences (e.g. ```json ... ```) from the beginning and end of the text.
    """
    text = text.strip()
    if text.startswith("```json"):
        text = text[len("```json"):].lstrip()
    elif text.startswith("```"):
        text = text[len("```"):].lstrip()
    if text.endswith("```"):
        text = text[:-3].rstrip()
    return text

def structure_event_data(text: str) -> dict:
    """
    Sends the provided text to GPT to extract and translate event information into plain English using Latin characters.
    GPT is expected to return a JSON object with exactly these seven fields:
      - title: string (event title)
      - date: string in the format YYYY-MM-DD (e.g. "2025-04-20")
      - time: string in the format HH:MM (24-hour format, e.g. "15:00")
      - location: string (event location in plain English)
      - description: string (event description in English)
      - imageUrl: string (URL of the event image or Base64; if not available, return an empty string)
      - eventUrl: string (original event page URL)
    IMPORTANT: All output must be entirely in plain English using Latin characters.
    If any data for title, date, time, location, or description is missing, return "unknown" for that field;
    for imageUrl, return an empty string; for eventUrl, return "unknown".
    """
    prompt = (
        "Extract the event information from the following text and translate and convert all extracted data into plain English using Latin characters. "
        "Do not include any Russian words or labels in the output. All field names and values must be in English. "
        "Ensure the date is in the format YYYY-MM-DD (e.g. '2025-04-20'), time in the format HH:MM (24-hour, e.g. '15:00'), "
        "and location is a plain English string (e.g. 'Concert Hall of the State Academic Philharmonic named after E. Rakhmadiev, Astana').\n\n"
        "Return a JSON object with exactly these fields:\n"
        "- title: string\n"
        "- date: string in the format YYYY-MM-DD\n"
        "- time: string in the format HH:MM (24-hour)\n"
        "- location: string\n"
        "- description: string\n"
        "- imageUrl: string (if not available, return an empty string)\n"
        "- eventUrl: string (if not available, return 'unknown')\n\n"
        "For example, the output should look like:\n" +
        """{
  "title": "Shamshi Kaldayakov's Song Evening",
  "date": "2025-04-20",
  "time": "15:00",
  "location": "Concert Hall of the State Academic Philharmonic named after E. Rakhmadiev, Astana",
  "description": "We invite you to the song evening of Shamshi Kaldayakov, a distinguished composer, Hero of Labor of Kazakhstan, and King of Kazakh Waltz. If you miss Shamshi's songs, come and see!",
  "imageUrl": "",
  "eventUrl": "unknown"
}""" + "\n\n" +
        "Return only simple string values, with no extra formatting.\n\n"
        "Text:\n" + text
    )
    
    response = client.chat.completions.create(
         model="gpt-4o",
         messages=[
             {
                 "role": "system",
                 "content": (
                     "You are an AI assistant that extracts and translates event information from unstructured text into plain English using Latin characters. "
                     "Return exactly these seven fields: title, date, time, location, description, imageUrl, and eventUrl, each as a simple string. "
                     "If any field (title, date, time, location, description) is missing, return 'unknown'. For imageUrl, return an empty string if not available, and for eventUrl, return 'unknown'."
                 )
             },
             {"role": "user", "content": prompt}
         ]
    )
    
    content = response.choices[0].message.content
    content_clean = remove_code_fence(content)
    try:
         data = json.loads(content_clean)
         for key in ["title", "date", "time", "location", "description", "eventUrl"]:
             if key not in data or not isinstance(data[key], str) or not data[key].strip():
                 data[key] = "unknown"
         if "imageUrl" not in data or not isinstance(data["imageUrl"], str):
             data["imageUrl"] = ""
         return data
    except Exception as e:
         raise Exception(f"Failed to parse GPT response as JSON. Response: {content_clean}")

def create_event(title: str, date: str, time: str, location: str, description: str = "", imageUrl: str = "", eventUrl: str = "") -> str:
    """
    Creates an event using the provided structured data and saves it in Firestore.
    Returns a plain text confirmation message with a source link.
    """
    event_doc = {
        "title": title,
        "date": date,
        "time": time,
        "location": location,
        "description": description,
        "imageUrl": imageUrl,
        "eventUrl": eventUrl,
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    db.collection("events").add(event_doc)
    return (f"Event '{title}' has been created successfully. "
            f"Date: {date}, Time: {time}, Location: {location}. "
            f"Description: {description}. "
            f"Source: {eventUrl}. "
            f"Image URL: {imageUrl}")

def delete_event(event_id: str) -> str:
    """
    Deletes the event with the given ID from Firestore.
    """
    db.collection("events").document(event_id).delete()
    return f"Event with ID {event_id} successfully deleted."

def update_event(event_id: str, field: str, value: str) -> str:
    """
    Updates the specified field of an event (by its ID) in Firestore.
    """
    db.collection("events").document(event_id).update({field: value})
    return f"Event with ID {event_id} updated: field '{field}' is now '{value}'."

def delete_event_by_title(title: str) -> str:
    """
    Deletes an event from Firestore by its exact title.
    """
    query = db.collection("events").where("title", "==", title).stream()
    docs = list(query)
    if not docs:
        return f"No event with title '{title}' was found."
    doc = docs[0]
    db.collection("events").document(doc.id).delete()
    return f"Event '{title}' has been deleted successfully."

def update_event_by_title_multiple(**kwargs) -> str:
    """
    Updates an event identified by its exact title using data extracted from a new event URL.
    Expects that kwargs contains:
      - "oldTitle": the current title of the event to update.
      - "eventUrl": URL of the event page from which to extract updated data.
      - "imageUrl": the new image URL to override the extracted one.
    The function will:
      1. Use extract_full_text() and structure_event_data() on the provided eventUrl.
      2. Override the "imageUrl" field with the provided imageUrl.
      3. Update the Firestore document with all extracted (and overridden) fields.
    In the confirmation message, after the description, the source (eventUrl) is appended.
    """
    if "oldTitle" not in kwargs or "eventUrl" not in kwargs or "imageUrl" not in kwargs:
        return "Error: 'oldTitle', 'eventUrl' and 'imageUrl' are required for updating an event using links."
    old_title = kwargs.pop("oldTitle")
    new_event_url = kwargs.pop("eventUrl")
    new_image_url = kwargs.pop("imageUrl")
    
    try:
        full_text = extract_full_text(new_event_url)
        event_data = structure_event_data(full_text)
    except Exception as e:
        return f"Error extracting event data: {str(e)}"
    
    # Override imageUrl and eventUrl with provided values
    event_data["imageUrl"] = new_image_url
    event_data["eventUrl"] = new_event_url

    query = db.collection("events").where("title", "==", old_title).stream()
    docs = list(query)
    if not docs:
        return f"No event with title '{old_title}' was found."
    doc = docs[0]
    db.collection("events").document(doc.id).update(event_data)
    return (f"Event '{old_title}' has been updated with new data: {event_data}. "
            f"Source: {event_data.get('eventUrl')}.")

def create_event_from_website(url: str) -> str:
    """
    Creates an event by extracting data from the given URL using GPT,
    saves it in Firestore, and returns a plain text confirmation message.
    """
    try:
        full_text = extract_full_text(url)
        event_data = structure_event_data(full_text)
        event_data["eventUrl"] = url  # Use the provided URL as eventUrl
        event_doc = {
            "title": event_data.get("title", "unknown"),
            "date": event_data.get("date", "unknown"),
            "time": event_data.get("time", "unknown"),
            "location": event_data.get("location", "unknown"),
            "description": event_data.get("description", "unknown"),
            "imageUrl": event_data.get("imageUrl", ""),
            "eventUrl": event_data.get("eventUrl", ""),
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        db.collection("events").add(event_doc)
        return (f"Event '{event_data.get('title')}' has been created successfully. "
                f"Date: {event_data.get('date')}, Time: {event_data.get('time')}, Location: {event_data.get('location')}. "
                f"Description: {event_data.get('description')}. "
                f"Source: {event_data.get('eventUrl')}. "
                f"Image URL: {event_data.get('imageUrl')}")
    except Exception as e:
        return f"Error creating event from URL: {str(e)}"

def create_event_from_links(eventUrl: str, imageUrl: str) -> str:
    """
    Creates an event by extracting data from eventUrl, replaces the imageUrl with the provided value,
    saves it in Firestore, and returns a plain text confirmation message.
    """
    try:
        full_text = extract_full_text(eventUrl)
        event_data = structure_event_data(full_text)
        if imageUrl.strip():
            event_data["imageUrl"] = imageUrl.strip()
        event_data["eventUrl"] = eventUrl
        event_doc = {
            "title": event_data.get("title", "unknown"),
            "date": event_data.get("date", "unknown"),
            "time": event_data.get("time", "unknown"),
            "location": event_data.get("location", "unknown"),
            "description": event_data.get("description", "unknown"),
            "imageUrl": event_data.get("imageUrl", ""),
            "eventUrl": event_data.get("eventUrl", ""),
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        db.collection("events").add(event_doc)
        return (f"Event '{event_data.get('title')}' has been created successfully. "
                f"Date: {event_data.get('date')}, Time: {event_data.get('time')}, Location: {event_data.get('location')}. "
                f"Description: {event_data.get('description')}. "
                f"Source: {event_data.get('eventUrl')}. "
                f"Image URL: {event_data.get('imageUrl')}")
    except Exception as e:
        return f"Error creating event from links: {str(e)}"
