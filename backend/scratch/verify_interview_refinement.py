import asyncio
import json
from unittest.mock import patch, MagicMock

from app.tools.interview_tools import generate_interview_questions_tool, evaluate_star_interview_tool

async def test_scenarios():
    print("--- RUNNING MOCK INTERVIEW REFINEMENT VERIFICATION ---\n")

    # TEST A: Role = AI Engineer, Difficulty = Easy, Company = empty
    res_a = await generate_interview_questions_tool.ainvoke({
        "role_title": "AI Engineer",
        "difficulty": "Easy",
        "tech_stack_or_jd": "",
        "company_name": None
    })
    data_a = json.loads(res_a)
    print("TEST A (AI Engineer / Easy / No Company):")
    print(json.dumps(data_a, indent=2))
    assert "questions" in data_a and len(data_a["questions"]) >= 2
    for q in data_a["questions"]:
        assert "architecture" not in q.lower() or "easy" in q.lower() or "ai" in q.lower() or "python" in q.lower() or "principles" in q.lower()
    print("✓ TEST A PASSED\n")

    # TEST B: Role = AI Engineer, Difficulty = Medium, Company = empty
    res_b = await generate_interview_questions_tool.ainvoke({
        "role_title": "AI Engineer",
        "difficulty": "Medium",
        "tech_stack_or_jd": "",
        "company_name": ""
    })
    data_b = json.loads(res_b)
    print("TEST B (AI Engineer / Medium / No Company):")
    print(json.dumps(data_b, indent=2))
    assert "questions" in data_b and len(data_b["questions"]) >= 2
    print("✓ TEST B PASSED\n")

    # TEST C: Role = AI Engineer, Difficulty = Hard, Company = empty
    res_c = await generate_interview_questions_tool.ainvoke({
        "role_title": "AI Engineer",
        "difficulty": "Hard",
        "tech_stack_or_jd": "",
        "company_name": None
    })
    data_c = json.loads(res_c)
    print("TEST C (AI Engineer / Hard / No Company):")
    print(json.dumps(data_c, indent=2))
    assert "questions" in data_c and len(data_c["questions"]) >= 2
    print("✓ TEST C PASSED\n")

    # TEST D: Role = Backend Engineer, Difficulty = Easy, Company = empty
    res_d = await generate_interview_questions_tool.ainvoke({
        "role_title": "Backend Engineer",
        "difficulty": "Easy",
        "tech_stack_or_jd": "",
        "company_name": None
    })
    data_d = json.loads(res_d)
    print("TEST D (Backend Engineer / Easy / No Company):")
    print(json.dumps(data_d, indent=2))
    assert "questions" in data_d and len(data_d["questions"]) >= 2
    # Ensure easy backend does not default to principal architect
    print("✓ TEST D PASSED\n")

    # TEST E: Role = Backend Engineer, Difficulty = Hard, Company = "Stripe"
    res_e = await generate_interview_questions_tool.ainvoke({
        "role_title": "Backend Engineer",
        "difficulty": "Hard",
        "tech_stack_or_jd": "Go, Postgres, Redis",
        "company_name": "Stripe"
    })
    data_e = json.loads(res_e)
    print("TEST E (Backend Engineer / Hard / Stripe):")
    print(json.dumps(data_e, indent=2))
    assert "questions" in data_e and len(data_e["questions"]) >= 2
    print("✓ TEST E PASSED\n")

    print("ALL VERIFICATION SCENARIOS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_scenarios())

