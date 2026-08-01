import { useEffect, useRef, useState } from "react";
import { Camera, Check, LoaderCircle, X } from "lucide-react";

type Props = {
  onCancel: () => void;
  onCaptured: (imageData: string) => void;
  onFallback: () => void;
};

export function CameraCaptureDialog({
  onCancel,
  onCaptured,
  onFallback,
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let active = true;
    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Live camera access is unavailable in this browser.");
        setStarting(false);
        return;
      }
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!active) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = nextStream;
        if (video.current) {
          video.current.srcObject = nextStream;
          await video.current.play();
        }
      } catch {
        setError("Camera permission was denied or the camera is unavailable.");
      } finally {
        if (active) setStarting(false);
      }
    }
    void startCamera();
    return () => {
      active = false;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
  }, []);

  function capture() {
    const currentVideo = video.current;
    if (!currentVideo?.videoWidth || !currentVideo.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = currentVideo.videoWidth;
    canvas.height = currentVideo.videoHeight;
    canvas
      .getContext("2d")
      ?.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);
    onCaptured(canvas.toDataURL("image/jpeg", 0.82));
  }

  return (
    <div className="avatar-crop-overlay" role="presentation">
      <section
        className="camera-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-title"
      >
        <div className="profile-panel-heading">
          <div>
            <p className="eyebrow">TAKE PHOTO</p>
            <h2 id="camera-title">Use device camera</h2>
            <p>
              Allow camera access, position your face, and capture a profile
              photo.
            </p>
          </div>
          <button
            className="close-button"
            type="button"
            onClick={onCancel}
            aria-label="Close camera"
          >
            <X size={18} />
          </button>
        </div>
        <div className="camera-preview">
          {starting ? (
            <div className="profile-loading">
              <LoaderCircle className="spin" size={24} /> Starting camera…
            </div>
          ) : error ? (
            <div className="camera-error">
              <Camera size={24} />
              <p>{error}</p>
              <button className="secondary" type="button" onClick={onFallback}>
                Open device camera
              </button>
            </div>
          ) : (
            <video ref={video} autoPlay muted playsInline />
          )}
        </div>
        <div className="profile-panel-actions">
          <button className="secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="primary"
            type="button"
            disabled={starting || Boolean(error)}
            onClick={capture}
          >
            <Camera size={15} /> Capture photo
          </button>
        </div>
        <p className="camera-note">
          On mobile, “Open device camera” launches the phone’s native camera
          when browser camera permissions are unavailable.
        </p>
      </section>
    </div>
  );
}
