import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")

CHAT_MODEL = (os.getenv("CHAT_MODEL") or "").strip() or "gemini-1.5-flash"
if CHAT_MODEL in {"gemini-pro", "models/gemini-pro"}:
	CHAT_MODEL = "gemini-1.5-flash"

if "gemini-2.5-pro" in CHAT_MODEL:
	# This model often requires billing/paid quota; leaving it allowed, but warn early.
	print(
		"Warning: CHAT_MODEL is gemini-2.5-pro; if you see 429 RESOURCE_EXHAUSTED, "
		"check your Gemini API quota/billing or switch to gemini-1.5-flash."
	)

TOP_K = int(os.getenv("TOP_K") or "4")
