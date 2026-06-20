# SW Clone

SW Clone is a modern AI-powered voice cloning application that allows users to upload or record a voice sample, create a custom voice profile, and generate speech from text using that cloned voice.

##  Features

###  Voice Cloning
- Upload WAV audio samples
- Record audio directly from your microphone
- Create custom voice profiles
- Supports browser-based recording

###  Text-to-Speech Generation
- Convert text into speech using the cloned voice
- High-quality AI-generated audio
- Instant playback inside the application
- Download generated speech files

###  Generation History
- Save generated voice outputs
- Replay previous generations
- Track generation timestamps

###  Modern User Interface
- Responsive design
- Smooth animations using Motion
- Clean and futuristic layout
- Easy-to-use workflow

##  Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Motion
- Lucide React Icons

### Backend
- Node.js
- Express
- Multer

### AI Services
- Hugging Face Gradio API
- TonyAssi/Voice-Clone Model

##  Installation

Clone the repository:

```
git clone https://github.com/zenformality/Swclone.git
cd Swclone
```

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

## 🔨 Build for Production

```bash
npm run build
```

Run production build:

```bash
npm start
```

## 📂 Project Structure

```text
Swclone/
│
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── server.ts
├── uploads/
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## ⚙️ How It Works

### Step 1: Create Voice Profile
Upload or record a voice sample.

### Step 2: Clone Voice
The audio file is stored temporarily and assigned a unique Voice ID.

### Step 3: Generate Speech
Enter any text and submit it to the AI voice cloning model.

### Step 4: Download Audio
Listen to or download the generated speech output.

## 📡 API Endpoints

### Clone Voice

```http
POST /api/clone-voice
```

Form Data:

```text
name
sampleFile
```

Response:

```json
{
  "voiceId": "generated-file-id.wav"
}
```

---

### Generate Speech

```http
POST /api/synthesize
```

Request:

```json
{
  "voiceId": "generated-file-id.wav",
  "text": "Hello world"
}
```

Response:

```text
audio/wav
```

##  Notes

- Voice samples are stored locally in the uploads directory.
- Uses the free Hugging Face Gradio backend.
- Generation speed depends on model availability.
- Microphone permission is required for recording.

##  Future Improvements

- Multiple saved voice profiles
- User authentication
- Cloud storage support
- Better voice management
- Audio trimming tools
- Voice profile sharing
- Dark/Light mode toggle

##  Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push your branch

```bash
git push origin feature/new-feature
```

5. Open a Pull Request

##  License

This project is licensed under the MIT License.

##  Author

Developed by **ZenFormality**
<img width="150" height="150" alt="image" src="https://github.com/user-attachments/assets/3b67c18e-898b-4d7e-8ec8-7413c0c4c68c" />


---

⭐ If you find this project useful, please consider starring the repository.
