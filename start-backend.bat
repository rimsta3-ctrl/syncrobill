@echo off
setlocal

if not exist venv (
  echo Creating virtual environment...
  python -m venv venv
  if errorlevel 1 goto :fail
)

call venv\Scripts\activate.bat
if errorlevel 1 goto :fail

echo Installing Python dependencies...
python -m pip install --upgrade pip
if errorlevel 1 goto :fail

python -m pip install -r requirements.txt
if errorlevel 1 goto :fail

echo Starting Syncrobill FastAPI backend on http://localhost:8000 ...
python -m uvicorn backend.main:app --reload
goto :eof

:fail
echo Backend startup failed.
exit /b 1
