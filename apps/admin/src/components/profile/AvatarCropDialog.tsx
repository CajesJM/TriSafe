import { useEffect, useRef, useState } from "react";
import { Check, RotateCw, X } from "lucide-react";

type Props = {
  source: string;
  onCancel: () => void;
  onConfirm: (avatarData: string) => void;
};

export function AvatarCropDialog({ source, onCancel, onConfirm }: Props) {
  const image = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);

  function confirmCrop() {
    const loadedImage = image.current;
    if (!loadedImage) return;
    const side =
      Math.min(loadedImage.naturalWidth, loadedImage.naturalHeight) / zoom;
    const x = (loadedImage.naturalWidth - side) / 2;
    const y = (loadedImage.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(loadedImage, x, y, side, side, 0, 0, 512, 512);
    onConfirm(canvas.toDataURL("image/jpeg", 0.82));
  }

  useEffect(() => setZoom(1), [source]);

  return (
    <div className="avatar-crop-overlay" role="presentation">
      <section
        className="avatar-crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
      >
        <div className="profile-panel-heading">
          <div>
            <p className="eyebrow">EDIT PROFILE PHOTO</p>
            <h2 id="crop-title">Crop your avatar</h2>
            <p>
              Adjust the zoom, then confirm the square crop before uploading.
            </p>
          </div>
          <button
            className="close-button"
            type="button"
            onClick={onCancel}
            aria-label="Cancel photo editing"
          >
            <X size={18} />
          </button>
        </div>
        <div className="crop-preview">
          <img
            ref={image}
            src={source}
            alt="Photo to crop"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>
        <label className="crop-zoom">
          <span>
            <RotateCw size={15} /> Zoom
          </span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <div className="profile-panel-actions">
          <button className="secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary" type="button" onClick={confirmCrop}>
            <Check size={15} /> Use this photo
          </button>
        </div>
      </section>
    </div>
  );
}
