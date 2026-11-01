import subprocess
import sys
import webbrowser
import time
import os

def main():
    print("==================================================================")
    print(" Hardware IP Watermarking & Verification System (v5 Final)       ")
    print("==================================================================")
    
    print("1. Checking dependencies from requirements.txt...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    except Exception as e:
        print(f"Notice: {e}")
    
    print("\n2. Starting local web server on http://localhost:5000 ...")
    time.sleep(1)
    
    try:
        webbrowser.open("http://localhost:5000")
    except Exception:
        pass
    
    from backend.app import app
    app.run(host="0.0.0.0", port=5000, debug=False)

if __name__ == "__main__":
    main()
