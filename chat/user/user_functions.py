import firebase_admin
from firebase_admin import credentials, firestore
import math

# Инициализация Firebase (если ещё не инициализировано)
if not firebase_admin._apps:
    cred = credentials.Certificate("C:/Users/Honor/PROJECT/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
db = firestore.client()

def search_events_by_interest(interest: str) -> str:
    """
    Ищет события по ключевому слову в названии или описании.
    Возвращает результат в виде plain‑text.
    """
    events_ref = db.collection("events")
    events = events_ref.get()
    matching_events = []
    interest_lower = interest.lower()
    for event in events:
        data = event.to_dict()
        combined_text = f"{data.get('title', '')} {data.get('description', '')}".lower()
        if interest_lower in combined_text:
            matching_events.append(data)
    if not matching_events:
        return "No events found matching your interest."
    lines = []
    for ev in matching_events:
        lines.append(f"Title: {ev.get('title', 'unknown')}")
        lines.append(f"Date: {ev.get('date', 'unknown')}")
        lines.append(f"Time: {ev.get('time', 'unknown')}")
        lines.append(f"Location: {ev.get('location', 'unknown')}")
        lines.append(f"Description: {ev.get('description', 'unknown')}")
        lines.append(f"Source: {ev.get('eventUrl', 'unknown')}")
        lines.append(f"Image URL: {ev.get('imageUrl', '')}")
        lines.append("-" * 40)
    return "\n".join(lines)

def search_nearest_events(latitude: float, longitude: float, radius: float) -> str:
    """
    Ищет ближайшие события по геолокации.
    Возвращает результат в виде plain‑text.
    """
    events_ref = db.collection("events")
    events = events_ref.get()
    matching_events = []
    
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371  # Радиус Земли в км
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    for event in events:
        data = event.to_dict()
        try:
            ev_lat = float(data.get("latitude", 0))
            ev_lon = float(data.get("longitude", 0))
            distance = haversine(latitude, longitude, ev_lat, ev_lon)
            if distance <= radius:
                data["distance"] = round(distance, 2)
                matching_events.append(data)
        except Exception:
            continue

    if not matching_events:
        return "No nearby events found."
    
    matching_events.sort(key=lambda ev: ev.get("distance", 9999))
    lines = []
    for ev in matching_events:
        lines.append(f"Title: {ev.get('title', 'unknown')}")
        lines.append(f"Date: {ev.get('date', 'unknown')}")
        lines.append(f"Time: {ev.get('time', 'unknown')}")
        lines.append(f"Location: {ev.get('location', 'unknown')}")
        lines.append(f"Description: {ev.get('description', 'unknown')}")
        lines.append(f"Distance: {ev.get('distance')} km")
        lines.append(f"Source: {ev.get('eventUrl', 'unknown')}")
        lines.append(f"Image URL: {ev.get('imageUrl', '')}")
        lines.append("-" * 40)
    return "\n".join(lines)

def search_friends_by_name(name: str) -> str:
    """
    Ищет пользователей по точному совпадению имени.
    Возвращает результат в виде plain‑text.
    """
    users_ref = db.collection("users")
    query = users_ref.where("name", "==", name).stream()
    matching_users = [user.to_dict() for user in query]
    if not matching_users:
        return "No users found with that name."
    lines = []
    for user in matching_users:
        lines.append(f"Name: {user.get('name', 'unknown')}")
        lines.append(f"Email: {user.get('email', 'unknown')}")
        lines.append("-" * 30)
    return "\n".join(lines)

def search_friends_by_interests(interest: str) -> str:
    """
    Ищет пользователей с общими интересами.
    Возвращает результат в виде plain‑text.
    """
    users_ref = db.collection("users")
    users = users_ref.get()
    matching_users = []
    interest_lower = interest.lower()
    for user in users:
        data = user.to_dict()
        interests = data.get("interests", [])
        if isinstance(interests, list):
            if any(interest_lower in str(item).lower() for item in interests):
                matching_users.append(data)
    if not matching_users:
        return "No friends found matching that interest."
    lines = []
    for user in matching_users:
        interests_str = ", ".join(user.get("interests", []))
        lines.append(f"Name: {user.get('name', 'unknown')}")
        lines.append(f"Email: {user.get('email', 'unknown')}")
        lines.append(f"Interests: {interests_str}")
        lines.append("-" * 30)
    return "\n".join(lines)

def analyze_statistics(email: str) -> str:
    """
    Анализирует статистику посещённых событий пользователя (по email) и возвращает plain‑text вывод.
    """
    try:
        # Поиск пользователя по email
        query = db.collection("users").where("email", "==", email).stream()
        docs = list(query)
        if not docs:
            return f"User with email '{email}' not found."
        user_doc = docs[0]
        user_data = user_doc.to_dict()
        participated = user_data.get("participatedEvents", [])
        if not participated:
            return "No events attended."
        
        word_counts = {}
        for event_id in participated:
            ev_doc = db.collection("events").document(event_id).get()
            if ev_doc.exists:
                ev_data = ev_doc.to_dict()
                text = f"{ev_data.get('title', '')} {ev_data.get('description', '')}".lower()
                for word in text.split():
                    word = word.strip(".,!?")
                    if len(word) > 3:
                        word_counts[word] = word_counts.get(word, 0) + 1
        if not word_counts:
            return "Not enough data to analyze statistics."
        
        top_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        top_keywords = ", ".join(word for word, count in top_words)
        return f"User statistics: Based on your attended events, your interests seem to include: {top_keywords}."
    except Exception as e:
        return f"Error analyzing statistics: {str(e)}"
