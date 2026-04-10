"use client";

import {
  useValidationStore,
  ROOM_QUESTIONS,
} from "@/stores/useValidationStore";
import ToggleGroup from "@/components/ui/ToggleGroup";
import { cn } from "@/lib/utils";

interface RoomQuestionsProps {
  room: string;
}

export default function RoomQuestionsSection({ room }: RoomQuestionsProps) {
  const { formData, setRoomAnswer, setRoomComment } = useValidationStore();

  const roomData = formData.rooms[room];
  if (!roomData) return null;

  const answeredCount = ROOM_QUESTIONS.filter(
    (q) => roomData.roomAnswers[q]?.value
  ).length;

  return (
    <div className="space-y-4">
      <span className="text-xs text-livspace-gray-400 font-medium">
        {answeredCount}/{ROOM_QUESTIONS.length} answered
      </span>

      {ROOM_QUESTIONS.map((question, idx) => {
        const answer = roomData.roomAnswers[question] || {
          value: "",
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
              onChange={(val) => setRoomAnswer(room, question, val)}
            />

            {/* Comment */}
            <textarea
              value={answer.comment}
              onChange={(e) => setRoomComment(room, question, e.target.value)}
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
