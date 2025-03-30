import requests
from bs4 import BeautifulSoup

def get_first_image_url(url: str) -> str:
    """
    Загружает страницу по URL и возвращает значение атрибута 'src' первого найденного тега <img>.
    Если тег <img> не найден, возвращает сообщение об отсутствии изображения.
    """
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Не удалось получить URL: {url}. Код ответа: {response.status_code}")
    
    soup = BeautifulSoup(response.text, 'html.parser')
    img_tag = soup.find('img')
    if img_tag and img_tag.get('src'):
        return img_tag.get('src')
    else:
        return "Изображение не найдено."

if __name__ == "__main__":
    url = input("Введите URL страницы: ").strip()
    try:
        image_url = get_first_image_url(url)
        print("Найденный URL изображения:", image_url)
    except Exception as e:
        print("Ошибка:", e)
