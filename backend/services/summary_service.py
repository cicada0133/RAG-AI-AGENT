from services.llm_provider import get_llm, MockLLM


SUMMARY_TEMPLATE = """Ты — аналитик, составляющий официальные резюме документов.

На основе предоставленного текста составь структурированное резюме на русском языке в следующем формате:

## Краткое резюме
(2-3 предложения о сути документа)

## Ключевые тезисы
(маркированный список из 5-7 самых важных утверждений)

## Основные выводы
(3-5 аналитических вывода на основе содержимого)

## Рекомендации
(2-3 практических рекомендации, если применимо)

Пиши официальным, аналитическим языком. Используй только информацию из предоставленного текста.

Текст документа:
{text}

Резюме:"""


class SummaryService:
    def __init__(self):
        self.llm = get_llm(temperature=0.2) or MockLLM()

    def generate_summary(self, text: str) -> str:
        if not text or text == "Нет данных для этого документа.":
            return "Пожалуйста, загрузите документ для генерации резюме."

        if not self.llm or isinstance(self.llm, MockLLM):
            # Fallback: return first 1000 chars as simple summary
            snippet = text[:1000].strip()
            return f"## Краткое резюме\n\n{snippet}...\n\n*Для полного анализа настройте LLM-модель.*"

        prompt = SUMMARY_TEMPLATE.format(text=text[:4000])
        try:
            response = self.llm.invoke(prompt)
            return response.content
        except Exception as e:
            return f"Ошибка генерации резюме: {str(e)}"


summary_service = SummaryService()
