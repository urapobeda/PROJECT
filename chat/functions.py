import requests
from bs4 import BeautifulSoup
import openai
import json
import re

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, firestore
from ../ka.env import *

# Инициализация Firebase Admin (укажите правильный путь к serviceAccountKey.json)
if not firebase_admin._apps:
    cred = credentials.Certificate("C:/Users/User/Desktop/PROJECT-main/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
db = firestore.client()     

# Настройка OpenAI
openai.api_key = API_KEY
client = openai.OpenAI(api_key=openai.api_key)

def extract_full_text(url: str) -> str:
    """
    Загружает страницу по URL и возвращает весь текст, извлечённый из HTML.
    """
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Не удалось получить URL: {url}. Код ответа: {response.status_code}")
    soup = BeautifulSoup(response.text, 'html.parser')
    return soup.get_text(separator="\n", strip=True)

def remove_code_fence(text: str) -> str:
    """
    Удаляет markdown-обёртку вида ```json ... ``` из текста, если она есть.
    """
    fence_pattern = r"^```(?:json)?\s*(.*?)\s*```$"
    match = re.search(fence_pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()

def structure_event_data(text: str) -> dict:
    """
    Отправляет полученный текст в GPT для извлечения информации о мероприятии.
    Ожидается, что GPT вернёт JSON с ровно пятью полями:
      - title: строка (название мероприятия)
      - date: строка в формате YYYY-MM-DD
      - time: строка в формате HH:MM (24-часовой формат)
      - location: строка (место проведения)
      - description: строка (описание мероприятия)
    Если данных нет, возвращает "неизвестно" для соответствующего поля.
    """
    prompt = (
        "Извлеки из следующего текста информацию о мероприятии и верни результат в формате JSON с ровно "
        "следующими полями:\n"
        "- title: строка (название мероприятия)\n"
        "- date: строка в формате YYYY-MM-DD\n"
        "- time: строка в формате HH:MM (24-часовой формат)\n"
        "- location: строка (место проведения)\n"
        "- description: строка (описание мероприятия)\n\n"
        "Важно: возвращай только простые строковые значения, никаких объектов или массивов. "
        "Если данных нет, для поля верни 'неизвестно'.\n\n"
        "Текст:\n" + text
    )
    
    response = client.chat.completions.create(
         model="gpt-4-1106-preview",
         messages=[
             {
                 "role": "system",
                 "content": (
                     "Ты — AI-ассистент, который извлекает информацию о мероприятиях из неструктурированного текста. "
                     "Возвращай ровно пять полей: title, date, time, location и description, каждое из которых должно быть строкой. "
                     "Если данных нет, возвращай 'неизвестно'."
                 )
             },
             {"role": "user", "content": prompt}
         ]
    )
    
    content = response.choices[0].message.content
    content_clean = remove_code_fence(content)
    try:
         data = json.loads(content_clean)
         for key in ["title", "date", "time", "location", "description"]:
             if key not in data or not isinstance(data[key], str) or not data[key].strip():
                 data[key] = "неизвестно"
         return data
    except Exception as e:
         raise Exception(f"Не удалось распарсить ответ GPT как JSON. Ответ: {content_clean}")

def create_event_from_website(url: str) -> str:
    try:
        full_text = extract_full_text(url)
        event_data = structure_event_data(full_text)
        # Формируем документ для Firestore
        event_doc = {
            "title": event_data.get("title", "неизвестно"),
            "date": event_data.get("date", "неизвестно"),
            "time": event_data.get("time", "неизвестно"),
            "location": event_data.get("location", "неизвестно"),
            "description": event_data.get("description", "неизвестно"),
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        db.collection("events").add(event_doc)
        # Формируем HTML для отображения (это для ответа чатбота)
        html_snippet = f"""
        <div class="event-card">
            <h2>{event_data.get('title')}</h2>
            <p><strong>Дата:</strong> {event_data.get('date')}</p>
            <p><strong>Время:</strong> {event_data.get('time')}</p>
            <p><strong>Место:</strong> {event_data.get('location')}</p>
            <p>{event_data.get('description')}</p>
        </div>
        """
        return html_snippet.strip()
    except Exception as e:
        return f"<p>❌ Ошибка при создании мероприятия из ссылки: {str(e)}</p>"


def create_event(title: str, date: str, time: str, location: str, description: str = "", imageUrl: str = "") -> str:
    event_doc = {
        "title": title,
        "date": date,
        "time": time,
        "location": location,
        "description": description,
        "imageUrl": imageUrl,
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    db.collection("events").add(event_doc)
    # Формируем HTML-карточку (необязательно, если выводите данные через events.js)
    html_snippet = f"""
    <div class="event-card">
        {f'<img src="{imageUrl}" alt="{title}" />' if imageUrl else ""}
        <h2>{title}</h2>
        <p><strong>Дата:</strong> {date}</p>
        <p><strong>Время:</strong> {time}</p>
        <p><strong>Место:</strong> {location}</p>
        <p>{description}</p>
    </div>
    """
    return html_snippet.strip()



def delete_event(event_id: str) -> str:
    """
    Удаляет мероприятие с заданным ID из Firestore.
    """
    db.collection("events").document(event_id).delete()
    return f"<p>🗑️ Мероприятие с ID {event_id} успешно удалено</p>"

def update_event(event_id: str, field: str, value: str) -> str:
    """
    Обновляет указанное поле мероприятия в Firestore.
    """
    db.collection("events").document(event_id).update({field: value})
    return f"<p>✏️ Поле «{field}» мероприятия с ID {event_id} обновлено на «{value}»</p>"
  