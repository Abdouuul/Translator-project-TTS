from flask import Flask, render_template, jsonify, request
import tempfile, whisper, torch
from ollama import chat


app = Flask(__name__, template_folder="templates", static_folder="static")


@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")

@app.route("/speech-to-text", methods=['POST'])
def speech_to_text():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    file = request.files["audio"]

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file: 
        file.save(temp_file.name)

    audio = whisper.load_audio(temp_file.name, sr=16000)
    audio_tensor = torch.from_numpy(audio).to(torch.float32)

    try:
        model = whisper.load_model("medium") # Tiny or Large
        result = model.transcribe(audio_tensor, fp16=False, language="fr")
    except Exception as e:
        print(e)

    return jsonify(result)

@app.route("/translate", methods=['POST'])
def translate_text():
    data = request.get_json(silent=True)
    user_text = data.get("text", "").strip() if data else ""
    if not user_text:
        return jsonify({"error": "No text provided"}), 400
    
    result = chat(model="llama3", messages=[
        {
            "role": "system",
            "content": "You are a professional translator, you must translate the user message to ENGLISH. You have to return the literal TRANSLATION, No explanation!!"
        },
        {
            "role": "user",
            "content": user_text
        }
    ])

    return jsonify({"message": result["message"]["content"]})

if __name__ == "__main__":
    app.run(debug=True)