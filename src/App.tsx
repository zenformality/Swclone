import React, { useState, useRef } from "react";
import { Mic, UploadCloud, Play, Loader2, Sparkles, Wand2, Volume2, Download, Heart, ArrowLeft, Trash2, History, FileAudio, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HistoryItem {
  id: string;
  text: string;
  audioUrl: string;
  timestamp: string;
}

const PRESET_SCRIPTS = [
  {
    label: "🌌 Space Narration",
    text: "The universe is under no obligation to make sense to you. Yet, as we peer into the cosmic dark, we find beauty, order, and timeless starlight guiding our voyager sails."
  },
  {
    label: "🎤 Podcast Intro",
    text: "Welcome back to the daily session. Today, we are deep diving into the future of neural architecture, speech synthesizers, and how synthetic voices are shaping the digital edge."
  },
  {
    label: "📱 Virtual Assistant",
    text: "Hello! I've successfully cloned your voice profile under swclone. All system nodes are fully functional, calibrated, and ready for your verbal operations."
  },
  {
    label: "🎭 Dramatic Monologue",
    text: "I have seen things you people wouldn't believe. Attack ships on fire off the shoulder of Orion. I watched C-beams glitter in the dark near the Tannhäuser Gate. All those moments will be lost in time."
  }
];

export default function App() {
  const [view, setView] = useState<"main" | "credits">("main");
  
  const [file, setFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const [textToSpeak, setTextToSpeak] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  
  // New features state
  const [activeTab, setActiveTab] = useState<"upload" | "record">("upload");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const options = MediaRecorder.isTypeSupported("audio/webm") 
        ? { mimeType: "audio/webm" } 
        : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const recordedFile = new File([audioBlob], `recorded_sample_${Date.now()}.wav`, { type: "audio/wav" });
        setFile(recordedFile);
        
        // Stop all tracks of stream to release mic icon
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setCloneError("Microphone access denied or not supported: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleCloneVoice = async () => {
    if (!file || !voiceName) return;

    setIsCloning(true);
    setCloneError(null);

    const formData = new FormData();
    formData.append("name", voiceName);
    formData.append("sampleFile", file);

    try {
      const res = await fetch("/api/clone-voice", {
        method: "POST",
        body: formData,
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to clone voice");
        setClonedVoiceId(data.voiceId);
        setTextToSpeak("Hello there! This is a test of my newly cloned voice.");
      } else {
        const textResponse = await res.text();
        throw new Error(`Server returned non-JSON response (${res.status}): ` + textResponse.substring(0, 50));
      }
    } catch (err: any) {
      setCloneError(err.message);
    } finally {
      setIsCloning(false);
    }
  };

  const handleGenerateSpeech = async () => {
    if (!clonedVoiceId || !textToSpeak) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          voiceId: clonedVoiceId,
          text: textToSpeak
        }),
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to generate speech");
        }
      } else if (!res.ok) {
        const textResponse = await res.text();
        throw new Error(`Server returned non-JSON response (${res.status}): ` + textResponse.substring(0, 50));
      }

      // If ok and not json, it should be the audio blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Save to history
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        text: textToSpeak,
        audioUrl: url,
        timestamp
      };
      setHistory(prev => [newItem, ...prev]);
    } catch (err: any) {
      setGenerateError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (view === "credits") {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-indigo-500/30 w-full flex flex-col items-center pt-12 md:pt-24 px-4 font-sans">
        <div className="max-w-2xl w-full flex flex-col gap-8 pb-32">
          
          <button 
            onClick={() => setView("main")}
            className="self-start flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" />
            Back to App
          </button>
          
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white font-display">Credits</h1>
            <p className="text-neutral-400 text-sm">
              Acknowledgments and open source attributions.
            </p>
          </header>

          <main className="flex flex-col gap-6">
             <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 bg-neutral-950 border border-neutral-800 rounded-full flex items-center justify-center shadow-lg">
                  <Heart className="h-8 w-8 text-pink-500 fill-pink-500/20" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">Project Acknowledgments</h2>
                  <p className="text-neutral-400 mt-2 text-sm max-w-sm mx-auto">
                    Special thanks to Zen for the inspiration and contributions to this project's vision.
                  </p>
                </div>
                
                <a 
                  href="https://github.com/zenformality" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 bg-white hover:bg-neutral-200 text-neutral-950 font-medium px-6 py-3 rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  Visit zenformality on GitHub
                </a>
             </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-indigo-500/30 w-full flex flex-col items-center pt-8 md:pt-16 px-4 font-sans relative">
      
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <button 
          onClick={() => setView("credits")}
          className="text-sm font-medium text-neutral-400 hover:text-white transition-colors bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-4 py-2 rounded-full"
        >
          Credits
        </button>
      </div>

      <div className="max-w-2xl w-full flex flex-col gap-8 pb-32">
        
        <header className="flex flex-col gap-2 items-center text-center mt-8">
          <div className="h-16 w-16 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center shadow-2xl mb-2 relative overflow-hidden">
             <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
             <Mic className="h-8 w-8 text-indigo-400 relative z-10" />
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-white font-display">swclone</h1>
          <p className="text-neutral-400 max-w-md mx-auto text-sm md:text-base">
            Upload an audio sample to clone a voice profile. Generate high-fidelity speech using neural text-to-speech.
          </p>
        </header>

        <main className="flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900 border border-neutral-800 p-6 md:p-8 rounded-3xl"
          >
            <div className="flex flex-col gap-6">
              
              <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                    <span className="text-sm font-medium text-neutral-300">1</span>
                 </div>
                 <h2 className="text-lg font-medium">Create Voice Profile</h2>
              </div>

              {!clonedVoiceId ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-400">Profile Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Jane's Podcast Voice"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm placeholder:text-neutral-600"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-neutral-400">Audio Sample Required</label>
                      <div className="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
                        <button
                          type="button"
                          onClick={() => { setActiveTab("upload"); if (!isRecording) setFile(null); }}
                          className={`px-3 py-1 text-xs rounded-md transition-colors font-medium ${activeTab === "upload" ? "bg-neutral-800 text-white border border-neutral-700/50 shadow" : "text-neutral-400 hover:text-neutral-200"}`}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActiveTab("record"); if (!isRecording) setFile(null); }}
                          className={`px-3 py-1 text-xs rounded-md transition-colors font-medium ${activeTab === "record" ? "bg-neutral-800 text-white border border-neutral-700/50 shadow" : "text-neutral-400 hover:text-neutral-200"}`}
                        >
                          Record Live
                        </button>
                      </div>
                    </div>

                    {activeTab === "upload" ? (
                      <div className="flex flex-col gap-2">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50 bg-neutral-950/50 rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors text-neutral-400 hover:text-neutral-200 cursor-pointer w-full"
                        >
                          <UploadCloud className="h-6 w-6 text-neutral-500" />
                          <div className="text-sm text-center">
                            <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
                            <div className="text-xs text-neutral-500 mt-1">Provide clear audio without background noise (MP3, WAV)</div>
                          </div>
                          {file && (
                            <div className="text-sm font-medium text-indigo-300 mt-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 truncate max-w-[200px] flex items-center gap-1.5 mx-auto">
                              <FileAudio className="h-3.5 w-3.5 animate-pulse" />
                              {file.name}
                            </div>
                          )}
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="audio/*"
                          onChange={handleFileChange}
                        />
                      </div>
                    ) : (
                      <div className="border border-neutral-800 bg-neutral-950/50 rounded-xl p-8 flex flex-col items-center justify-center gap-4 text-center">
                        {isRecording ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="relative flex items-center justify-center">
                              <span className="absolute inline-flex h-12 w-12 rounded-full bg-red-500/20 animate-ping" />
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-650 transition-colors shadow shadow-red-500/30 font-semibold relative z-10 text-xs"
                              >
                                Stop
                              </button>
                            </div>
                            <div className="text-lg font-mono font-bold text-red-400">{formatTime(recordingSeconds)}</div>
                            <p className="text-xs text-neutral-500">Recording audio sample... Speak clearly into your microphone.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <button
                              type="button"
                              onClick={startRecording}
                              className="h-12 w-12 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Mic className="h-5 w-5" />
                            </button>
                            <div className="text-sm">
                              <span className="font-semibold text-indigo-400">Start Recording</span>
                              <div className="text-xs text-neutral-500 mt-1">Ensure microphone access is permitted when prompted</div>
                            </div>
                            {file && (
                              <div className="text-sm font-medium text-green-400 mt-1 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 truncate max-w-[200px] flex items-center gap-1.5 mx-auto">
                                <FileAudio className="h-3.5 w-3.5" />
                                Recorded Audio ({file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)}MB` : `${(file.size / 1024).toFixed(0)}KB`})
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {cloneError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm break-words">
                      {cloneError}
                    </div>
                  )}

                  <button
                    onClick={handleCloneVoice}
                    disabled={!file || !voiceName || isCloning}
                    className="mt-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                  >
                    {isCloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isCloning ? "Analyzing Audio..." : "Construct Profile"}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Wand2 className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Voice Profile Active</span>
                    <span className="text-green-500/80 text-xs">ID: {clonedVoiceId}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {clonedVoiceId && (
              <div className="flex flex-col gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-neutral-900 border border-neutral-800 p-6 md:p-8 rounded-3xl"
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                          <span className="text-sm font-medium text-neutral-300">2</span>
                       </div>
                       <h2 className="text-lg font-medium">Synthesize Speech</h2>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-neutral-400">Script to Synthesize</label>
                        <button 
                          type="button"
                          onClick={() => setTextToSpeak("")}
                          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" /> Clear Text
                        </button>
                      </div>
                      <textarea 
                        value={textToSpeak}
                        onChange={(e) => setTextToSpeak(e.target.value)}
                        placeholder="Enter the script you want to hear synthesized..."
                        className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm placeholder:text-neutral-600 min-h-[120px] resize-y"
                      />
                      
                      {/* Presets List */}
                      <div className="mt-2 flex flex-col gap-2">
                        <span className="text-xs text-neutral-500 font-medium">Quick Presets:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                          {PRESET_SCRIPTS.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setTextToSpeak(preset.text)}
                              className="bg-neutral-950/40 hover:bg-neutral-950 border border-neutral-850 hover:border-indigo-500/30 transition-all p-2.5 rounded-xl text-xs leading-normal font-medium text-neutral-300 flex flex-col gap-1 cursor-pointer"
                            >
                              <span className="font-semibold text-indigo-400">{preset.label}</span>
                              <span className="text-neutral-500 line-clamp-2 text-[10px] text-ellipsis">{preset.text}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {generateError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm break-words">
                        {generateError}
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      <button
                        onClick={handleGenerateSpeech}
                        disabled={!textToSpeak || isGenerating}
                        className="bg-neutral-50 hover:bg-white disabled:opacity-50 text-neutral-950 rounded-xl px-6 py-3 font-medium flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
                      >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin text-neutral-500" /> : <Volume2 className="h-4 w-4" />}
                        {isGenerating ? "Synthesizing Audio..." : "Generate Speech"}
                      </button>
                      
                      {audioUrl && (
                        <div className="mt-4 flex flex-col gap-3">
                          <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Latest Generated Speech</div>
                          <div className="flex items-center gap-3">
                            <audio controls src={audioUrl} className="w-full h-12 outline-none rounded-full" autoPlay />
                            <a 
                              href={audioUrl} 
                              download={`swclone-speech-${Date.now()}.wav`}
                              className="flex flex-col items-center justify-center h-12 w-12 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors border border-neutral-700 shrink-0"
                              title="Download Audio"
                            >
                              <Download className="h-5 w-5" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Synthesis History Section */}
                {history.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-neutral-900 border border-neutral-800 p-6 md:p-8 rounded-3xl"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-indigo-400" />
                          <h2 className="text-base font-semibold">Previous Generations</h2>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setHistory([])}
                          className="text-xs text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" /> Clear All
                        </button>
                      </div>

                      <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
                        {history.map((item) => (
                          <div 
                            key={item.id}
                            className="bg-neutral-950/40 border border-neutral-855 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all"
                          >
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
                                "{item.text}"
                              </p>
                              <span className="text-[10px] text-neutral-500 font-mono">{item.timestamp}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end">
                              <audio controls src={item.audioUrl} className="h-8 max-w-[150px] sm:max-w-[180px]" />
                              <div className="flex items-center gap-1.5">
                                <a 
                                  href={item.audioUrl} 
                                  download={`swclone-speech-${item.id}.wav`}
                                  className="h-8 w-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                                  title="Download WAV"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setHistory(prev => prev.filter(h => h.id !== item.id))}
                                  className="h-8 w-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                                  title="Remove"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>

        </main>
      </div>
    </div>
  );
}
