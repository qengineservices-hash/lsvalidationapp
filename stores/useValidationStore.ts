import { create } from "zustand";
import { persist } from "zustand/middleware";

// ===================================================
// QUESTION & MEASUREMENT CONFIG (from HTML PoC)
// ===================================================

export const SOCIETY_QUESTIONS = [
  // General
  { key: "propertyType", label: "What is the type of property?", category: "General", type: "mcq", options: ["Bare Shell", "Property Less than 15 yrs", "Property More than 15 yrs"] },
  { key: "bhk", label: "What is the BHK?", category: "General", type: "text" },
  // Soft Cost Identification
  { key: "serviceLiftUsage", label: "Service lift usage allowed?", category: "Soft Cost Identification", type: "mcq", options: ["Yes,Heavy material movement allowed", "Yes,Heavy material movement Not allowed", "No"] },
  { key: "loadingArea", label: "Debris/material loading area present?", category: "Soft Cost Identification", type: "mcq", options: ["Within 30 ft", "More than 30 ft", "Not present"] },
  { key: "societyDemolish", label: "What kind of demolition is allowed?", category: "Soft Cost Identification", type: "mcq", options: ["Mechanical", "Manual", "Mechanical or Manual"] },
  { key: "scaffolding", label: "Will there be a requirement of scaffolding?", category: "Soft Cost Identification", type: "mcq", options: ["Yes", "No"] },
  // Access & Delivery
  { key: "liftSize", label: "What is the size of service lift?", category: "Access and Delivery Constraints", type: "text" },
  { key: "vehicleEntry", label: "Vehicle entry allowed inside the premises?", category: "Access and Delivery Constraints", type: "mcq", options: ["Yes,small size", "Yes,medium size", "Yes,large size", "No"] },
  { key: "staircaseSize", label: "What is the available staircase width and height?", category: "Access and Delivery Constraints", type: "text" },
  // Execution Constraints
  { key: "waterPoint", label: "Is there an active water supply point at site location?", category: "Execution Constraints", type: "mcq", options: ["Yes", "No"] },
  { key: "electricPoint", label: "Is there an active power supply at site location?", category: "Execution Constraints", type: "mcq", options: ["Yes", "No"] },
  { key: "workNOC", label: "Any NOC required to do internal modifications to the property?", category: "Execution Constraints", type: "mcq", options: ["Yes", "No"] },
  { key: "societyWorktimings", label: "Permissible work days and timings", category: "Execution Constraints", type: "textarea" },
  // Material
  { key: "societyRestrictions", label: "Other restrictions on material/specification", category: "Material Specification Constraint", type: "textarea" },
];

export const WALL_QUESTIONS = [
  "Is the wall a load-bearing wall/Mivan Construction/Sheer wall? Mark in the structural layout as well",
  "Is the wall dry wall/Gypsum wall? Mark in the structural layout as well",
  "Are there major cracks that require structural repair? Mark in the structural layout as well",
  "Are there Hairline crack/minor cracks/loose plaster requiring re plastering? Mark in the structural layout as well",
  "Does the existing wall surface have undulations or uneven surface? Capture measurements in measurement section",
  "Are there evidence of water seepage,dampness that require waterproofing treatment? Mark on the structural layout as well and inform Cx",
  "Is there a suitable location for core cut available?",
  "Are existing switch/socket in working condition? Capture Wall wise Modules and configuration in the comments and mark on layout",
  "Is there a AC point(low side works) provided?",
  "Can split AC be installed post false ceiling w/o pockets? Capture Wall wise Door/Window Soffit to Ceiling measurement in measurement section",
  "Is panelling/pelmet required to be done for AC installation?",
  "Are there any darker shade on the wall?",
  "Is the existing paint in good condition, without excessive peeling, flaking, or bubbling?",
  "Do we need to remove skirting for wardrobe installation?",
];

export const ROOM_QUESTIONS = [
  "Existing flooring in Good condition with appropriate slope/levels? Capture Floor levels in Measurement Section",
  "Can we do tile on tile installation?",
  "Are existing walls in plumb/line and level? Capture Room diagonals in Measurement Section",
  "Is there level difference in the True ceiling? Capture Floor to ceiling measurement in 4 corners and center in measurement section",
  "Are there any issues with the existing false ceiling that require removal and replacement?",
  "Are there visible undulations/uneven surface on the True Ceiling? Mention treatment required in comments",
  "Are there any utilities (sprinkler pipes, plumbing line, ducts) or cross beams running on the ceiling? Capture the beam bottom to floor measurement(in mm), Sprinkler head to Floor measurement(in mm) and provide in the comments",
  "Is there any evidence of water leaks or moisture damage on the existing true ceiling? Mark on the layout as well and inform Cx",
  "Are the existing doors and door frame in good condition?",
  "Are the existing windows and window frames in good condition?",
  "Is existing wiring in good condition and does not require replacement?",
  "Does the existing circuit have sufficient load capacity or will require change or new circuit?",
  "Are there any issues with the existing plumbing lines, such as leaks etc that require replacement or repair?",
  "Are existing plumbing lines old and outdated and may not be compatible with modern fixtures?",
  "Is the main inlet valve accessible?",
  "Is there sufficient space to provide Shower cubicle?",
  "Is it possible to relocate the WC, without any modifications to external pipeline/drain line?",
];

export const MEASUREMENT_FIELDS = [
  // Floor to Ceiling
  { label: "Floor to Ceiling - Corner 1", key: "fc1", group: "Floor to Ceiling" },
  { label: "Floor to Ceiling - Corner 2", key: "fc2", group: "Floor to Ceiling" },
  { label: "Floor to Ceiling - Corner 3", key: "fc3", group: "Floor to Ceiling" },
  { label: "Floor to Ceiling - Corner 4", key: "fc4", group: "Floor to Ceiling" },
  { label: "Floor to Ceiling - Center", key: "fc5", group: "Floor to Ceiling" },
  // Room Diagonals
  { label: "Room Diagonal 1", key: "diag1", group: "Room Diagonals" },
  { label: "Room Diagonal 2", key: "diag2", group: "Room Diagonals" },
  // Wall Undulation
  { label: "Wall Undulation NW", key: "undNW", group: "Wall Undulation" },
  { label: "Wall Undulation EW", key: "undEW", group: "Wall Undulation" },
  { label: "Wall Undulation SW", key: "undSW", group: "Wall Undulation" },
  { label: "Wall Undulation WW", key: "undWW", group: "Wall Undulation" },
  // Ceiling Utilities
  { label: "Beam Bottom to Floor (mm)", key: "beamFloor", group: "Ceiling Utilities" },
  { label: "Sprinkler Head to Floor (mm)", key: "sprinklerFloor", group: "Ceiling Utilities" },
  // Door Soffit
  { label: "Door Soffit to Ceiling - NW", key: "soffitNW", group: "Door Soffit to Ceiling" },
  { label: "Door Soffit to Ceiling - EW", key: "soffitEW", group: "Door Soffit to Ceiling" },
  { label: "Door Soffit to Ceiling - SW", key: "soffitSW", group: "Door Soffit to Ceiling" },
  { label: "Door Soffit to Ceiling - WW", key: "soffitWW", group: "Door Soffit to Ceiling" },
  // Sunken Slab
  { label: "Sunken slab depth", key: "sunkslabdepth", group: "Sunken Slab" },
  // Window Soffit
  { label: "Window Soffit to Ceiling - NW", key: "winSoffitNW", group: "Window Soffit to Ceiling" },
  { label: "Window Soffit to Ceiling - EW", key: "winSoffitEW", group: "Window Soffit to Ceiling" },
  { label: "Window Soffit to Ceiling - SW", key: "winSoffitSW", group: "Window Soffit to Ceiling" },
  { label: "Window Soffit to Ceiling - WW", key: "winSoffitWW", group: "Window Soffit to Ceiling" },
];

export const WALLS = ["NW", "EW", "SW", "WW"] as const;
export const PHOTO_SURFACES = ["NW", "EW", "SW", "WW", "Ceiling", "Floor"] as const;
export const DEFAULT_ROOMS = ["Living Room", "Kitchen", "Bedroom 1", "Bedroom 2", "Bathroom 1", "Bathroom 2", "Balcony"];

// ===================================================
// TYPES
// ===================================================

export interface WallAnswer {
  value: "Yes" | "No" | "NA" | "";
  walls: string[];       // Which walls (NW, EW, SW, WW)
  comment: string;
}

export interface RoomAnswer {
  value: "Yes" | "No" | "NA" | "";
  comment: string;
}

export interface RoomPhoto {
  id: string;
  dataUrl: string; // base64
}

export interface RoomData {
  id: string;
  name: string;
  wallAnswers: Record<string, WallAnswer>;       // key = question text
  roomAnswers: Record<string, RoomAnswer>;        // key = question text
  measurements: Record<string, number | "">;      // key = field key
  photos: Record<string, RoomPhoto[]>;            // key = surface (NW/EW/SW/WW/Ceiling/Floor)
}

interface ValidationState {
  // Navigation
  activeRoom: string;            // currently shown room name
  accordionState: Record<string, boolean>;  // accordion open/close state

  // Data
  formData: {
    project: {
      pid: string;
      customerName: string;
      city: string;
      address: string;
      society: string;
      flat: string;
      floorNo: string;
    };
    society: Record<string, string>;
    roomOrder: string[];
    rooms: Record<string, RoomData>;
  };

  // Actions — Navigation
  setActiveRoom: (room: string) => void;
  toggleAccordion: (key: string) => void;

  // Actions — Project & Society
  updateProject: (data: Partial<ValidationState["formData"]["project"]>) => void;
  updateSociety: (key: string, value: string) => void;

  // Actions — Rooms
  addRoom: (name: string) => void;

  // Actions — Wall Questions
  setWallAnswer: (room: string, question: string, value: "Yes" | "No" | "NA") => void;
  toggleWallSelection: (room: string, question: string, wall: string) => void;
  setWallComment: (room: string, question: string, comment: string) => void;
  applyAllWalls: (room: string, value: "Yes" | "No") => void;

  // Actions — Room Questions
  setRoomAnswer: (room: string, question: string, value: "Yes" | "No" | "NA") => void;
  setRoomComment: (room: string, question: string, comment: string) => void;

  // Actions — Measurements
  setMeasurement: (room: string, key: string, value: number | "") => void;

  // Actions — Photos
  addPhoto: (room: string, surface: string, photo: RoomPhoto) => void;
  deletePhoto: (room: string, surface: string, photoId: string) => void;
  updatePhoto: (room: string, surface: string, photoId: string, newDataUrl: string) => void;

  // Reset
  reset: () => void;
}

function createEmptyRoom(name: string): RoomData {
  const photos: Record<string, RoomPhoto[]> = {};
  PHOTO_SURFACES.forEach((s) => { photos[s] = []; });
  return {
    id: Math.random().toString(36).substring(2, 9),
    name,
    wallAnswers: {},
    roomAnswers: {},
    measurements: {},
    photos,
  };
}

function createInitialRooms(): Record<string, RoomData> {
  const rooms: Record<string, RoomData> = {};
  DEFAULT_ROOMS.forEach((name) => {
    rooms[name] = createEmptyRoom(name);
  });
  return rooms;
}

export const useValidationStore = create<ValidationState>()(
  persist(
    (set, get) => ({
      activeRoom: DEFAULT_ROOMS[0],
      accordionState: {},

      formData: {
        project: { pid: "", customerName: "", city: "", address: "", society: "", flat: "", floorNo: "" },
        society: {},
        roomOrder: [...DEFAULT_ROOMS],
        rooms: createInitialRooms(),
      },

      // Navigation
      setActiveRoom: (room) => set({ activeRoom: room }),
      toggleAccordion: (key) =>
        set((s) => ({
          accordionState: { ...s.accordionState, [key]: !s.accordionState[key] },
        })),

      // Project & Society
      updateProject: (data) =>
        set((s) => ({
          formData: { ...s.formData, project: { ...s.formData.project, ...data } },
        })),
      updateSociety: (key, value) =>
        set((s) => ({
          formData: { ...s.formData, society: { ...s.formData.society, [key]: value } },
        })),

      // Rooms
      addRoom: (name) =>
        set((s) => ({
          formData: {
            ...s.formData,
            roomOrder: [...s.formData.roomOrder, name],
            rooms: { ...s.formData.rooms, [name]: createEmptyRoom(name) },
          },
        })),

      // Wall Questions
      setWallAnswer: (room, question, value) =>
        set((s) => {
          const r = s.formData.rooms[room];
          if (!r) return s;
          const prev = r.wallAnswers[question] || { value: "", walls: [], comment: "" };
          return {
            formData: {
              ...s.formData,
              rooms: {
                ...s.formData.rooms,
                [room]: {
                  ...r,
                  wallAnswers: { ...r.wallAnswers, [question]: { ...prev, value } },
                },
              },
            },
          };
        }),
      toggleWallSelection: (room, question, wall) =>
        set((s) => {
          const r = s.formData.rooms[room];
          if (!r) return s;
          const prev = r.wallAnswers[question] || { value: "", walls: [], comment: "" };
          const walls = prev.walls.includes(wall)
            ? prev.walls.filter((w) => w !== wall)
            : [...prev.walls, wall];
          return {
            formData: {
              ...s.formData,
              rooms: {
                ...s.formData.rooms,
                [room]: {
                  ...r,
                  wallAnswers: { ...r.wallAnswers, [question]: { ...prev, walls } },
                },
              },
            },
          };
        }),
      setWallComment: (room, question, comment) =>
        set((s) => {
          const r = s.formData.rooms[room];
          if (!r) return s;
          const prev = r.wallAnswers[question] || { value: "", walls: [], comment: "" };
          return {
            formData: {
              ...s.formData,
              rooms: {
                ...s.formData.rooms,
                [room]: {
                  ...r,
                  wallAnswers: { ...r.wallAnswers, [question]: { ...prev, comment } },
                },
              },
            },
          };
        }),
      applyAllWalls: (room, value) =>
        set((s) => {
          const r = s.formData.rooms[room];
          if (!r) return s;
          const newAnswers = { ...r.wallAnswers };
          WALL_QUESTIONS.forEach((q) => {
            const prev = newAnswers[q] || { value: "", walls: [], comment: "" };
            newAnswers[q] = { ...prev, value };
          });
          return {
            formData: {
              ...s.formData,
              rooms: { ...s.formData.rooms, [room]: { ...r, wallAnswers: newAnswers } },
            },
          };
        }),

      // Room Questions
      setRoomAnswer: (room, question, value) =>
        set((s) => {
          const r = s.formData.rooms[room];
          if (!r) return s;
          const prev = r.roomAnswers[question] || { value: "", comment: "" };
          return {
            formData: {
              ...s.formData,
              rooms: {
                ...s.formData.rooms,
                [room]: {
                  ...r,
                  roomAnswers: { ...r.roomAnswers, [question]: { ...prev, value } },
                },
              },
            },
          };
        }),
      setRoomComment: (room, question, comment) =>
        set((s) => {
          const r = s.formData.rooms[room];
          if (!r) return s;
          const prev = r.roomAnswers[question] || { value: "", comment: "" };
          return {
            formData: {
              ...s.formData,
              rooms: {
                ...s.formData.rooms,
                [room]: {
                  ...r,
                  roomAnswers: { ...r.roomAnswers, [question]: { ...prev, comment } },
                },
              },
            },
          };
        }),

      // Measurements
      setMeasurement: (room, key, value) =>
        set((s) => {
          const r = s.formData.rooms[room];
          if (!r) return s;
          return {
            formData: {
              ...s.formData,
              rooms: {
                ...s.formData.rooms,
                [room]: { ...r, measurements: { ...r.measurements, [key]: value } },
              },
            },
          };
        }),

      // Photos
      addPhoto: (room, surface, photo) =>
        set((s) => {
          const r = s.formData.rooms[room];
          if (!r) return s;
          return {
            formData: {
              ...s.formData,
              rooms: {
                ...s.formData.rooms,
                [room]: {
                  ...r,
                  photos: { ...r.photos, [surface]: [...(r.photos[surface] || []), photo] },
                },
              },
            },
          };
        }),
      deletePhoto: (room, surface, photoId) =>
        set((s) => {
          const r = s.formData.rooms[room];
          if (!r) return s;
          return {
            formData: {
              ...s.formData,
              rooms: {
                ...s.formData.rooms,
                [room]: {
                  ...r,
                  photos: {
                    ...r.photos,
                    [surface]: (r.photos[surface] || []).filter((p) => p.id !== photoId),
                  },
                },
              },
            },
          };
        }),
      updatePhoto: (room, surface, photoId, newDataUrl) =>
        set((s) => {
          const r = s.formData.rooms[room];
          if (!r) return s;
          return {
            formData: {
              ...s.formData,
              rooms: {
                ...s.formData.rooms,
                [room]: {
                  ...r,
                  photos: {
                    ...r.photos,
                    [surface]: (r.photos[surface] || []).map((p) =>
                      p.id === photoId ? { ...p, dataUrl: newDataUrl } : p
                    ),
                  },
                },
              },
            },
          };
        }),

      // Reset
      reset: () =>
        set({
          activeRoom: DEFAULT_ROOMS[0],
          accordionState: {},
          formData: {
            project: { pid: "", customerName: "", city: "", address: "", society: "", flat: "", floorNo: "" },
            society: {},
            roomOrder: [...DEFAULT_ROOMS],
            rooms: createInitialRooms(),
          },
        }),
    }),
    { 
      name: "ls-validation-storage",
      version: 2,
      migrate: (persisted: any, version: number) => {
        // If old version or corrupted data, reset to fresh state
        if (version < 2 || !persisted?.formData?.roomOrder) {
          return {
            activeRoom: DEFAULT_ROOMS[0],
            accordionState: {},
            formData: {
              project: { pid: "", customerName: "", city: "", address: "", society: "", flat: "", floorNo: "" },
              society: {},
              roomOrder: [...DEFAULT_ROOMS],
              rooms: createInitialRooms(),
            },
          };
        }
        return persisted;
      },
    }
  )
);
