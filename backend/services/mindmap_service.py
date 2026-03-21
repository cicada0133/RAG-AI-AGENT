import json
from langchain_core.prompts import PromptTemplate
from services.llm_provider import get_llm

FALLBACK_MINDMAP = {
    "nodes": [
        {"id": "1", "data": {"label": "Документ", "content": "Основная тема документа"}, "position": {"x": 400, "y": 50}},
        {"id": "2", "data": {"label": "Ключевые темы", "content": "Основные ключевые темы и концепции документа"}, "position": {"x": 200, "y": 200}},
        {"id": "3", "data": {"label": "Анализ", "content": "Анализ содержимого документа"}, "position": {"x": 400, "y": 200}},
        {"id": "4", "data": {"label": "Выводы", "content": "Основные выводы и заключения"}, "position": {"x": 600, "y": 200}},
        {"id": "5", "data": {"label": "Рекомендации", "content": "Практические рекомендации"}, "position": {"x": 300, "y": 350}},
        {"id": "6", "data": {"label": "Риски", "content": "Выявленные риски и проблемы"}, "position": {"x": 500, "y": 350}},
    ],
    "edges": [
        {"id": "e1-2", "source": "1", "target": "2"},
        {"id": "e1-3", "source": "1", "target": "3"},
        {"id": "e1-4", "source": "1", "target": "4"},
        {"id": "e3-5", "source": "3", "target": "5"},
        {"id": "e3-6", "source": "3", "target": "6"},
    ]
}

class MindmapService:
    def __init__(self):
        self.llm = get_llm(temperature=0.1)
        
    def generate_mindmap(self, text: str) -> dict:
        """Generates a React Flow compatible JSON structure for a mindmap with content per node."""
        if not self.llm or not text.strip() or text == "Нет данных для этого документа.":
            return FALLBACK_MINDMAP

        prompt = """Проанализируй текст и извлеки ключевые концепции/разделы. Верни ТОЛЬКО валидный JSON для React Flow.
        Для каждого узла включи поле "content" — краткое описание (2-3 предложения) того, что раскрывается под этим заголовком в тексте.
        
        Формат ответа:
        {{
          "nodes": [
            {{
              "id": "1",
              "data": {{
                "label": "Основная тема",
                "content": "Краткое описание основной темы на основе реального содержания текста."
              }},
              "position": {{"x": 400, "y": 50}}
            }},
            {{
              "id": "2",
              "data": {{
                "label": "Подтема 1",
                "content": "Что рассматривается в этом разделе согласно тексту."
              }},
              "position": {{"x": 200, "y": 200}}
            }}
          ],
          "edges": [
            {{"id": "e1-2", "source": "1", "target": "2"}}
          ]
        }}
        
        Строгие требования:
        - Только JSON без markdown и пояснений
        - 6-10 узлов на основе РЕАЛЬНОГО содержимого текста
        - content: 2-3 предложения, отражающие реальное содержание из текста
        - Весь текст на русском языке
        
        Текст: {text}
        """
        prompt_template = PromptTemplate.from_template(prompt)
        chain = prompt_template | self.llm
        try:
            response = chain.invoke({"text": text[:4000]})
            raw = response.content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            result = json.loads(raw)
            # Ensure all nodes have content field
            for node in result.get("nodes", []):
                if "content" not in node.get("data", {}):
                    node["data"]["content"] = f"Раздел: {node['data'].get('label', '')}"
            return result
        except Exception as e:
            print(f"MindmapService error: {e}")
            return FALLBACK_MINDMAP

mindmap_service = MindmapService()
