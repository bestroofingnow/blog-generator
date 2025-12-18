// components/ImageEditModal.tsx
import React, { useState, useEffect } from "react";
import styles from "../styles/ImageEditModal.module.css";

interface ImageEditModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageSrc: string; // The actual src attribute
  onClose: () => void;
  onSave: (newImageUrl: string) => void;
}

export default function ImageEditModal({
  isOpen,
  imageUrl,
  imageSrc,
  onClose,
  onSave,
}: ImageEditModalProps) {
  const [editInstructions, setEditInstructions] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(imageSrc);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens with a new image
  useEffect(() => {
    if (isOpen && imageSrc) {
      setPreviewUrl(imageSrc);
      setEditInstructions("");
      setError(null);
    }
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!editInstructions.trim()) {
      setError("Please describe what you want to change");
      return;
    }

    setIsEditing(true);
    setError(null);

    try {
      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageSrc,
          editInstructions: editInstructions.trim(),
        }),
      });

      const data = await response.json();

      if (data.success && data.editedImage) {
        setPreviewUrl(data.editedImage.base64);
      } else {
        setError(data.error || "Failed to edit image");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to edit image");
    } finally {
      setIsEditing(false);
    }
  };

  const handleSave = () => {
    onSave(previewUrl);
    onClose();
  };

  const handleCancel = () => {
    setEditInstructions("");
    setPreviewUrl(imageSrc);
    setError(null);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Edit Image with Nana Banana Pro</h2>
          <button className={styles.closeBtn} onClick={handleCancel}>
            &times;
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.imageContainer}>
            <div className={styles.imageWrapper}>
              <span className={styles.imageLabel}>Current</span>
              <img src={imageSrc} alt="Original" className={styles.previewImage} />
            </div>
            {previewUrl !== imageSrc && (
              <div className={styles.imageWrapper}>
                <span className={styles.imageLabel}>Edited</span>
                <img src={previewUrl} alt="Edited" className={styles.previewImage} />
              </div>
            )}
          </div>

          <div className={styles.editForm}>
            <label htmlFor="editInstructions">
              What would you like to change about this image?
            </label>
            <textarea
              id="editInstructions"
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              placeholder="e.g., Make it brighter, change the background to sunset, add more greenery, make it look more professional..."
              className={styles.textarea}
              rows={4}
              disabled={isEditing}
            />

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isEditing || !editInstructions.trim()}
                className={styles.editBtn}
              >
                {isEditing ? (
                  <>
                    <span className={styles.spinner}></span>
                    Nana Banana Pro is editing...
                  </>
                ) : (
                  "Generate Edit"
                )}
              </button>

              {previewUrl !== imageSrc && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isEditing}
                  className={styles.saveBtn}
                >
                  Use This Image
                </button>
              )}

              <button
                type="button"
                onClick={handleCancel}
                disabled={isEditing}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <p>
            <strong>Tip:</strong> Be specific about what you want to change.
            For example: "Make the lighting warmer", "Add a sunset sky", or "Remove the background and add a garden setting".
          </p>
        </div>
      </div>
    </div>
  );
}
