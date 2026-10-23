import json

with open('candidate/data/01_initial.json', 'r', encoding='utf-8') as f:
    d1 = json.load(f)

with open('candidate/data/02_update.json', 'r', encoding='utf-8') as f:
    d2 = json.load(f)

with open('candidate/app/data/analysis_data.json', 'r', encoding='utf-8') as f:
    analysis = json.load(f)

js_content = f"""// Pre-bundled dataset for zero-CORS / offline file:// support
window.BUNDLE_DATA = {{
  initial_delivery: {json.dumps(d1, indent=2)},
  update_delivery: {json.dumps(d2, indent=2)},
  analysis_data: {json.dumps(analysis, indent=2)}
}};
"""

with open('candidate/app/dataset.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Generated candidate/app/dataset.js ({len(js_content)} bytes)")
