import uuid
import time
from typing import Dict, Any
import fitz  # PyMuPDF
import docx

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.embeddings import Embeddings
from chromadb.utils import embedding_functions
from services.llm_provider import get_llm, MockLLM


class ChromaEmbeddingsAdapter(Embeddings):
    """Adapter to use Chroma's built-in ONNX embedding function (no torch needed)."""
    def __init__(self):
        self._fn = embedding_functions.DefaultEmbeddingFunction()

    def embed_documents(self, texts):
        return self._fn(texts)

    def embed_query(self, text):
        return self._fn([text])[0]


class RAGService:
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        self.embeddings = ChromaEmbeddingsAdapter()
        self.vector_store = Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings
        )
        self.llm = get_llm() or MockLLM()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )

    def process_file(self, file_path: str, filename: str) -> str:
        """Extracts text, chunks it, and adds to vector store."""
        text = ""
        ext = filename.lower().split('.')[-1]

        if ext == "pdf":
            doc = fitz.open(file_path)
            text = "\n".join(page.get_text() for page in doc)
        elif ext in ["doc", "docx"]:
            doc = docx.Document(file_path)
            text = "\n".join(paragraph.text for paragraph in doc.paragraphs)
        elif ext == "txt":
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        doc_id = str(uuid.uuid4())
        docs = self.text_splitter.create_documents(
            texts=[text],
            metadatas=[{"source": filename, "doc_id": doc_id}]
        )

        if docs:
            self.vector_store.add_documents(docs)
            self.vector_store.persist()

        return doc_id

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimate: ~4 chars per token (common heuristic)."""
        return max(1, len(text) // 4)

    def query(self, question: str, doc_id: str = None) -> Dict[str, Any]:
        """Queries the vector store and generates an answer, tracking token usage."""
        search_kwargs = {"k": 4}
        if doc_id:
            search_kwargs["filter"] = {"doc_id": doc_id}

        retriever = self.vector_store.as_retriever(search_kwargs=search_kwargs)
        try:
            docs = retriever.invoke(question)
        except Exception:
            docs = []

        context = "\n\n".join(d.page_content for d in docs)
        sources = list(set(d.metadata["source"] for d in docs))

        prompt = (
            "Ты — AI-ассистент для анализа документов. "
            "ВСЕГДА отвечай на РУССКОМ языке. "
            "Отвечай только на основе предоставленного контекста. "
            "Если ответа нет в контексте — скажи об этом.\n\n"
            f"Контекст:\n{context}"
        )

        t0 = time.monotonic()
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            messages = [
                SystemMessage(content=prompt),
                HumanMessage(content=question),
            ]
            response = self.llm.invoke(messages)
            raw = response.content if hasattr(response, "content") else response
            # Newer LangChain may return list of content blocks or message objects
            if isinstance(raw, list):
                parts = []
                for item in raw:
                    if hasattr(item, "content"):          # AIMessage / BaseMessage
                        parts.append(str(item.content))
                    elif isinstance(item, dict):           # {type: text, text: ...}
                        parts.append(item.get("text", ""))
                    else:
                        parts.append(str(item))
                answer = "".join(parts).strip()
            else:
                answer = str(raw).strip()
            # Safety net
            if not answer or answer.startswith("Ты —") or "additional_kwargs" in answer:
                answer = "Модель не дала ответа. Попробуйте ещё раз."
        except Exception as e:
            answer = f"Ошибка генерации: {str(e)}"
            response = None
        response_time_ms = int((time.monotonic() - t0) * 1000)

        # Extract token usage from API response usage_metadata (OpenAI/Gemini)
        prompt_tokens = None
        completion_tokens = None
        is_estimated = True
        if response is not None:
            usage = getattr(response, "usage_metadata", None)
            if not usage:
                usage = getattr(response, "response_metadata", {}).get("usage", None)
            if usage:
                if isinstance(usage, dict):
                    pt = usage.get("prompt_tokens") or usage.get("input_tokens")
                    ct = usage.get("completion_tokens") or usage.get("output_tokens")
                else:
                    pt = getattr(usage, "input_tokens", None)
                    ct = getattr(usage, "output_tokens", None)
                if pt:
                    prompt_tokens = int(pt)
                    is_estimated = False
                if ct:
                    completion_tokens = int(ct)

        # Fallback: estimate from char count
        if prompt_tokens is None:
            prompt_tokens = self._estimate_tokens(prompt)
        if completion_tokens is None:
            completion_tokens = self._estimate_tokens(answer)

        return {
            "answer": answer,
            "sources": sources,
            "context_snippets": [d.page_content for d in docs],
            "token_usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
                "response_time_ms": response_time_ms,
                "is_estimated": is_estimated,
            }
        }

    def get_document_context(self, doc_id: str) -> str:
        """Retrieves stored context chunks for a document."""
        collection = self.vector_store._collection
        results = collection.get(where={"doc_id": doc_id})
        if results and "documents" in results and results["documents"]:
            return "\n\n".join(results["documents"][:8])
        return "Нет данных для этого документа."

    def get_context(self, doc_id: str, query_hint: str = "") -> str:
        """Alias used by export service."""
        return self.get_document_context(doc_id)


rag_service = RAGService()
