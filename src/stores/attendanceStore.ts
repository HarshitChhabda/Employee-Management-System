import { create } from 'zustand';
import type { AttendanceRecord } from '../types/hrms';
import { attendanceAPI } from '../services/api';

interface AttendanceState {
  attendanceData: Record<string, string>; // key: `${employee_id}_${date}` -> status
  loading: boolean;
  error: string | null;
  fetchAttendance: (params?: { date?: string; month?: number; year?: number; employee_id?: string }) => Promise<void>;
  upsertAttendance: (records: { employee_id: string; date: string; status: string; remarks?: string }[]) => Promise<{ success: boolean; errors?: Array<{ employee_id: string; date: string; error: string }>; savedCount?: number } | null>;
  setLocalStatus: (employeeId: string, dateStr: string, status: string) => void;
  clearAttendance: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  attendanceData: {},
  loading: false,
  error: null,

  fetchAttendance: async (params) => {
    set({ loading: true, error: null });
    try {
      let data: AttendanceRecord[] = [];
      if (params?.date) {
        data = await attendanceAPI.getByDate(params.date);
      } else if (params?.month && params?.year) {
        data = await attendanceAPI.getByMonth(params.month, params.year);
      } else if (params?.employee_id) {
        data = await attendanceAPI.getByEmployee(params.employee_id);
      } else {
        data = await attendanceAPI.getByMonth(new Date().getMonth() + 1, new Date().getFullYear());
      }

      const mappedData: Record<string, string> = {};
      if (Array.isArray(data)) {
        data.forEach((rec) => {
          mappedData[`${rec.employee_id}_${rec.date}`] = rec.status;
        });
      }

      set({ attendanceData: mappedData, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch attendance';
      set({ error: message, loading: false });
    }
  },

  upsertAttendance: async (records) => {
    set({ loading: true, error: null });
    try {
      const result = await attendanceAPI.upsert(records);
      // Refresh local data after successful save
      if (result.success) {
        const currentData = { ...get().attendanceData };
        for (const rec of records) {
          const key = `${rec.employee_id}_${rec.date}`;
          if (rec.status) {
            currentData[key] = rec.status;
          } else {
            delete currentData[key];
          }
        }
        set({ attendanceData: currentData, loading: false });
      }
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save attendance';
      set({ error: message, loading: false });
      return null;
    }
  },

  setLocalStatus: (employeeId, dateStr, status) => {
    set((state) => ({
      attendanceData: {
        ...state.attendanceData,
        [`${employeeId}_${dateStr}`]: status,
      },
    }));
  },

  clearAttendance: () => {
    set({ attendanceData: {}, loading: false, error: null });
  },
}));
