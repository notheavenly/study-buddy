# Study Buddy — Setup Instructions

## 1. Get a Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

## 2. Add Your API Key
Create a `.env` file in the `study-buddy/` folder (copy from `.env.example`):

```
GEMINI_API_KEY=your_actual_api_key_here
```

## 3. Install Dependencies

```bash
cd study-buddy
pip install -r requirements.txt
```

## 4. Run the App

```bash
python app.py
```

## 5. Open in Browser

Go to: http://127.0.0.1:5000

---

## Project Structure

```
study-buddy/
├── app.py              ← Flask backend
├── .env                ← Your API key (never commit this!)
├── .env.example        ← Template for .env
├── requirements.txt    ← Python dependencies
├── templates/
│   └── index.html      ← Full frontend UI
└── static/
    ├── style.css       ← Dark premium design
    └── script.js       ← All frontend logic
```

## Troubleshooting

- **"GEMINI_API_KEY not found"** → Make sure `.env` exists in the project root
- **Network error in browser** → Confirm Flask is running on port 5000
- **Failed to parse flashcards/quiz** → The AI occasionally wraps JSON in markdown; the backend strips it automatically. Retry if it happens.

flask
python-dotenv
google-generativeai
gunicorn
