from langchain_core.prompts import PromptTemplate

def rephrase_question(llm: any, question: str, history: list) -> str:
    """
    Viết lại câu hỏi của người dùng thành một câu hỏi độc lập (standalone question)
    dựa trên ngữ cảnh của lịch sử hội thoại.
    """
    if not history:
        return question

    # Lấy tối đa 4 lượt hội thoại gần nhất để tránh vượt quá context window
    recent_history = history[-4:]
    
    history_str = ""
    for msg in recent_history:
        # msg có cấu trúc: {"role": "user"/"assistant", "content": "..."}
        role = "User" if msg.get("role") == "user" else "Assistant"
        # Cắt bớt phần Sources: pages [...] trong câu trả lời của Assistant để khỏi nhiễu
        content = msg.get("content", "")
        if role == "Assistant" and "Sources: pages" in content:
            content = content.split("Sources: pages")[0].strip()
            
        history_str += f"{role}: {content}\n"

    prompt_template = """Bạn là một trợ lý ngôn ngữ AI. Nhiệm vụ của bạn là đọc lịch sử hội thoại dưới đây và câu hỏi mới nhất của người dùng, sau đó viết lại câu hỏi đó thành một câu hỏi độc lập (standalone question) có đầy đủ ngữ cảnh để có thể tự tìm kiếm thông tin mà không cần đọc lại lịch sử.
        Ví dụ: 
        - Lịch sử: User hỏi về "JWT", Assistant trả lời JWT là Json Web Token... 
        - Câu hỏi mới: "ưu điểm của nó là gì?"
        - Viết lại thành: "Ưu điểm của JWT (Json Web Token) là gì?"

        Lịch sử hội thoại:
        {history}

        Câu hỏi mới nhất: {question}

        Chỉ trả về câu hỏi đã được viết lại, KHÔNG GIẢI THÍCH, KHÔNG THÊM TỪ NGỮ NÀO KHÁC. Nếu câu hỏi mới nhất đã rõ ràng và không phụ thuộc vào lịch sử, hãy trả về y nguyên câu hỏi đó.
        Câu hỏi viết lại:"""
    
    prompt = PromptTemplate.from_template(prompt_template)
    chain = prompt | llm
    
    try:
        response = chain.invoke({"history": history_str, "question": question})
        standalone_question = response.content.strip()
        # Fallback nếu LLM trả về rỗng
        if not standalone_question:
            return question
        # Xóa các ngoặc kép nếu LLM tự sinh ra
        if standalone_question.startswith('"') and standalone_question.endswith('"'):
            standalone_question = standalone_question[1:-1]
            
        return standalone_question
    except Exception as e:
        print(f"Lỗi khi rephrase question: {e}")
        return question
