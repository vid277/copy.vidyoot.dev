"use client";

import { useState, useRef, type RefObject } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ParticleButtonProps {
  onSuccess?: () => void;
  successDuration?: number;
  enabled?: boolean;
}

function SuccessParticles({
  buttonRef,
}: {
  buttonRef: React.RefObject<HTMLButtonElement>;
}) {
  const rect = buttonRef.current?.getBoundingClientRect();
  if (!rect) return null;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return (
    <AnimatePresence>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="fixed w-1 h-1 bg-black dark:bg-white rounded-full"
          style={{ left: centerX, top: centerY }}
          initial={{
            scale: 0,
            x: 0,
            y: 0,
          }}
          animate={{
            scale: [0, 1, 0],
            x: [0, (i % 2 ? 1 : -1) * (Math.random() * 50 + 20)],
            y: [0, -Math.random() * 50 - 20],
          }}
          transition={{
            duration: 0.6,
            delay: i * 0.1,
            ease: "easeOut",
          }}
        />
      ))}
    </AnimatePresence>
  );
}

export default function ParticleButton({
  onSuccess,
  successDuration = 1000,
  enabled = true,
}: ParticleButtonProps) {
  const [showParticles, setShowParticles] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = async () => {
    setShowParticles(true);
    onSuccess?.();

    setTimeout(() => {
      setShowParticles(false);
    }, successDuration);
  };

  return (
    <>
      {showParticles && (
        <SuccessParticles
          buttonRef={buttonRef as RefObject<HTMLButtonElement>}
        />
      )}
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={cn(
          "relative text-sm transition-all duration-200 border-2 px-3 py-3.5 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md text-white bg-black disabled:opacity-50 disabled:cursor-not-allowed",
          enabled && "hover:border-black hover:bg-white hover:text-black",
          showParticles && "duration-100",
        )}
        disabled={!enabled}
      >
        {enabled ? "Create Note" : "Please enter a valid URL path"}
      </button>
    </>
  );
}
