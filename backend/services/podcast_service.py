import asyncio
import os
import uuid
import edge_tts
from typing import Dict
from services.llm_provider import get_llm

AVAILABLE_VOICES = {
    "ru-RU-DmitryNeural": "Дмитрий (муж., нейтральный)",
    "ru-RU-SvetlanaNeural": "Светлана (жен., нейтральная)",
    "ru-RU-DariyaNeural": "Дарья (жен., тёплая)",
    "ru-RU-AnatolyNeural": "Анатолий (муж., авторитетный)",
    "en-US-GuyNeural": "Guy (англ., муж.)",
    "en-US-JennyNeural": "Jenny (англ., жен.)",
    "en-GB-RyanNeural": "Ryan (брит., муж.)",
}

class PodcastService:
    def __init__(self):
        self.llm = get_llm(temperature=0.8)
        self.output_dir = "./temp_uploads"
        os.makedirs(self.output_dir, exist_ok=True)

    def _build_dialogue_prompt(self, topic: str, content: str, tone: str) -> str:
        return (
            f"Напишите живой диалог-подкаст между двумя ведущими — Алексей и Мария. "
            f"Тема: {topic}. Стиль: {tone}. "
            f"Они обсуждают материал, задают друг другу вопросы, делятся мнениями. "
            f"Каждая реплика СТРОГО начинается с '[Алексей]:' или '[Мария]:' на отдельной строке. "
            f"8-12 реплик суммарно, чередуй голоса. Только диалог без ремарок. Русский язык.\n\n"
            f"Материал:\n{content[:2500]}"
        )

    def _build_monologue_prompt(self, topic: str, content: str, tone: str) -> str:
        return (
            f"Создай монолог диктора (1-2 минуты). "
            f"Тема: {topic}. Стиль: {tone}. "
            f"Материал: {content[:2000]}. "
            f"Только текст на русском языке, без ремарок."
        )

    async def _tts_to_file(self, text: str, voice: str, path: str, rate: str = "+0%", pitch: str = "+0Hz") -> bool:
        """Save TTS audio to a file. Returns True on success."""
        try:
            communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            await communicate.save(path)
            return os.path.exists(path) and os.path.getsize(path) > 0
        except Exception as e:
            print(f"TTS error for [{voice}]: {e}")
            return False

    def _concat_mp3_files(self, file_paths: list, output_path: str) -> bool:
        """Concatenate multiple MP3 files by appending raw bytes (works for playback without ffmpeg)."""
        try:
            with open(output_path, 'wb') as out:
                for path in file_paths:
                    if os.path.exists(path):
                        with open(path, 'rb') as f:
                            out.write(f.read())
            return os.path.getsize(output_path) > 0
        except Exception as e:
            print(f"MP3 concat error: {e}")
            return False

    async def generate_podcast(
        self,
        topic: str,
        content: str,
        tone: str = "научный",
        voice: str = "ru-RU-DmitryNeural",
        mode: str = "monologue",
        rate: str = "+0%",
        pitch: str = "+0Hz",
        voice_b: str = "ru-RU-SvetlanaNeural",
    ) -> dict:
        if voice not in AVAILABLE_VOICES:
            voice = "ru-RU-DmitryNeural"
        if voice_b not in AVAILABLE_VOICES:
            voice_b = "ru-RU-SvetlanaNeural"

        mp3_filename = f"podcast_{uuid.uuid4().hex[:8]}.mp3"
        output_file = os.path.join(self.output_dir, mp3_filename)

        # --- Generate script ---
        script = ""
        if self.llm and content and content != "Нет данных для этого документа.":
            try:
                prompt = self._build_dialogue_prompt(topic, content, tone) if mode == "dialogue" else \
                         self._build_monologue_prompt(topic, content, tone)
                response = self.llm.invoke(prompt)
                script = response.content.strip()
            except Exception as e:
                print(f"LLM error: {e}")
                script = f"Добро пожаловать в AI-подкаст. {content[:500]}"
        else:
            script = f"Добро пожаловать в подкаст. {content[:800] if content else 'Загрузите документ.'}"

        # --- Generate audio ---
        try:
            if mode == "dialogue":
                # Parse dialogue lines
                lines = [l.strip() for l in script.split('\n') if l.strip()]
                chunks = []  # list of (text, voice)
                for line in lines:
                    if '[Алексей]' in line[:12]:
                        text = line.split(':', 1)[1].strip() if ':' in line else line
                        if text:
                            chunks.append((text, voice))
                    elif '[Мария]' in line[:10]:
                        text = line.split(':', 1)[1].strip() if ':' in line else line
                        if text:
                            chunks.append((text, voice_b))
                    else:
                        # unlabelled line — alternate
                        if line:
                            last_v = chunks[-1][1] if chunks else voice
                            next_v = voice_b if last_v == voice else voice
                            chunks.append((line, next_v))

                print(f"Dialogue chunks: {len(chunks)} ({[v for _, v in chunks[:4]]}...)")

                if len(chunks) < 2:
                    # No proper dialogue parsed — try monologue fallback
                    ok = await self._tts_to_file(script, voice, output_file, rate, pitch)
                    if not ok:
                        raise RuntimeError("TTS failed for dialogue fallback")
                else:
                    # Generate each chunk separately, then concatenate raw MP3
                    temp_files = []
                    tasks = []
                    for i, (text, v) in enumerate(chunks):
                        tmp = os.path.join(self.output_dir, f"_dlg_{uuid.uuid4().hex[:6]}_{i}.mp3")
                        temp_files.append(tmp)
                        tasks.append(self._tts_to_file(text, v, tmp, rate, pitch))

                    results = await asyncio.gather(*tasks, return_exceptions=True)

                    # Filter successful files
                    valid_files = [f for f, ok in zip(temp_files, results) if ok is True]
                    print(f"Valid TTS chunks: {len(valid_files)}/{len(chunks)}")

                    if valid_files:
                        self._concat_mp3_files(valid_files, output_file)
                    else:
                        # All failed, generate monologue
                        await self._tts_to_file(script, voice, output_file, rate, pitch)

                    # Cleanup temp files
                    for f in temp_files:
                        try:
                            os.remove(f)
                        except Exception:
                            pass
            else:
                ok = await self._tts_to_file(script, voice, output_file, rate, pitch)
                if not ok:
                    raise RuntimeError("TTS generation failed")

        except Exception as e:
            raise RuntimeError(f"Podcast generation failed: {e}")

        host_label = AVAILABLE_VOICES.get(voice, voice)
        if mode == "dialogue":
            host_label = f"{AVAILABLE_VOICES.get(voice, voice)} & {AVAILABLE_VOICES.get(voice_b, voice_b)}"

        return {
            "script": script,
            "topic": topic,
            "voice": host_label,
            "mode": mode,
            "audio_url": f"/api/documents/download/{mp3_filename}"
        }

podcast_service = PodcastService()
