"use client";

import { useEffect, useState } from "react";

interface WorkoutTimerProps {
  startedAt: string;
}

export function WorkoutTimer({ startedAt }: WorkoutTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="font-mono text-[15px] font-semibold text-[var(--accent)]">
      {hours > 0 ? `${pad(hours)}:` : ""}
      {pad(minutes)}:{pad(seconds)}
    </span>
  );
}
