import subprocess
import re
html = open("index.html", "r", encoding="utf-8").read()
scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
if scripts:
    inline_script = scripts[-1]
    open("temp_script.js", "w", encoding="utf-8").write(inline_script)
    print("Extracted script of size:", len(inline_script))
    res = subprocess.run(["node", "--check", "temp_script.js"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("RETURN CODE:", res.returncode)
    if res.returncode != 0:
        print("STDERR:")
        print(res.stderr)
else:
    print("No inline script found!")
