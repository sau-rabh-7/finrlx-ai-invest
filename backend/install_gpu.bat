@echo off
echo Installing PyTorch with CUDA 11.8 support for GTX 1650...
echo.

REM Activate virtual environment
call venv\Scripts\activate

REM Uninstall existing PyTorch
echo Uninstalling existing PyTorch...
pip uninstall -y torch torchvision torchaudio

REM Install PyTorch with CUDA support
echo Installing PyTorch with CUDA 11.8...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

echo.
echo GPU support installed!
echo Restart the backend server to use GPU acceleration.
echo.
pause
