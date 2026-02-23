import requests, os
from dotenv import load_dotenv
load_dotenv()
res = requests.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={os.getenv('GOOGLE_API_KEY')}")
for m in res.json().get('models', []):
  print(m['name'])
