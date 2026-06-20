import React, { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload, AlertCircle, Sparkles } from "lucide-react";

interface CameraViewProps {
  onCapture: (base64Image: string, mimeType: string) => void;
  onCancel: () => void;
  title: string;
  guidanceText: string;
}

export default function CameraView({ onCapture, onCancel, title, guidanceText }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize and request camera
  const startCamera = async (currentMode: "user" | "environment") => {
    setIsInitializing(true);
    setErrorMessage("");

    // Stop existing stream tracks first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: currentMode },
          width: { ideal: 1024 },
          height: { ideal: 768 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      console.error("Camera access error:", error);
      setHasPermission(false);
      setErrorMessage("Camera access did not work. Please allow camera permission, refresh the page, or try opening the link in Safari or Chrome. You can also upload a photo instead.");
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      // Cleanup on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Handle Capture Action
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match the visible video aspect or standard frame size
    canvas.width = video.videoWidth || 1024;
    canvas.height = video.videoHeight || 768;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas content to base64
    const mimeType = "image/jpeg";
    const dataUrl = canvas.toDataURL(mimeType, 0.85); // Compress slightly for network speed

    // Stop the camera stream
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    onCapture(dataUrl, mimeType);
  };

  // Toggle internal front/back facing mode
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Handle uploaded files as backup option
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        onCapture(reader.result, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-slate-950 text-white min-h-[92vh]" id="camera-view-container">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900" id="camera-header">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            {title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{guidanceText}</p>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white text-sm font-medium transition-colors px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-850 hover:bg-slate-800"
          id="btn-cancel-capture"
        >
          Cancel
        </button>
      </div>

      {/* Main Stream Area */}
      <div className="relative flex-1 flex flex-col items-center justify-center bg-black overflow-hidden min-h-[350px]" id="camera-stream-area">
        {hasPermission === true && !errorMessage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full max-h-[60vh] object-cover"
              id="camera-video-player"
            />
            {/* Visual focus frame */}
            <div className="absolute inset-0 border-[3px] border-emerald-400/30 ring-[999px] ring-black/40 pointer-events-none rounded-sm m-6 flex items-center justify-center">
              <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0"></div>
              <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0"></div>
              <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0"></div>
              <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0"></div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm" id="camera-fallback-screen">
            {isInitializing ? (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                <p className="text-sm font-medium text-slate-300">Requesting device camera access...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center max-w-md" id="camera-error-prompt">
                <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
                <h3 className="text-base font-bold text-white mb-2 uppercase tracking-wide">Camera Access Problem</h3>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                  {errorMessage || "Camera access did not work. Please allow camera permission, refresh the page, or try opening the link in Safari or Chrome. You can also upload a photo instead."}
                </p>

                {/* Upload Trigger Input */}
                <label className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer shadow-lg shadow-emerald-950/40 transition-colors">
                  <Upload className="w-5 h-5" />
                  <span>Choose Photo / Take Picture</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      {hasPermission === true && !errorMessage && (
        <div className="p-6 bg-slate-900 border-t border-slate-800 flex flex-col gap-4 items-center" id="camera-controls">
          <div className="flex items-center justify-around w-full max-w-md">
            {/* Flip camera */}
            <button
              onClick={toggleFacingMode}
              className="p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-full border border-slate-700 transition"
              title="Flip Camera"
              id="btn-flip-camera"
            >
              <RefreshCw className="w-5 h-5 text-slate-300" />
            </button>

            {/* Shutter Button */}
            <button
              onClick={handleCapture}
              className="w-18 h-18 bg-white hover:bg-slate-100 active:bg-slate-200 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-xl transition scale-100 active:scale-95"
              id="btn-capture-shutter"
            >
              <Camera className="w-8 h-8 text-slate-900" />
            </button>

            {/* File Select Backup while camera is active */}
            <label
              className="p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-full border border-slate-700 cursor-pointer transition"
              title="Upload existing file"
              id="lbl-upload-fallback"
            >
              <Upload className="w-5 h-5 text-slate-300" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            Pro Tip: On mobile browsers, make sure to hold original packaging or ingredients flat in bright ambient light.
          </p>
        </div>
      )}

      {/* Hidden storage for capture drawing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
