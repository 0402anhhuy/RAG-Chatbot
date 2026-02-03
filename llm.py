import os
from langchain_google_genai import ChatGoogleGenerativeAI
from utils.config import CHAT_MODEL, GOOGLE_API_KEY
import google.generativeai as genai


# ===== 1. Kiểm tra API KEY =====
print("Checking API Key...")
api_key = GOOGLE_API_KEY

# ===== 2. Liệt kê tất cả model Gemini hợp lệ =====
print("\nListing available Gemini models...")
genai.configure(api_key=api_key)

models = genai.list_models()
for m in models:
    print(f"- {m.name} | supports generateContent: {'generateContent' in m.supported_generation_methods}")

# ===== 3. Chọn model an toàn (Flash) =====
print(f"\nTesting model: {CHAT_MODEL}")

llm = ChatGoogleGenerativeAI(
    model=CHAT_MODEL,
    temperature=0,
    google_api_key=api_key
)

# ===== 4. Test LLM trực tiếp =====
print("\nSending test prompt...")
try:
    response = llm.invoke("Xin chào, bạn là ai?")
    print("\nLLM RESPONSE:")
    print(response.content)
except Exception as e:
    print("\nLLM ERROR:")
    print(type(e))
    print(e)
