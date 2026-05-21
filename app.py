import os
import json
import re
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found in .env file.")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")


def call_gemini(prompt):
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set. Please add it to your .env file.")
    response = model.generate_content(prompt)
    return response.text


def extract_json(text):
    """Extract JSON array from model response, stripping markdown fences."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/generate-notes", methods=["POST"])
def generate_notes():
    try:
        data = request.get_json()
        topic = data.get("topic", "").strip()
        level = data.get("level", "Beginner").strip()
        if not topic:
            return jsonify({"error": "Topic is required."}), 400

        prompt = (
            f"Generate concise but useful learning notes for the topic: {topic}. "
            f"Level: {level}. Include definition, key concepts, examples, and a short revision summary. "
            f"Format with clear headings and bullet points using markdown."
        )
        notes = call_gemini(prompt)
        return jsonify({"notes": notes})
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to generate notes: {str(e)}"}), 500


@app.route("/generate-flashcards", methods=["POST"])
def generate_flashcards():
    try:
        data = request.get_json()
        topic = data.get("topic", "").strip()
        level = data.get("level", "Beginner").strip()
        if not topic:
            return jsonify({"error": "Topic is required."}), 400

        prompt = (
            f'Generate 10 flashcards for the topic: {topic}. Level: {level}. '
            f'Return only valid JSON in this format, with no explanation or markdown:\n'
            f'[{{"question": "...", "answer": "..."}}]'
        )
        raw = call_gemini(prompt)
        flashcards = extract_json(raw)
        return jsonify({"flashcards": flashcards})
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse flashcards. Please try again."}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to generate flashcards: {str(e)}"}), 500


@app.route("/generate-quiz", methods=["POST"])
def generate_quiz():
    try:
        data = request.get_json()
        topic = data.get("topic", "").strip()
        level = data.get("level", "Beginner").strip()
        if not topic:
            return jsonify({"error": "Topic is required."}), 400

        prompt = (
            f'Generate 5 multiple-choice quiz questions for the topic: {topic}. Level: {level}. '
            f'Return only valid JSON with no explanation or markdown:\n'
            f'[{{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}}]'
        )
        raw = call_gemini(prompt)
        quiz = extract_json(raw)
        return jsonify({"quiz": quiz})
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse quiz. Please try again."}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to generate quiz: {str(e)}"}), 500


@app.route("/active-recall", methods=["POST"])
def active_recall():
    try:
        data = request.get_json()
        topic = data.get("topic", "").strip()
        question = data.get("question", "").strip()
        user_answer = data.get("answer", "").strip()

        if not topic or not question:
            return jsonify({"error": "Topic and question are required."}), 400
        if not user_answer:
            return jsonify({"feedback": "Please provide an answer before submitting.", "verdict": "Incomplete"})

        prompt = (
            f"Evaluate this student answer. Topic: {topic}. Question: {question}. "
            f"Student answer: {user_answer}. "
            f"Give short, encouraging feedback and state whether the answer is Correct, Partially Correct, or Incorrect. "
            f"Start your response with the verdict on its own line."
        )
        feedback = call_gemini(prompt)
        verdict = "Incorrect"
        lower = feedback.lower()
        if "partially correct" in lower:
            verdict = "Partially Correct"
        elif "correct" in lower:
            verdict = "Correct"

        return jsonify({"feedback": feedback, "verdict": verdict})
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to evaluate answer: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True)
