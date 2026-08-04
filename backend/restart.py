import psutil, time, subprocess, sys, os

print("Killing port 8000...")
for conn in psutil.net_connections():
    if conn.laddr.port == 8000:
        try:
            psutil.Process(conn.pid).terminate()
            print("Killed process", conn.pid)
        except Exception as e:
            print("Error killing:", e)
time.sleep(2)

print("Starting uvicorn...")
# We need to run it in the background so this script can exit
env = os.environ.copy()
subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8000"], env=env, close_fds=True)
print("Started successfully")
