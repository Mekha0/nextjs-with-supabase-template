"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/img-bucket";
import { Button } from "@/components/ui/button";

export function PhotoPicker({
  file,
  onChange,
  existingUrl,
  label = "Insert photo",
  disabled,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string | null;
  label?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f?: File) {
    if (inputRef.current) inputRef.current.value = ""; // allow re-picking the same file
    if (!f) return;
    stopCamera();
    if (!f.type.startsWith("image/")) return setError("Choose an image file.");
    if (f.size > MAX_UPLOAD_BYTES)
      return setError("Choose an image that is 10 MB or smaller.");
    setError(null);
    onChange(f);
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setError("Camera access failed. Choose a photo instead, or check your browser permissions.");
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("Wait for the camera preview, then try again.");
      return;
    }
    const scale = Math.min(1, 1280 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Could not capture that photo. Please try again.");
        return;
      }
      pick(new File([blob], "supply-photo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.85);
  }

  const shown = preview ?? existingUrl ?? null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-foreground/70">{label}</p>
      <div className="relative">
        {cameraOn ? (
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          </div>
        ) : <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-label={shown ? "Change photo" : "Choose a photo"}
          className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-cork-input text-foreground/50 disabled:opacity-60"
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2">
              <ImagePlus className="h-12 w-12" strokeWidth={1.25} />
              <span className="text-xs">Tap to add a photo</span>
            </span>
          )}
        </button>}

        {!cameraOn && !disabled && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => inputRef.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" /> Choose photo
            </Button>
            <Button type="button" variant="outline" className="h-10 rounded-full" onClick={startCamera}>
              <Camera className="mr-2 h-4 w-4" /> Take photo
            </Button>
          </div>
        )}
        {cameraOn && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-full" onClick={stopCamera}>Cancel</Button>
            <Button type="button" className="h-10 rounded-full" onClick={takePhoto}>Capture</Button>
          </div>
        )}

        {file && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove selected photo"
            className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
