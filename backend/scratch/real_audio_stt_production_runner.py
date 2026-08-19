import os
import sys
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.audio_service import audio_transcription_service

async def test_real_spoken_audio():
    audio_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "freetts.org-2026-08-17_06-58-27.mp3"))
    print("="*80)
    print("REAL SPOKEN AUDIO STT TRANSCRIPTION TEST")
    print("="*80)
    print(f"Loading Spoken Audio File: {audio_path}")

    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    print(f"File Size: {len(audio_bytes)} bytes (~1.1 MB)")

    res = await audio_transcription_service.transcribe_in_memory_audio(
        audio_bytes=audio_bytes,
        filename="freetts_sample.mp3",
        mime_type="audio/mp3"
    )

    print("\n--- TRANSCRIPTION SERVICE RESULT ---")
    print(f"Engine Used: {res.get('engine')}")
    print(f"Estimated Duration: {res.get('duration_seconds')}s")
    print(f"Transcript Content ({len(res.get('transcript', ''))} chars):")
    print(f"'{res.get('transcript')}'")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(test_real_spoken_audio())
