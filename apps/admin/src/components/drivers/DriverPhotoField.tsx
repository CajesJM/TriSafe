import { Camera, FolderOpen, Trash2, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { AvatarCropDialog } from "../profile/AvatarCropDialog";
import { CameraCaptureDialog } from "../profile/CameraCaptureDialog";

export function DriverPhotoField({
  value,
  fallbackName,
  onChange,
  onError,
}: {
  value?: string;
  fallbackName: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [source, setSource] = useState("");
  const initials =
    fallbackName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "DR";

  function choosePhoto(file?: File) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      onError("Use a JPG, PNG, or WebP profile photo.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onError("The driver profile photo must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSource(String(reader.result ?? ""));
    reader.onerror = () =>
      onError("The selected profile photo could not be read.");
    reader.readAsDataURL(file);
  }

  return (
    <>
      <div className="driver-photo-field">
        <div
          className="driver-photo-preview"
          aria-label="Optional driver profile photo preview"
        >
          {value ? (
            <img src={value} alt="Driver profile preview" />
          ) : (
            <span>{initials}</span>
          )}
          <span className="driver-photo-badge">
            <UserRound />
          </span>
        </div>
        <div className="driver-photo-copy">
          <span>
            Driver profile photo <small>Optional</small>
          </span>
          <p>
            Stored only on the driver account. It is not shown after a passenger
            scans the QR code.
          </p>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => choosePhoto(event.target.files?.[0])}
          />
          <input
            ref={cameraInput}
            hidden
            type="file"
            accept="image/*"
            capture="user"
            onChange={(event) => choosePhoto(event.target.files?.[0])}
          />
          <div className="driver-photo-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setCameraOpen(true)}
            >
              <Camera /> Take photo
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => fileInput.current?.click()}
            >
              <FolderOpen /> Choose file
            </button>
            {value && (
              <button
                type="button"
                className="text-button"
                onClick={() => onChange("")}
              >
                <Trash2 /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {cameraOpen && (
        <CameraCaptureDialog
          onCancel={() => setCameraOpen(false)}
          onCaptured={(image) => {
            setCameraOpen(false);
            setSource(image);
          }}
          onFallback={() => {
            setCameraOpen(false);
            cameraInput.current?.click();
          }}
        />
      )}
      {source && (
        <AvatarCropDialog
          source={source}
          onCancel={() => setSource("")}
          onConfirm={(image) => {
            setSource("");
            onChange(image);
          }}
        />
      )}
    </>
  );
}
