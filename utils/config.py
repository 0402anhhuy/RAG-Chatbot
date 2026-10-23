import os
from dotenv import load_dotenv

load_dotenv()

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")

CHAT_MODEL_GROQ = os.getenv("CHAT_MODEL_GROQ")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

TOP_K = 5
