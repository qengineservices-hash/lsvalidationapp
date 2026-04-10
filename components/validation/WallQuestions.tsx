"use client";

import {
  useValidationStore,
  WALL_QUESTIONS,
  WALLS,
} from "@/stores/useValidationStore";
import ToggleGroup from "@/components/ui/ToggleGroup";
import { cn } from "@/lib/utils";

interface WallQuestionsProps {
  room: string;
}

export default function WallQuestionsSection({ room }: WallQuestionsProps) {
  const {
    formData,
    setWallAnswer,
    toggleWallSelection,
    setWallComment,
    applyAllWalls,
  } = useValidationStore();

  const roomData = formData.rooms[room];
  if (!roomData) return null;

  const answeredCount = WALL_QUESTIONS.filter(
    (q) => roomData.wallAnswers[q]?.value
  ).length;

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-livspace-gray-400 font-medium">
          {answeredCount}/{WALL_QUESTIONS.length} answered
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => applyAllWalls(room, "Yes")}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all"
          >
            Apply Yes to All
          </button>
          <button
            type="button"
            onClick={() => applyAllWalls(room, "No")}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all"
          >
            Apply No to All
          </button>
        </div>
      </div>

      {/* Questions */}
      {WALL_QUESTIONS.map((question, idx) => {
        const answer = roomData.wallAnswers[question] || {
          value: "",
          walls: [],
          comment: "",
        };
        const isAnswered = !!answer.value;

        return (
          <div
            key={idx}
            className={cn(
              "p-4 rounded-xl border transition-all space-y-3",
              isAnswered
                ? "bg-green-50/50 border-green-200"
                : "bg-red-50/50 border-red-200"
            )}
          >
            {/* Question text */}
            <label className="text-sm font-semibold text-livspace-gray-800 leading-snug block">
              {idx + 1}. {question}
            </label>

            {/* Yes/No/NA Toggle */}
            <ToggleGroup
              value={answer.value}
              onChange={(val) => setWallAnswer(room, question, val)}
            />

            {/* Wall checkboxes */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-400">
                Mark walls:
              </span>
              {WALLS.map((w) => (
                <label
                  key={w}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={answer.walls.includes(w)}
                    onChange={() => toggleWallSelection(room, question, w)}
                    className="w-4 h-4 rounded border-livspace-gray-300 text-livspace-blue focus:ring-livspace-blue"
                  />
                  <span className="text-xs font-bold text-livspace-gray-600">
                    {w}
                  </span>
                </label>
              ))}
            </div>

            {/* Comment */}
            <textarea
              value={answer.comment}
              onChange={(e) => setWallComment(room, question, e.target.value)}
              placeholder="Add comments..."
              rows={2}
              className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-livspace-orange transition-all resize-none"
            />
          </div>
        );
      })}
    </div>
  );
}
