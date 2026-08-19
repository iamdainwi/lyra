from langchain_ollama import ChatOllama
from dotenv import load_dotenv

load_dotenv()

def get_llm() -> ChatOllama:
    return ChatOllama(
        base_url="https://ollama.com",
        model="gpt-oss:120b-cloud", temperature=0.7
    )

def get_llm_json() -> ChatOllama:
    return ChatOllama(
        base_url="https://ollama.com",
        model="gpt-oss:120b-cloud",
        temperature=0.1,
        format="json"
    )
