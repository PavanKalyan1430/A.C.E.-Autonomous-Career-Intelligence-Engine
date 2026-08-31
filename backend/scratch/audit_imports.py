import os
import re
import sys

def get_std_libs():
    # Built-in standard libraries for Python 3.11
    return {
        "os", "sys", "re", "json", "math", "time", "datetime", "collections",
        "hashlib", "hmac", "base64", "typing", "asyncio", "logging", "inspect",
        "functools", "pathlib", "random", "uuid", "copy", "struct", "io",
        "shutil", "tempfile", "traceback", "urllib", "xml", "csv", "ast",
        "enum", "importlib", "subprocess", "socket", "select", "threading",
        "queue", "sqlite3", "decimal", "fractions", "statistics", "contextlib",
        "abc", "typing_extensions", "mimetypes", "tempfile", "traceback", "warnings",
        "itertools", "contextvars", "operator"
    }

def audit_imports(app_dir, req_file):
    print("Auditing imports...")
    std_libs = get_std_libs()
    
    # Read requirements.txt
    req_packages = set()
    if os.path.exists(req_file):
        with open(req_file, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                # Match package name before comparison operators
                m = re.match(r"^([a-zA-Z0-9_\-\[\]]+)", line)
                if m:
                    package_name = m.group(1).lower().replace("-", "_")
                    # Handle packages with extras e.g. python-jose[cryptography]
                    package_name = re.sub(r"\[.*\]", "", package_name)
                    req_packages.add(package_name)

    # Some packages have different import names than pip install names
    package_mappings = {
        "sentence_transformers": "sentence_transformers",
        "spacy": "spacy",
        "scikit_learn": "sklearn",
        "scikit-learn": "sklearn",
        "python_jose": "jose",
        "passlib": "passlib",
        "python_multipart": "multipart",
        "python_dotenv": "dotenv",
        "tavily_python": "tavily",
        "google_generativeai": "google",
        "langchain_google_genai": "langchain_google_genai",
        "python_docx": "docx",
        "pypdf": "pypdf",
        "asyncpg": "asyncpg",
        "psycopg2_binary": "psycopg2",
        "pydantic_settings": "pydantic_settings",
        "email_validator": "email_validator",
        "aiosqlite": "aiosqlite"
    }

    # Inverse mapping from import name to pip package name
    import_to_pkg = {}
    for pkg in req_packages:
        import_to_pkg[pkg] = pkg
    for pkg, imp in package_mappings.items():
        import_to_pkg[imp.lower()] = pkg

    imported_modules = set()
    
    # Walk through python files
    for root, _, files in os.walk(app_dir):
        # Exclude virtual environments
        if "venv" in root or ".venv" in root or "__pycache__" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                # Match "import x" or "from x import y"
                matches = re.findall(r"^\s*(?:import|from)\s+([a-zA-Z0-9_]+)", content, re.MULTILINE)
                for m in matches:
                    imported_modules.add(m.lower())

    # Filter out standard libraries, local modules
    external_imports = set()
    for mod in imported_modules:
        if mod in std_libs:
            continue
        if mod == "app" or mod == "tests":
            continue
        # If it's a sub-module of the app package
        if os.path.exists(os.path.join(app_dir, mod)) or os.path.exists(os.path.join(app_dir, mod + ".py")):
            continue
        # If it matches app package subfolders
        if mod in ["agents", "api", "core", "models", "schemas", "services", "tools", "utils"]:
            continue
        external_imports.add(mod)

    print(f"External imports found: {external_imports}")
    print(f"Configured requirements: {req_packages}")

    missing = []
    for imp in external_imports:
        # Check if import maps to a required package
        if imp not in import_to_pkg:
            # Check prefix mappings (e.g. google.generativeai -> google)
            found = False
            for req in req_packages:
                if imp == req or imp.startswith(req + "_") or req.startswith(imp + "_"):
                    found = True
                    break
            if not found:
                missing.append(imp)

    if missing:
        print("\n[WARNING] Missing packages in requirements.txt:")
        for m in missing:
            print(f" - {m}")
    else:
        print("\n[SUCCESS] No missing packages detected!")

if __name__ == "__main__":
    audit_imports(
        app_dir="c:/Users/B.PAVANKALYAN REDDY/Desktop/ACE/backend/app",
        req_file="c:/Users/B.PAVANKALYAN REDDY/Desktop/ACE/backend/requirements.txt"
    )
