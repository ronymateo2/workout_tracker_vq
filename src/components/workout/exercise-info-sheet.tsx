"use client";

import { useEffect } from "react";
import {
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import type { PanInfo } from "framer-motion";
import { Info } from "lucide-react";
import type { Exercise } from "@/types/models";
import { EXERCISE_TYPE_LABELS, MUSCLE_GROUP_LABELS } from "@/types/models";

interface ExerciseInfoSheetProps {
  exercise: Exercise | null;
  onClose: () => void;
}

function parseYouTubeTime(t: string): number {
  // "7m4s" → 424, "7m" → 420, "4s" → 4, "424" → 424
  const complex = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (complex && (complex[1] || complex[2] || complex[3])) {
    return (parseInt(complex[1] ?? "0") * 3600) +
           (parseInt(complex[2] ?? "0") * 60) +
           parseInt(complex[3] ?? "0");
  }
  return parseInt(t, 10) || 0;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  if (!match) return null;

  const parsed = new URL(url);
  const t = parsed.searchParams.get("t") ?? parsed.hash.replace(/^#t=/, "") ?? null;
  const start = t ? `&start=${parseYouTubeTime(t)}` : "";

  return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1${start}`;
}

export function ExerciseInfoSheet({ exercise, onClose }: ExerciseInfoSheetProps) {
  const y = useMotionValue(800);
  const dragControls = useDragControls();
  const backdropOpacity = useTransform(y, [0, 300], [1, 0]);

  useEffect(() => {
    if (!exercise) return;
    y.set(800);
    void animate(y, 0, { type: "spring", damping: 30, stiffness: 300 });
  }, [exercise, y]);

  function handleClose() {
    void animate(y, 800, { duration: 0.22, ease: "easeIn" });
    setTimeout(onClose, 220);
  }

  function handleDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    if (info.offset.y > 80 || info.velocity.y > 500) {
      handleClose();
    } else {
      void animate(y, 0, { type: "spring", damping: 30, stiffness: 400 });
    }
  }

  if (!exercise) return null;

  const embedUrl = exercise.video_url ? getYouTubeEmbedUrl(exercise.video_url) : null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        style={{ opacity: backdropOpacity }}
        onClick={handleClose}
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
      />

      {/* Sheet */}
      <motion.div
        style={{ y }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.3 }}
        onDragEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 z-[71] flex max-h-[80vh] flex-col rounded-t-[20px] bg-[var(--background-secondary)]"
      >
        {/* Grabber */}
        <div
          className="flex shrink-0 cursor-grab touch-none select-none justify-center pb-2 pt-3 active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="h-[5px] w-[36px] rounded-full bg-[var(--fill-tertiary)]" />
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-5 scrollbar-none"
          style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}
        >
          {/* Name */}
          <h2 className="mb-1 mt-1 text-[24px] font-bold leading-tight text-[var(--foreground)]">
            {exercise.name}
          </h2>

          {/* Description */}
          {exercise.description && (
            <p className="mb-3 text-[15px] leading-[1.6] text-[var(--foreground)]/70">
              {exercise.description}
            </p>
          )}

          {/* Badges */}
          <div className="mb-4 mt-2 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-[var(--accent)]/15 px-3 py-[5px] text-[12px] font-semibold text-[var(--accent)]">
              {EXERCISE_TYPE_LABELS[exercise.exercise_type]}
            </span>
            {exercise.unilateral && (
              <span className="inline-flex rounded-full bg-[var(--fill-tertiary)] px-3 py-[5px] text-[12px] font-semibold text-[var(--label-secondary)]">
                Unilateral
              </span>
            )}
          </div>

          {/* Muscle groups */}
          {exercise.muscle_groups.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--label-secondary)]">
                Músculos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {exercise.muscle_groups.map((mg) => (
                  <span
                    key={mg}
                    className="inline-flex items-center rounded-full bg-[var(--fill-quaternary)] px-3 py-1 text-[13px] text-[var(--foreground)]"
                  >
                    {MUSCLE_GROUP_LABELS[mg]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          {exercise.video_url && (
            <div className="mb-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--label-secondary)]">
                Video
              </p>
              <div
                className="relative w-full overflow-hidden rounded-[14px] bg-black"
                style={{ paddingTop: "56.25%" }}
              >
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={exercise.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                ) : (
                  <video
                    src={exercise.video_url}
                    controls
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!exercise.description && !exercise.video_url && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="flex size-14 items-center justify-center rounded-full bg-[var(--fill-quaternary)]">
                <Info className="size-6 text-[var(--label-secondary)]" />
              </div>
              <p className="text-center text-[14px] text-[var(--label-secondary)]">
                No hay descripción ni video disponible.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
