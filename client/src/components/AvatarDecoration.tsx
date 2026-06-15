import type { AvatarDecoration as AvatarDecorationType, AvatarDecorations } from "@gamenite/shared";
import sunglasses from "../assets/decorations/sunglasses.png";
import glasses from "../assets/decorations/glasses.png";
import tophat from "../assets/decorations/tophat.png";
import sweater from "../assets/decorations/sweater.png";
import bowtie from "../assets/decorations/bowtie.png";
import { useEffect, useRef, useState } from "react";

export const avatarDecorations: Record<AvatarDecorations, { image: string; width: number }> = {
  sunglasses: { image: sunglasses, width: 80 },
  glasses: { image: glasses, width: 60 },
  tophat: { image: tophat, width: 40 },
  sweater: { image: sweater, width: 100 },
  bowtie: { image: bowtie, width: 50 },
};

type AvatarDecorationProps = {
  decoration: AvatarDecorationType;
  onDrag?: (id: number, x: number, y: number) => void;
  onRemove?: (id: number) => void;
  onRotate?: (id: number, rotation: number) => void;
};

export default function AvatarDecoration({
  decoration,
  onDrag,
  onRotate,
  onRemove,
}: AvatarDecorationProps) {
  const decorationRef = useRef<HTMLDivElement>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [draggingOffset, setDraggingOffset] = useState<{ x: number; y: number } | null>(null);

  function onMouseDown(e: React.MouseEvent) {
    if (!onDrag) return;

    const rect = e.currentTarget.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;

    const cx = rect.left + width / 2;
    const cy = rect.top + height / 2;

    setDraggingOffset({
      x: e.clientX - cx,
      y: e.clientY - cy,
    });
  }

  function onClick() {
    setIsSelected((s) => !s);
  }

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if (draggingOffset) {
        if (!decorationRef.current) return;

        const parent = decorationRef.current.parentElement;
        if (!parent) return;
        const parentRect = parent.getBoundingClientRect();

        const rect = decorationRef.current.getBoundingClientRect();

        if (
          rect.right < parentRect.left ||
          rect.left > parentRect.right ||
          rect.bottom < parentRect.top ||
          rect.top > parentRect.bottom
        ) {
          // If the decoration is released outside the parent container, remove it
          onRemove?.(decoration.id);
        }
      }

      setDraggingOffset(null);
      setIsRotating(false);
    }

    function onMouseMove(e: MouseEvent) {
      if (isRotating) {
        if (!decorationRef.current) return;

        const rect = decorationRef.current.getBoundingClientRect();

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) + Math.PI / 2;

        onRotate?.(decoration.id, (angle * 180) / Math.PI);
      } else if (draggingOffset) {
        if (!decorationRef.current) return;

        const rect = decorationRef.current.parentElement?.getBoundingClientRect();
        if (!rect) return;

        const cx = e.clientX - draggingOffset.x - rect.left;
        const cy = e.clientY - draggingOffset.y - rect.top;

        const x = ((cx - decorationRef.current.clientWidth / 2) / rect.width) * 100;
        const y = ((cy - decorationRef.current.clientHeight / 2) / rect.height) * 100;

        onDrag?.(decoration.id, x, y);
      }
    }

    function onMouseDown(e: MouseEvent) {
      if (!(e.target instanceof Node) || !decorationRef.current?.contains(e.target)) {
        setIsSelected(false);
      }
    }

    document.addEventListener("pointerup", onMouseUp);
    document.addEventListener("pointermove", onMouseMove);
    document.addEventListener("pointerdown", onMouseDown);

    return () => {
      document.removeEventListener("pointerup", onMouseUp);
      document.removeEventListener("pointermove", onMouseMove);
      document.removeEventListener("pointerdown", onMouseDown);
    };
  }, [onDrag, draggingOffset, decoration.id, isRotating, onRotate, onRemove]);

  return (
    <div
      onPointerDown={onMouseDown}
      onClick={onClick}
      style={{
        position: "absolute",
        left: `${decoration.x}%`,
        top: `${decoration.y}%`,
        transform: `rotate(${decoration.rotation}deg)`,
        transformOrigin: "center center",
        width: `${avatarDecorations[decoration.type].width}%`,
        border: isSelected ? "1px dashed yellow" : "none",
      }}
      ref={decorationRef}
    >
      <img
        src={avatarDecorations[decoration.type].image}
        alt={decoration.type}
        style={{ userSelect: "none", width: "100%" }}
        draggable={false}
      />
      {isSelected && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "-2rem",
            width: 2,
            height: "2rem",
            backgroundColor: "red",
            cursor: isRotating ? "grabbing" : "grab",
          }}
          onPointerDown={() => setIsRotating(true)}
        />
      )}
    </div>
  );
}
