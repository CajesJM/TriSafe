import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Edit3,
  FolderOpen,
  LoaderCircle,
  Save,
  X,
} from "lucide-react";
import { AdminProfile, api, SessionUser, updateSessionUser } from "../../api";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { CameraCaptureDialog } from "./CameraCaptureDialog";
import {
  BoholAddressFields,
  type BoholAddressField,
} from "../drivers/DriverLocationFields";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (user: SessionUser) => void;
};
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export function AdminProfilePanel({ open, onClose, onSaved }: Props) {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    avatarData: "",
    provinceCode: "0701200000",
    provinceName: "Bohol",
    municipalityCode: "",
    municipalityName: "",
    barangayCode: "",
    barangayName: "",
    streetPurok: "",
    postalCode: "",
    streetPlaceId: "",
    addressLatitude: 0,
    addressLongitude: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [photoSource, setPhotoSource] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [toast, setToast] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setSaved(false);
    setEditingDetails(false);
    void api
      .profile()
      .then((next) => {
        setProfile(next);
        setForm({
          fullName: next.fullName,
          username: next.username ?? "",
          email: next.email ?? "",
          phone: localPhone(next.phone),
          avatarData: next.avatarData ?? "",
          provinceCode: next.address?.provinceCode ?? "0701200000",
          provinceName: next.address?.provinceName ?? "Bohol",
          municipalityCode: next.address?.municipalityCode ?? "",
          municipalityName: next.address?.municipalityName ?? "",
          barangayCode: next.address?.barangayCode ?? "",
          barangayName: next.address?.barangayName ?? "",
          streetPurok: next.address?.streetPurok ?? "",
          postalCode: next.address?.postalCode ?? "",
          streetPlaceId: next.address?.externalPlaceId ?? "",
          addressLatitude: Number(next.address?.latitude ?? 0),
          addressLongitude: Number(next.address?.longitude ?? 0),
        });
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your profile.",
        ),
      )
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  function change(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function changeAddress(
    changes: Partial<Pick<typeof form, BoholAddressField>>,
  ) {
    setForm((current) => ({ ...current, ...changes }));
    setSaved(false);
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Please choose an image no larger than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError("");
      setPhotoSource(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  function confirmPhoto(avatarData: string) {
    change("avatarData", avatarData);
    setPhotoSource("");
    setToast("Photo edited and ready to save.");
    window.setTimeout(() => setToast(""), 3200);
  }

  function validateForm() {
    if (!/^[^\s@]+@gmail\.com$/i.test(form.email.trim()))
      return "Enter a valid Gmail address, for example admin@gmail.com.";
    if (!/^\d{10}$/.test(form.phone))
      return "Enter exactly 10 digits after the +63 prefix.";
    if (editingDetails && (!form.municipalityCode || !form.municipalityName))
      return "Select the administrator's municipality or city.";
    if (editingDetails && (!form.barangayCode || !form.barangayName))
      return "Select the administrator's barangay.";
    if (editingDetails && (!form.streetPurok || !form.streetPlaceId))
      return "Select a verified Street/Purok suggestion for the administrator address.";
    if (editingDetails && !/^\d{4}$/.test(form.postalCode))
      return "A valid 4-digit postal/ZIP code is required.";
    return "";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const next = await api.updateProfile({
        fullName: form.fullName,
        username: form.username,
        avatarData: form.avatarData,
        email: form.email.trim(),
        phone: `+63${form.phone}`,
        ...(editingDetails ? { address: {
          provinceCode: form.provinceCode,
          provinceName: form.provinceName,
          municipalityCode: form.municipalityCode,
          municipalityName: form.municipalityName,
          barangayCode: form.barangayCode,
          barangayName: form.barangayName,
          streetPurok: form.streetPurok,
          postalCode: form.postalCode,
          streetPlaceId: form.streetPlaceId,
          addressLatitude: form.addressLatitude,
          addressLongitude: form.addressLongitude,
        } } : {}),
      });
      setProfile(next);
      setForm({
        fullName: next.fullName,
        username: next.username ?? "",
        email: next.email ?? "",
        phone: localPhone(next.phone),
        avatarData: next.avatarData ?? "",
        provinceCode: next.address?.provinceCode ?? "0701200000",
        provinceName: next.address?.provinceName ?? "Bohol",
        municipalityCode: next.address?.municipalityCode ?? "",
        municipalityName: next.address?.municipalityName ?? "",
        barangayCode: next.address?.barangayCode ?? "",
        barangayName: next.address?.barangayName ?? "",
        streetPurok: next.address?.streetPurok ?? "",
        postalCode: next.address?.postalCode ?? "",
        streetPlaceId: next.address?.externalPlaceId ?? "",
        addressLatitude: Number(next.address?.latitude ?? 0),
        addressLongitude: Number(next.address?.longitude ?? 0),
      });
      updateSessionUser(next);
      onSaved(next);
      setEditingDetails(false);
      setSaved(true);
      setToast("Profile updated successfully.");
      window.setTimeout(() => setToast(""), 3600);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  const currentAvatar = form.avatarData || profile?.avatarData;
  return (
    <>
      <div
        className="profile-overlay"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          className="profile-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-title"
        >
          <div className="profile-panel-heading">
            <div>
              <p className="eyebrow">ACCOUNT SETTINGS</p>
              <h2 id="profile-title">Administrator profile</h2>
              <p>
                Keep the LGU account details used for audit records and portal
                access up to date.
              </p>
            </div>
            <button
              className="close-button"
              type="button"
              onClick={onClose}
              aria-label="Close profile"
            >
              <X size={18} />
            </button>
          </div>
          {loading ? (
            <div className="profile-loading">
              <LoaderCircle className="spin" size={24} /> Loading profile…
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="profile-identity">
                <button
                  className="avatar-edit-button"
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  aria-label="Edit profile photo"
                >
                  <div className="profile-avatar-large">
                    {currentAvatar ? (
                      <img src={currentAvatar} alt="Profile preview" />
                    ) : (
                      <span>{initials(form.fullName || "LGU")}</span>
                    )}
                    <span className="avatar-camera-icon">
                      <Camera size={15} />
                    </span>
                  </div>
                </button>
                <div>
                  <h3>Profile photo</h3>
                  <p>
                    Maximum 2 MB. Choose a file or take a photo, then crop it
                    before saving.
                  </p>
                  <input
                    ref={fileInput}
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={choosePhoto}
                  />
                  <input
                    ref={cameraInput}
                    hidden
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={choosePhoto}
                  />
                  <div className="photo-source-actions">
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => setCameraOpen(true)}
                    >
                      <Camera size={15} /> Take photo
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => fileInput.current?.click()}
                    >
                      <FolderOpen size={15} /> Choose file
                    </button>
                  </div>
                  {form.avatarData && (
                    <button
                      className="text-button profile-remove-photo"
                      type="button"
                      onClick={() => change("avatarData", "")}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
              {error && (
                <div
                  className="profile-message profile-message-error"
                  role="alert"
                >
                  {error}
                </div>
              )}
              {saved && (
                <div
                  className="profile-message profile-message-success"
                  role="status"
                >
                  <Check size={16} /> Profile saved to the database.
                </div>
              )}
              <div className="profile-details-heading">
                <div>
                  <h3>Basic information</h3>
                  <p>Use the edit button to change account details.</p>
                </div>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setEditingDetails((current) => !current)}
                >
                  <Edit3 size={15} />{" "}
                  {editingDetails ? "Done editing" : "Edit details"}
                </button>
              </div>
              <div className="form-grid profile-form-grid">
                <label className="field">
                  <span>
                    Full name <em>*</em>
                  </span>
                  <input
                    disabled={!editingDetails}
                    value={form.fullName}
                    onChange={(event) => change("fullName", event.target.value)}
                    minLength={2}
                    required
                  />
                </label>
                <label className="field">
                  <span>
                    Username <em>*</em>
                  </span>
                  <input
                    disabled={!editingDetails}
                    value={form.username}
                    onChange={(event) =>
                      change("username", event.target.value.replace(/\s/g, ""))
                    }
                    placeholder="lguadmin"
                    minLength={3}
                    required
                  />
                  <small>
                    Letters, numbers, dots, underscores, and hyphens.
                  </small>
                </label>
                <label className="field">
                  <span>
                    Gmail address <em>*</em>
                  </span>
                  <input
                    disabled={!editingDetails}
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      change("email", event.target.value.replace(/\s/g, ""))
                    }
                    placeholder="admin@gmail.com"
                    pattern="[^\s@]+@gmail\.com"
                    required
                  />
                  <small>Only valid @gmail.com addresses are accepted.</small>
                </label>
                <label className="field">
                  <span>
                    Phone number <em>*</em>
                  </span>
                  <div className="phone-input">
                    <span>+63</span>
                    <input
                      disabled={!editingDetails}
                      value={form.phone}
                      onChange={(event) =>
                        change(
                          "phone",
                          event.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9171234567"
                      required
                    />
                  </div>
                  <small>Enter 10 digits after the +63 prefix.</small>
                </label>
              </div>
              <div className="profile-address-heading">
                <div>
                  <h3>Registered address</h3>
                  <p>
                    Saved to the administrator account. Location fields are
                    read-only until Edit details is enabled.
                  </p>
                </div>
              </div>
              <BoholAddressFields
                value={form}
                onChange={changeAddress}
                readOnly={!editingDetails}
              />
              <div className="profile-panel-actions">
                <button className="secondary" type="button" onClick={onClose}>
                  Cancel
                </button>
                <button className="primary" disabled={saving} type="submit">
                  {saving ? (
                    <>
                      <LoaderCircle className="spin" size={15} /> Saving…
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Save changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
      {cameraOpen && (
        <CameraCaptureDialog
          onCancel={() => setCameraOpen(false)}
          onCaptured={(imageData) => {
            setCameraOpen(false);
            setPhotoSource(imageData);
          }}
          onFallback={() => {
            setCameraOpen(false);
            cameraInput.current?.click();
          }}
        />
      )}
      {photoSource && (
        <AvatarCropDialog
          source={photoSource}
          onCancel={() => setPhotoSource("")}
          onConfirm={confirmPhoto}
        />
      )}
      {toast && (
        <div className="profile-toast" role="status">
          <Check size={16} /> {toast}
        </div>
      )}
    </>
  );
}

function localPhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.startsWith("63")
    ? digits.slice(2, 12)
    : digits.startsWith("0")
      ? digits.slice(1, 11)
      : digits.slice(0, 10);
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
