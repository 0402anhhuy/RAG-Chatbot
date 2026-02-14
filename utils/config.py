import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")
CHAT_MODEL = os.getenv("CHAT_MODEL")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
CHAT_MODEL_GROQ = os.getenv("CHAT_MODEL_GROQ")

TOP_K = 5
