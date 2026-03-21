import json
from services.llm_provider import get_llm, MockLLM


FLASHCARD_TEMPLATE = """Ты — педагог, создающий учебные флеш-карточки.

На основе текста сгенерируй ровно 8 флеш-карточек в формате JSON.
Каждая карточка должна содержать конкретный вопрос и точный ответ из текста.

Верни ТОЛЬКО валидный JSON массив, без markdown, без пояснений:
[
  {{"question": "Вопрос 1?", "answer": "Ответ 1"}},
  {{"question": "Вопрос 2?", "answer": "Ответ 2"}}
]

Текст:
{text}

JSON:"""

FALLBACK_CARDS = [
    {"question": "Что является основной темой документа?", "answer": "Загрузите документ и сгенерируйте карточки для получения ответа."},
    {"question": "Какие ключевые понятия описаны в тексте?", "answer": "Загрузите документ и сгенерируйте карточки для получения ответа."},
]


class FlashcardService:
    def __init__(self):
        self.llm = get_llm(temperature=0.3) or MockLLM()

    def generate_flashcards(self, text: str) -> list:
        if not text or text == "Нет данных для этого документа.":
            return FALLBACK_CARDS

        if not self.llm or isinstance(self.llm, MockLLM):
            return FALLBACK_CARDS

        prompt = FLASHCARD_TEMPLATE.format(text=text[:3500])
        try:
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            # Strip markdown code fences if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.split("```")[0]
            cards = json.loads(content.strip())
            if isinstance(cards, list) and len(cards) > 0:
                return cards
        except Exception:
            pass
        return FALLBACK_CARDS


flashcard_service = FlashcardService()
