"use client";

import { useEffect, useRef, useState } from "react";

type ScanState = "idle" | "scanning" | "done" | "error";
type Candidate = { id: string; name: string; confidence: number; accepted: boolean };

export function MaterialScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [manualName, setManualName] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function startCamera() {
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setMessage("Camera access failed. Use the photo upload option or check your browser permissions.");
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setMessage("Wait for the camera preview, then try again.");
      return;
    }
    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    setCandidates([]);
    setState("idle");
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setMessage("Choose a JPEG or PNG image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Choose an image that is 10 MB or smaller.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that image."));
      reader.readAsDataURL(file);
    });
    setPhoto(dataUrl);
    setCandidates([]);
    setState("idle");
    setMessage("");
  }

  async function scan() {
    if (!photo) return;
    setState("scanning");
    setMessage("");
    try {
      const imageBlob = await (await fetch(photo)).blob();
      const formData = new FormData();
      formData.append("image", imageBlob, imageBlob.type === "image/png" ? "scan.png" : "scan.jpg");
      const response = await fetch("/api/scan", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The scan failed.");
      setCandidates(
        (data.candidates ?? []).map((candidate: { name: string; confidence: number }) => ({
          ...candidate,
          id: crypto.randomUUID(),
          accepted: true,
        })),
      );
      setState("done");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "The scan failed.");
    }
  }

  function addManualCandidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = manualName.trim();
    if (!name) return;
    setCandidates((current) => [...current, { id: crypto.randomUUID(), name, confidence: 0, accepted: true }]);
    setManualName("");
  }

  async function saveAcceptedCandidates() {
    const toSave = candidates.filter((candidate) => candidate.accepted && candidate.name.trim());
    if (!toSave.length) {
      setMessage("Select or add at least one supply first.");
      return;
    }

    setSaving(true);
    setMessage("");
    let saved = 0;
    try {
      for (const candidate of toSave) {
        const response = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: candidate.name.trim(), quantity: 1, photo_url: null }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? `Could not add ${candidate.name}.`);
        saved += 1;
        setCandidates((current) => current.filter((item) => item.id !== candidate.id));
      }
      setMessage(`${saved} ${saved === 1 ? "supply was" : "supplies were"} added.`);
    } catch (error) {
      setMessage(
        saved
          ? `${saved} ${saved === 1 ? "supply was" : "supplies were"} added. ${error instanceof Error ? error.message : "The next item could not be added."}`
          : error instanceof Error ? error.message : "Could not add supplies.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-5 rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold">Scan your crafting materials</h1>
        <p className="mt-1 text-sm text-muted-foreground">Take a photo or choose one to identify the items in view.</p>
      </div>

      <div className="overflow-hidden rounded-lg bg-black">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Selected materials to scan" className="max-h-[65vh] w-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline className="max-h-[65vh] min-h-64 w-full object-contain" />
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {!photo && <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={startCamera}>Start camera</button>}
        {!photo && <button className="rounded-md border px-4 py-2" onClick={takePhoto}>Take photo</button>}
        {photo && <button className="rounded-md border px-4 py-2" onClick={() => { setPhoto(null); setCandidates([]); setState("idle"); }}>Retake / choose another</button>}
        {photo && <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" onClick={scan} disabled={state === "scanning"}>{state === "scanning" ? "Scanning…" : "Identify materials"}</button>}
        <label className="cursor-pointer rounded-md border px-4 py-2">
          Choose photo
          <input className="sr-only" type="file" accept="image/jpeg,image/png" capture="environment" onChange={(event) => void handleUpload(event.target.files?.[0])} />
        </label>
      </div>

      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      {state === "done" && (
        <div className="space-y-3">
          <div>
            <h2 className="font-medium">Review detected supplies</h2>
            <p className="text-sm text-muted-foreground">Edit or remove names before adding them to your supplies.</p>
          </div>
          {candidates.length ? (
            <ul className="space-y-2">
              {candidates.map((candidate) => (
                <li key={candidate.id} className="flex items-center gap-3 rounded-md border p-3">
                  <input
                    aria-label={`Accept ${candidate.name}`}
                    type="checkbox"
                    checked={candidate.accepted}
                    onChange={(event) => setCandidates((current) => current.map((item) => item.id === candidate.id ? { ...item, accepted: event.target.checked } : item))}
                  />
                  <input
                    aria-label="Supply name"
                    className="min-w-0 flex-1 rounded border bg-background px-2 py-1"
                    value={candidate.name}
                    onChange={(event) => setCandidates((current) => current.map((item) => item.id === candidate.id ? { ...item, name: event.target.value } : item))}
                  />
                  {candidate.confidence > 0 && <span className="text-xs text-muted-foreground">{Math.round(candidate.confidence * 100)}%</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No items were detected. Add a supply below.</p>
          )}
          <form className="flex gap-2" onSubmit={addManualCandidate}>
            <input
              aria-label="Add a supply manually"
              className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2"
              placeholder="Add a supply manually"
              value={manualName}
              onChange={(event) => setManualName(event.target.value)}
            />
            <button className="rounded-md border px-3 py-2" type="submit">Add</button>
          </form>
          {candidates.some((candidate) => candidate.accepted) && (
            <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" onClick={saveAcceptedCandidates} disabled={saving}>
              {saving ? "Adding supplies…" : "Add accepted supplies"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
