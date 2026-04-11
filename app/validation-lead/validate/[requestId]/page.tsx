"use client";

import { useAppDataStore } from "@/stores/useAppDataStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useValidationStore, WALL_QUESTIONS, ROOM_QUESTIONS, MEASUREMENT_FIELDS, PHOTO_SURFACES } from "@/stores/useValidationStore";
import WallQuestionsSection from "@/components/validation/WallQuestions";
import RoomQuestionsSection from "@/components/validation/RoomQuestions";
import MeasurementSection from "@/components/validation/MeasurementSection";
import PhotoSection from "@/components/validation/PhotoSection";
import SocietyConstraintsSection from "@/components/validation/SocietyConstraints";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Ruler,
  ArrowLeft,
  CheckCircle,
  PauseCircle,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Accordion
function Accordion({
  title,
  badge,
  children,
  defaultOpen = false,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-left"
      >
        <span className="text-sm font-bold text-livspace-blue">{title}</span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[10px] font-bold bg-livspace-blue/10 text-livspace-blue px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-livspace-blue" /> : <ChevronDown className="w-4 h-4 text-livspace-blue" />}
        </div>
      </button>
      {open && <div className="pt-4 pb-2">{children}</div>}
    </div>
  );
}

function getRoomProgress(roomData: any) {
  const wallAnswered = WALL_QUESTIONS.filter((q) => roomData.wallAnswers[q]?.value).length;
  const roomAnswered = ROOM_QUESTIONS.filter((q) => roomData.roomAnswers[q]?.value).length;
  const total = WALL_QUESTIONS.length + ROOM_QUESTIONS.length;
  const answered = wallAnswered + roomAnswered;
  return { answered, total, percent: Math.round((answered / total) * 100) };
}

function getGlobalProgress(formData: any) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SOCIETY_QUESTIONS } = require("@/stores/useValidationStore");
  const answered = Object.values(formData.society).filter((v) => !!v).length;
  const total = SOCIETY_QUESTIONS.length;
  return { answered, total, percent: total === 0 ? 100 : Math.round((answered / total) * 100) };
}

export default function ValidateRequestPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;

  const currentUser = useAuthStore((s) => s.currentUser);
  const { validationRequests, updateRequestStatus, getUserById, cities } = useAppDataStore();
  const {
    formData,
    activeRoom,
    setActiveRoom,
    addRoom,
    deleteRoom,
    updateSociety,
    updateProject,
    importValidationData,
    resetValidation,
  } = useValidationStore();

  const [newRoom, setNewRoom] = useState("");

  const request = validationRequests.find((r) => r.id === requestId);

  // Initialize or Restore data from the request
  useEffect(() => {
    if (request) {
      // Check if we need to switch project context
      if (formData.project.pid !== request.pid) {
        resetValidation();
        
        // Populate basic info
        const city = cities.find((c) => c.id === request.city_id);
        updateProject({
          pid: request.pid,
          customerName: request.customer_name,
          city: city?.name || "",
          address: request.address,
          society: request.society_name,
          flat: request.flat_no,
          floorNo: request.floor_no,
        });

        // Restore saved validation data if exists
        if (request.validation_data) {
          importValidationData(request.validation_data);
        }

        // Mark as in_progress if just assigned
        if (request.status === "assigned" || request.status === "new") {
          updateRequestStatus(request.id, "in_progress");
        }
      }
    }
  }, [request, formData.project.pid, resetValidation, updateProject, importValidationData, updateRequestStatus, cities]);

  if (!request) {
    return (
      <div className="container py-20 text-center">
        <p className="text-lg text-red-600 font-bold">Request not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-livspace-orange font-bold">← Go Back</button>
      </div>
    );
  }

  if (!currentUser) return null;

  const requester = getUserById(request.requested_by);
  const city = cities.find((c) => c.id === request.city_id);

  const handleAddRoom = () => {
    const name = newRoom.trim();
    if (!name) return;
    if (formData.roomOrder.includes(name)) {
      alert("Room already exists!");
      return;
    }
    addRoom(name);
    setActiveRoom(name);
    setNewRoom("");
  };

  const goToNextRoom = () => {
    const idx = formData.roomOrder.indexOf(activeRoom);
    if (idx === formData.roomOrder.length - 1) {
      alert("All rooms done ✅");
    } else {
      setActiveRoom(formData.roomOrder[idx + 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStartValidation = () => {
    updateRequestStatus(request.id, "in_progress", { start_time: new Date().toISOString() });
  };

  const handleComplete = () => {
    if (confirm("Mark this validation as completed?")) {
      updateRequestStatus(request.id, "validation_done", { 
        end_time: new Date().toISOString(), 
        validation_data: formData 
      });
      alert("Validation marked as completed! You can now generate the report.");
    }
  };

  const handleOnHold = () => {
    const reason = prompt("Reason for putting validation on hold?");
    if (reason) {
      updateRequestStatus(request.id, "on_hold", { on_hold_reason: reason });
      alert("Validation marked as on hold!");
      router.push("/validation-lead");
    }
  };

  const currentRoomData = formData.rooms[activeRoom];
  const progress = currentRoomData ? getRoomProgress(currentRoomData) : null;
  const globalProgress = getGlobalProgress(formData);

  const allRoomsDone = formData.roomOrder.every(r => getRoomProgress(formData.rooms[r]).percent === 100);
  const isFullyComplete = allRoomsDone && globalProgress.percent === 100;
  // Support legacy "completed" status for older requests
  const isValidationDone = request.status === "validation_done" || request.status === "report_generated" || request.status === "completed" as any;

  const handleBack = () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    const roleMap: Record<string, string> = {
      admin: "/admin",
      validation_manager: "/manager",
      designer: "/designer",
      validation_lead: "/validation-lead",
    };
    router.push(roleMap[currentUser.role] || "/validation-lead");
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header with request info */}
      <div className="bg-livspace-blue text-white p-4 sm:p-6">
        <button onClick={handleBack} className="flex items-center gap-1 text-white/70 text-xs mb-3 hover:text-white">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </button>
        <h1 className="text-xl font-bold">{request.customer_name}</h1>
        <div className="flex flex-wrap gap-3 text-xs text-white/70 mt-1">
          <span>PID: {request.pid}</span>
          <span>•</span>
          <span>{city?.name}</span>
          <span>•</span>
          <span>{request.society_name} — {request.flat_no}</span>
          <span>•</span>
          <span>Requested by: {requester?.full_name}</span>
        </div>
        {request.special_instructions && (
          <div className="mt-3 p-2 bg-white/10 rounded-lg text-xs text-white/90">
            📝 {request.special_instructions}
          </div>
        )}
      </div>

      <div className="container py-6 space-y-4">
        {!request.start_time ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-livspace-gray-200 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-livspace-dark">Ready to begin?</h2>
            <p className="text-sm text-livspace-gray-500">Tap below to log your start time and unlock the validation form.</p>
            <button
              onClick={handleStartValidation}
              className="px-8 py-3 bg-livspace-blue text-white rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-lg shadow-livspace-blue/20"
            >
              Start Validation
            </button>
          </div>
        ) : (
          <>
            {/* Society Constraints */}
            <div className="bg-white border border-livspace-gray-200 rounded-2xl p-4 shadow-sm">
              <Accordion 
                title="Global Building & Society Constraints" 
                badge={`${globalProgress.answered}/${globalProgress.total} answered (${globalProgress.percent}%)`}
              >
                <SocietyConstraintsSection />
              </Accordion>
            </div>

        {/* Room Tabs */}
        <div className="bg-white border border-livspace-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.roomOrder.map((r) => {
              const rd = formData.rooms[r];
              const prog = rd ? getRoomProgress(rd) : { percent: 0 };
              return (
                <div key={r} className="relative group/tab">
                  <button
                    onClick={() => setActiveRoom(r)}
                    className={cn(
                      "px-3 py-2 pr-9 rounded-xl border text-xs font-bold transition-all relative",
                      activeRoom === r
                        ? "bg-livspace-blue text-white border-livspace-blue"
                        : "bg-white text-livspace-gray-600 border-livspace-gray-200 hover:border-livspace-blue"
                    )}
                  >
                    {r}
                    {prog.percent > 0 && prog.percent < 100 && <span className="ml-1.5 text-[9px] opacity-70">{prog.percent}%</span>}
                    {prog.percent === 100 && <span className="ml-1.5 text-[9px]">✓</span>}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete the "${r}" room? All captured data for this room will be lost.`)) {
                        deleteRoom(r);
                      }
                    }}
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all",
                      activeRoom === r 
                        ? "bg-white/20 text-white hover:bg-white/40" 
                        : "bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700"
                    )}
                    title="Delete room"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New room name..."
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRoom()}
              className="flex-1 border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
            />
            <button onClick={handleAddRoom} className="px-3 py-2 bg-livspace-dark text-white rounded-lg">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Room Content */}
        {currentRoomData && progress && (
          <div className="bg-white border border-livspace-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-livspace-dark">
                {activeRoom}{" "}
                <span className="text-sm font-normal text-livspace-gray-400">
                  ({progress.percent}% complete)
                </span>
              </h3>
              <div className="mt-2 h-2 bg-livspace-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-livspace-blue transition-all duration-500 rounded-full" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>

            <Accordion title="Wall Questions" badge={`${WALL_QUESTIONS.filter((q) => currentRoomData.wallAnswers[q]?.value).length}/${WALL_QUESTIONS.length}`}>
              <WallQuestionsSection room={activeRoom} />
            </Accordion>

            <Accordion title="Room Questions" badge={`${ROOM_QUESTIONS.filter((q) => currentRoomData.roomAnswers[q]?.value).length}/${ROOM_QUESTIONS.length}`}>
              <RoomQuestionsSection room={activeRoom} />
            </Accordion>

            <Accordion title="Measurement Section" badge={`${MEASUREMENT_FIELDS.filter((f) => currentRoomData.measurements[f.key] !== undefined && currentRoomData.measurements[f.key] !== "").length}/${MEASUREMENT_FIELDS.length}`}>
              <MeasurementSection room={activeRoom} />
            </Accordion>

            <Accordion title="Site Photographs" badge={`${PHOTO_SURFACES.reduce((sum, s) => sum + (currentRoomData.photos[s]?.length || 0), 0)} photos`}>
              <PhotoSection room={activeRoom} />
            </Accordion>

            <button
              onClick={goToNextRoom}
              className="w-full btn-primary h-14 text-lg font-bold flex items-center justify-center gap-2 group shadow-lg shadow-livspace-orange/20"
            >
              {formData.roomOrder.indexOf(activeRoom) === formData.roomOrder.length - 1
                ? "All Rooms Done ✔"
                : `Next: ${formData.roomOrder[formData.roomOrder.indexOf(activeRoom) + 1]} →`}
            </button>
          </div>
        )}

        {/* Complete & Export */}
        {!isValidationDone ? (
          <div className="flex flex-col gap-4 bg-white border border-livspace-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div>
                <h3 className="font-bold text-livspace-dark text-lg">Finish Validation</h3>
                <p className="text-sm text-livspace-gray-500 mt-1">Ready to finalize this site validation?</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 text-white rounded-xl font-bold transition-all shadow-lg bg-green-600 hover:bg-green-700 hover:scale-105"
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark Validation Complete
                </button>
                <button
                  onClick={handleOnHold}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-red-600 border border-red-200 bg-red-50 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                >
                  <PauseCircle className="w-4 h-4" />
                  Mark On Hold
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-emerald-800">Validation Completed!</h3>
              <p className="text-sm text-emerald-600">All data has been captured successfully.</p>
            </div>
            <button 
              onClick={() => {
                updateRequestStatus(request.id, "report_generated");
                router.push(`/reports/${request.id}`);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-livspace-blue text-white rounded-xl font-bold text-sm hover:bg-blue-800 transition-colors shadow-lg"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
