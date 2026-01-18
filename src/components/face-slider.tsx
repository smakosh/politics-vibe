"use client";

import Image from "next/image";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type Face = "trump" | "mamdani" | "neutral";

const faceMap: Record<Face, { src: string; alt: string }> = {
  trump: { src: "/faces/trump.png", alt: "Trump face" },
  mamdani: { src: "/faces/mamdani.png", alt: "Mamdani face" },
  neutral: { src: "/faces/neutral.svg", alt: "Neutral face" },
};

type FaceSliderProps = {
  value: number;
  face: Face;
  className?: string;
};

export function FaceSlider({ value, face, className }: FaceSliderProps) {
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
  const faceData = faceMap[face];

  return (
    <SliderPrimitive.Root
      value={[safeValue]}
      min={0}
      max={100}
      disabled
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        className
      )}
      aria-label="Funding slider"
    >
      <SliderPrimitive.Track className="relative h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 shadow-inner">
        <SliderPrimitive.Range className="absolute h-full bg-transparent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="relative -mt-1 size-14 rounded-full border border-white/70 bg-white shadow-lg ring-2 ring-zinc-200">
        <Image
          src={faceData.src}
          alt={faceData.alt}
          width={52}
          height={52}
          className="rounded-full"
          priority
        />
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
}
