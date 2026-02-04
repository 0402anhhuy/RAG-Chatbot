# RAG Chatbot with Flashcards (Streamlit)

A **Retrieval-Augmented Generation (RAG)** application that allows you to:

* Chat and ask questions based on your own documents (PDF, text)
* Automatically **generate study flashcards**

---

## Key Features

* 📄 **Upload documents** (PDF / text)
* ✂️ **Text chunking & embedding**
* 🔎 **Context retrieval** using a Vector Store
* 🤖 **Document-based chatbot**
* 🧠 **Automatic flashcard generation (Q&A)**
* 💾 State management with `st.session_state`

---

## Flashcard Generation

1. Retrieve the most relevant text chunks
2. Send the context to the LLM
3. The LLM returns a list of flashcards in the following format:

```json
[
  {
    "question": "...",
    "answer": "..."
  }
]
```

---

## ▶️ How to Run the Project

### 1️⃣ Install dependencies

```bash
pip install -r requirements.txt
```

---

### 2️⃣ Set API keys

Create a `.env` file in the project root directory with the following content:

```env
GOOGLE_API_KEY="your_google_api_key"
OPENAI_API_KEY="your_openai_api_key"
```

---

### 3️⃣ Run the application

```bash
streamlit run app.py
```