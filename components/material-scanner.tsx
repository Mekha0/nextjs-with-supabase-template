"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { removePhoto, uploadPhoto } from "@/lib/storage/img-bucket";
import { cn } from "@/lib/utils";

type ScanState = "idle" | "scanning" | "done" | "error";
type Candidate = {
  id: string;
  name: string;
  confidence: number;
  accepted: boolean;
  fromScan: boolean; // false for supplies typed in by hand
};
type Notice = { text: string; tone: "error" | "success" } | null;

export function MaterialScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // The uploaded copy of the current photo, and how many items point at it.
  const uploadedRef = useRef<{ value: string; used: number } | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [attachPhoto, setAttachPhoto] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [manualName, setManualName] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  const error = (text: string) => setNotice({ text, tone: "error" });

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  useEffect(
    () => () => streamRef.current?.getTracks().forEach((t) => t.stop()),
    [],
  );

  // If the photo was uploaded but no item ended up using it, delete the file.
  function discardUpload() {
    const up = uploadedRef.current;
    if (up && up.used === 0) void removePhoto(up.value);
    uploadedRef.current = null;
  }

  function reset() {
    discardUpload();
    setPhoto(null);
    setCandidates([]);
    setState("idle");
    setNotice(null);
  }

  async function startCamera() {
    setNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      error(
        "Camera access failed. Choose a photo instead, or check your browser permissions.",
      );
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      error("Wait for the camera preview, then try again.");
      return;
    }
    const scale = Math.min(1, 1280 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas
      .getContext("2d")
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    discardUpload();
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    setCandidates([]);
    setState("idle");
    stopCamera();
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type))
      return error("Choose a JPEG or PNG image.");
    if (file.size > 10 * 1024 * 1024)
      return error("Choose an image that is 10 MB or smaller.");

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that image."));
      reader.readAsDataURL(file);
    });
    stopCamera();
    discardUpload();
    setPhoto(dataUrl);
    setCandidates([]);
    setState("idle");
    setNotice(null);
  }

  async function scan() {
    if (!photo) return;
    setState("scanning");
    setNotice(null);
    try {
      const imageBlob = await (await fetch(photo)).blob();
      const formData = new FormData();
      formData.append(
        "image",
        imageBlob,
        imageBlob.type === "image/png" ? "scan.png" : "scan.jpg",
      );
      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The scan failed.");
      setCandidates(
        (data.candidates ?? []).map(
          (c: { name: string; confidence: number }) => ({
            ...c,
            id: crypto.randomUUID(),
            accepted: true,
            fromScan: true,
          }),
        ),
      );
      setState("done");
    } catch (e) {
      setState("error");
      error(e instanceof Error ? e.message : "The scan failed.");
    }
  }

  function addManualCandidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = manualName.trim();
    if (!name) return;
    setCandidates((cur) => [
      ...cur,
      {
        id: crypto.randomUUID(),
        name,
        confidence: 0,
        accepted: true,
        fromScan: false,
      },
    ]);
    setManualName("");
  }

  // Uploads the scan photo once, then reuses it for every item.
  async function ensureUploaded(): Promise<string> {
    if (uploadedRef.current) return uploadedRef.current.value;
    const blob = await (await fetch(photo as string)).blob();
    const file = new File([blob], "scan.jpg", {
      type: blob.type || "image/jpeg",
    });
    const value = await uploadPhoto(file, "items");
    uploadedRef.current = { value, used: 0 };
    return value;
  }

  async function saveAcceptedCandidates() {
    const toSave = candidates.filter((c) => c.accepted && c.name.trim());
    if (!toSave.length)
      return error("Select or add at least one supply first.");

    setSaving(true);
    setNotice(null);
    let saved = 0;
    const summary = () =>
      `${saved} ${saved === 1 ? "supply was" : "supplies were"} added.`;
    try {
      let photoValue: string | null = null;
      if (attachPhoto && photo && toSave.some((c) => c.fromScan)) {
        try {
          photoValue = await ensureUploaded();
        } catch {
          throw new Error(
            "Couldn't upload the photo. Try again, or turn off “Save this photo” to add the supplies without it.",
          );
        }
      }

      for (const candidate of toSave) {
        const usePhoto = candidate.fromScan ? photoValue : null;
        const response = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: candidate.name.trim(),
            quantity: 1,
            photo_url: usePhoto,
          }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error?.message ?? `Could not add ${candidate.name}.`,
          );
        saved += 1;
        if (usePhoto && uploadedRef.current) uploadedRef.current.used += 1;
        setCandidates((cur) => cur.filter((item) => item.id !== candidate.id));
      }
      setNotice({ text: summary(), tone: "success" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "Could not add supplies.";
      error(saved ? `${summary()} ${reason}` : reason);
    } finally {
      setSaving(false);
    }
  }

  const updateCandidate = (id: string, patch: Partial<Candidate>) =>
    setCandidates((cur) =>
      cur.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-cork-input shadow-inner">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt="Selected materials to scan"
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "h-full w-full object-cover",
                !cameraOn && "hidden",
              )}
            />
            {!cameraOn && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-foreground/50">
                <ImagePlus className="h-16 w-16" strokeWidth={1.25} />
                <p className="text-sm">Photograph your craft supplies</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {!photo && !cameraOn && (
          <Button className="h-12 w-full rounded-full" onClick={startCamera}>
            <Camera className="mr-2 h-4 w-4" /> Start camera
          </Button>
        )}
        {!photo && cameraOn && (
          <Button className="h-12 w-full rounded-full" onClick={takePhoto}>
            Capture
          </Button>
        )}
        {photo && (
          <Button
            className="h-12 w-full rounded-full"
            onClick={scan}
            disabled={state === "scanning"}
          >
            {state === "scanning" ? "Scanning…" : "Identify materials"}
          </Button>
        )}

        <div className="flex gap-3">
          <label
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 flex-1 cursor-pointer rounded-full",
            )}
          >
            <ImagePlus className="mr-2 h-4 w-4" /> Choose photo
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => void handleUpload(e.target.files?.[0])}
            />
          </label>
          {photo && (
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-full"
              onClick={reset}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Retake
            </Button>
          )}
        </div>
      </div>

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={cn(
            "text-sm",
            notice.tone === "error" ? "text-destructive" : "text-primary",
          )}
        >
          {notice.text}
        </p>
      )}

      {/* Review */}
      {state === "done" && (
        <section className="space-y-4 rounded-3xl bg-cork p-4 shadow-md">
          <div>
            <h2 className="font-medium">Review detected supplies</h2>
            <p className="text-sm text-foreground/70">
              Edit or uncheck names before adding them.
            </p>
          </div>

          {candidates.length ? (
            <ul className="space-y-2">
              {candidates.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl bg-cork-input p-2.5"
                >
                  <input
                    aria-label={`Accept ${c.name}`}
                    type="checkbox"
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                    checked={c.accepted}
                    onChange={(e) =>
                      updateCandidate(c.id, { accepted: e.target.checked })
                    }
                  />
                  <input
                    aria-label="Supply name"
                    className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm outline-none"
                    value={c.name}
                    onChange={(e) =>
                      updateCandidate(c.id, { name: e.target.value })
                    }
                  />
                  {c.confidence > 0 && (
                    <span className="text-xs text-foreground/60">
                      {Math.round(c.confidence * 100)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/70">
              No items were detected. Add a supply below.
            </p>
          )}

          <form className="flex gap-2" onSubmit={addManualCandidate}>
            <input
              aria-label="Add a supply manually"
              className="h-10 min-w-0 flex-1 rounded-full bg-cork-input px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Add a supply manually"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <Button
              type="submit"
              variant="outline"
              className="h-10 rounded-full"
            >
              Add
            </Button>
          </form>

          {photo && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={attachPhoto}
                onChange={(e) => setAttachPhoto(e.target.checked)}
              />
              Save this photo with the detected supplies
            </label>
          )}

          {candidates.some((c) => c.accepted) && (
            <Button
              className="h-12 w-full rounded-full"
              onClick={saveAcceptedCandidates}
              disabled={saving}
            >
              {saving ? "Adding supplies…" : "Add accepted supplies"}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
