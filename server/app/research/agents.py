from app.research.state import ResearchState
from app.core.llm import get_llm
from langchain_core.messages import HumanMessage, SystemMessage

async def researcher_node(state: ResearchState) -> ResearchState:
    llm = get_llm()
    context = "\n\n".join([f"Source: {s['url']}\n{s['content'][:1500]}" for s in state["deduplicated_context"]])
    
    debate_history = ""
    for msg in state.get("debate", []):
        debate_history += f"\n{msg['agent']} (Round {msg['round']}): {msg['message']}"

    prompt = f"""You are the Researcher Agent. 
Your task is to analyze the research context and build a strong evidence-supported position regarding the user query: "{state['original_query']}".
If there is debate history, respond to the Critic's points.

Context:
{context}

Debate History:
{debate_history}

Provide your argument or rebuttal based ONLY on the evidence provided."""

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    
    state["researcher_position"] = response.content
    debate = state.get("debate", [])
    debate.append({"agent": "researcher", "round": state.get("debate_rounds", 0) + 1, "message": response.content})
    state["debate"] = debate
    return state

async def critic_node(state: ResearchState) -> ResearchState:
    llm = get_llm()
    context = "\n\n".join([f"Source: {s['url']}\n{s['content'][:1500]}" for s in state["deduplicated_context"]])
    
    debate_history = ""
    for msg in state.get("debate", []):
        debate_history += f"\n{msg['agent']} (Round {msg['round']}): {msg['message']}"

    prompt = f"""You are the Critic Agent.
Your task is to act as a skeptical counterpart to the Researcher. 
Identify unsupported claims, weak evidence, or contradictions regarding the user query: "{state['original_query']}".
Do not automatically disagree if the Researcher is completely correct, but look for nuances or missing perspectives.

Context:
{context}

Debate History:
{debate_history}

Provide your critique or counter-argument based ONLY on the evidence provided."""

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    
    state["critic_position"] = response.content
    debate = state.get("debate", [])
    debate.append({"agent": "critic", "round": state.get("debate_rounds", 0) + 1, "message": response.content})
    state["debate"] = debate
    state["debate_rounds"] = state.get("debate_rounds", 0) + 1
    return state

async def synthesizer_node(state: ResearchState) -> ResearchState:
    llm = get_llm()
    context = "\n\n".join([f"Source: {s['url']}\n{s['content'][:1500]}" for s in state["deduplicated_context"]])
    
    debate_history = ""
    for msg in state.get("debate", []):
        debate_history += f"\n{msg['agent']} (Round {msg['round']}): {msg['message']}"

    prompt = f"""You are the Final Synthesizer.
User Query: "{state['original_query']}"

Based on the original evidence and the debate between the Researcher and the Critic, produce a final, comprehensive answer.
Be objective, mention areas of agreement, resolve disagreements where possible, and cite sources.

Debate History:
{debate_history}

Provide your final synthesized answer."""

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    state["final_answer"] = response.content
    return state
