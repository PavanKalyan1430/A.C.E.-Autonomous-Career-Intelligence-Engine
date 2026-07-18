from langchain_core.tools import tool
import json

@tool
def generate_interview_questions(role_title: str, tech_stack: list) -> str:
    """Generates 3 technical mock interview questions tailored to the role and tech stack."""
    questions = [
        f"Explain how you would optimize a slow database query in a {role_title} system utilizing {tech_stack[0] if tech_stack else 'SQL'}.",
        f"Describe a challenging project where you integrated {tech_stack[1] if len(tech_stack) > 1 else 'REST APIs'} and how you resolved issues.",
        "How do you handle rate-limiting and concurrent user spikes in a production API?"
    ]
    return json.dumps({"questions": questions}, indent=2)

@tool
def evaluate_interview_answer(question: str, user_answer: str) -> str:
    """Evaluates a user's mock interview answer, providing a score and specific suggestions for improvement."""
    score = 75  # Default baseline score
    feedback = []
    
    if len(user_answer.split()) < 15:
        score -= 20
        feedback.append("Your response is too brief. Try to structure your answer using the STAR method (Situation, Task, Action, Result).")
    else:
        feedback.append("Good start. Include more architectural keywords and discuss trade-offs you considered.")
        
    result = {
        "score": score,
        "strengths": "Answer shows basic conceptual understanding.",
        "areas_for_improvement": feedback
    }
    return json.dumps(result, indent=2)
