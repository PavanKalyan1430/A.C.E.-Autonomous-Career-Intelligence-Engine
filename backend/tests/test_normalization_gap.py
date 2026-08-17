import pytest
from app.services.nlp_service import production_nlp_service

JD_CPP = """
C++ Systems Engineer Position
Role Overview:
We are searching for a highly skilled C++ Systems Engineer to develop low-latency, real-time backend systems. In this role, you will write high-performance C++ code to optimize performance, manage memory layout, and develop systems level multi-threaded software. You must understand CPU registers, pointer math, and data structures thoroughly.

Key Requirements:
- Deep expertise in writing clean and modular C++ code for Linux environments.
- Practical experience with C++ compiler flags and debugging tools like GDB.
- Solid background in operating systems concepts, multi-threaded, concurrency control, and socket programming.
- Familiarity with continuous integration tools.
"""

JD_C = """
Embedded C Firmware Developer
Role Overview:
We are seeking an Embedded C Firmware Developer to write hardware driver level integrations. In this role, you will write bare-metal C programming code for microcontroller architectures. You will write code in C to configure hardware registers, handle interrupts, and optimize battery usage constraints.

Key Requirements:
- Expert programming skills in C language for microcontrollers (ARM, AVR).
- Experience with embedded C toolchains, compiling, linking, and static analyzers.
- Strong knowledge of debugging firmware written in C using hardware debuggers.
- Ability to read hardware schematics.
"""

JD_GO = """
Go backend Microservices Architect
Role Overview:
We are seeking a Backend Microservices Architect to design our high-performance HTTP services. You will build highly scalable REST and gRPC endpoints using Go Programming language patterns. You will design Go Programming microservices leveraging goroutines and channels to handle heavy concurrent traffic.

Key Requirements:
- Expert proficiency with Go Programming language constructs and tooling.
- Production experience deploying Go Programming services in containerized environments.
- Knowledge of microservice design patterns.
"""

JD_R_AND_NOISE = """
Statistical Data Scientist R Language
Role Overview:
I am seeking a data scientist to analyze our datasets. We will write R scripts to run statistical regressions. A data scientist must understand mathematical R models.

Key Requirements:
- Expert programming in R language for data analysis.
- Experience with R packages.
"""

JD_EXISTING_TECH = """
Full Stack Web Developer Position
Role Overview:
We are looking for a Senior Developer proficient in Python backend microservices and Java enterprise services. You will design web user interfaces using JavaScript and React frontend code. The database layer uses MongoDB, and server-side logic is running on Node.js runtime environments.

Key Requirements:
- Production experience with Python, Java, and JavaScript.
- Strong knowledge of React, Node.js, and MongoDB.
"""

@pytest.mark.anyio
async def test_c_vs_cpp_missing():
    # Candidate has C, JD asks for C++
    res = await production_nlp_service.compute_dynamic_skill_graph_gap(["C"], JD_CPP)
    # Check that C++ was extracted and is missing
    extracted = [s.lower() for s in res["missing_skills"] + res["candidate_verified_skills"]]
    assert any("c++" in s or "cplusplus" in s for s in extracted)
    assert any("c++" in s.lower() or "cplusplus" in s.lower() for s in res["missing_skills"])

@pytest.mark.anyio
async def test_cpp_vs_cpp_matched():
    # Candidate has C++, JD asks for C++
    res = await production_nlp_service.compute_dynamic_skill_graph_gap(["C++"], JD_CPP)
    # C++ should be matched (not missing)
    assert not any("c++" in s or "cplusplus" in s for s in res["missing_skills"])

@pytest.mark.anyio
async def test_csharp_vs_c_missing():
    # Candidate has C#, JD asks for C
    res = await production_nlp_service.compute_dynamic_skill_graph_gap(["C#"], JD_C)
    # C should be extracted and missing
    assert any(s.lower() == "c" for s in res["missing_skills"])

@pytest.mark.anyio
async def test_go_vs_go_programming_matched():
    # Candidate has Go, JD asks for Go Programming
    res = await production_nlp_service.compute_dynamic_skill_graph_gap(["Go"], JD_GO)
    # Go should be matched
    assert not any("go" in s.lower() for s in res["missing_skills"])

@pytest.mark.anyio
async def test_legitimate_short_tech_r_extracted():
    # Verify R is extracted from JD_R_AND_NOISE
    keyphrases = await production_nlp_service.extract_tfidf_keyphrases(JD_R_AND_NOISE, top_n=10)
    extracted_lower = [kp["keyphrase"].lower() for kp in keyphrases]
    assert "r" in extracted_lower

@pytest.mark.anyio
async def test_noise_filtering_a_i_not_extracted():
    # Verify 'a' and 'i' are filtered out from extraction results
    keyphrases = await production_nlp_service.extract_tfidf_keyphrases(JD_R_AND_NOISE, top_n=20)
    extracted_lower = [kp["keyphrase"].lower() for kp in keyphrases]
    assert "a" not in extracted_lower
    assert "i" not in extracted_lower

@pytest.mark.anyio
async def test_existing_tech_extracted():
    # Verify Python, Java, JavaScript, React, Node.js, MongoDB are extracted
    keyphrases = await production_nlp_service.extract_tfidf_keyphrases(JD_EXISTING_TECH, top_n=15)
    extracted_lower = [kp["keyphrase"].lower() for kp in keyphrases]
    assert any("python" in x for x in extracted_lower)
    assert any("java" in x for x in extracted_lower)
    assert any("javascript" in x for x in extracted_lower)
    assert any("react" in x for x in extracted_lower)
    assert any("node" in x for x in extracted_lower)
    assert any("mongodb" in x for x in extracted_lower)
