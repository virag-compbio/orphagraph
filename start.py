#!/usr/bin/env python3
"""
OrphaGraph AI - Unified Runner
Starts both the FastAPI backend and Vite frontend development servers.
"""

import subprocess
import sys
import time
import os
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

def run():
    print("=" * 65)
    print("  OrphaGraph AI - Rare Disease Knowledge Graph & Action Engine")
    print("=" * 65)
    print("Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=BACKEND_DIR
    )

    time.sleep(1)

    print("Starting Vite Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND_DIR
    )

    print("\n[✔] Both services are running!")
    print("    - Web Interface: http://localhost:5173")
    print("    - API Documentation: http://127.0.0.1:8000/docs\n")
    print("Press Ctrl+C to terminate both servers.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait()
        frontend_proc.wait()
        print("Shutdown complete.")

if __name__ == "__main__":
    run()
