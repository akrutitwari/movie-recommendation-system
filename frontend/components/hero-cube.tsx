"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

type MotionState = {
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
};

const poses = [
  "upper-left",
  "up",
  "upper-right",
  "left",
  "center",
  "right",
  "lower-left",
  "down",
  "lower-right",
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type CharacterGender = "male" | "female";

type HeroCharacterProps = {
  gender?: CharacterGender;
};

export default function HeroCube({ gender = "male" }: HeroCharacterProps) {
  const stage = useRef<HTMLDivElement>(null);
  const motion = useRef<MotionState>({
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
  });
  const activePose = useRef<(typeof poses)[number]>("center");

  useEffect(() => {
    const target = stage.current;
    if (!target) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let frame = 0;

    function aim(event: PointerEvent) {
      if (reducedMotion.matches || event.pointerType === "touch") return;

      const bounds = target!.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height * 0.38;
      motion.current.targetX = clamp(
        (event.clientX - centerX) / (window.innerWidth * 0.44),
        -1,
        1,
      );
      motion.current.targetY = clamp(
        (event.clientY - centerY) / (window.innerHeight * 0.48),
        -1,
        1,
      );
    }

    function settle() {
      motion.current.targetX = 0;
      motion.current.targetY = 0;
    }

    function render() {
      const state = motion.current;
      state.currentX += (state.targetX - state.currentX) * 0.14;
      state.currentY += (state.targetY - state.currentY) * 0.14;

      const horizontal = state.currentX < -0.34 ? "left" : state.currentX > 0.34 ? "right" : "center";
      const vertical = state.currentY < -0.34 ? "upper" : state.currentY > 0.34 ? "lower" : "center";
      const nextPose = (
        vertical === "center"
          ? horizontal
          : horizontal === "center"
            ? vertical === "upper" ? "up" : "down"
            : `${vertical}-${horizontal}`
      ) as (typeof poses)[number];

      if (nextPose !== activePose.current) {
        activePose.current = nextPose;
        target!.dataset.activePose = nextPose;
      }
      frame = requestAnimationFrame(render);
    }

    window.addEventListener("pointermove", aim, { passive: true });
    document.documentElement.addEventListener("pointerleave", settle);
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", aim);
      document.documentElement.removeEventListener("pointerleave", settle);
    };
  }, []);

  return (
    <div
      ref={stage}
      className="character-stage"
      data-active-pose="center"
      role="img"
      aria-label={`An animated ${gender} cinema character whose gaze follows the pointer`}
    >
      <div className="character-pose-stack" aria-hidden="true">
        {poses.map((pose) => (
          <Image
            className={`character-pose character-pose--${pose}`}
            key={`${gender}-${pose}`}
            src={`/character-poses/${gender}/${pose}.webp`}
            alt=""
            draggable={false}
            width={420}
            height={500}
            style={{ width: "100%", height: "100%" }}
            priority
          />
        ))}
      </div>
      <div className="character-caption bill">
        <span>Move to direct</span>
        <span>Nine poses · one gaze</span>
      </div>
    </div>
  );
}
