import { create } from 'zustand';
import type { Employee } from '../types/hrms';
import { employeeAPI } from '../services/api';

interface EmployeeState {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  fetchEmployees: (params?: { search?: string; category?: string; is_active?: boolean }) => Promise<void>;
  addEmployee: (data: Partial<Employee>) => Promise<Employee | null>;
  updateEmployee: (id: string, data: Partial<Employee> & { category_change_reason?: string }) => Promise<Employee | null>;
  deleteEmployee: (id: string) => Promise<boolean>;
  refreshEmployee: (id: string) => Promise<void>;
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  loading: false,
  error: null,

  fetchEmployees: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await employeeAPI.getAll(params);
      set({ employees: Array.isArray(data) ? data : [], loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch employees';
      set({ error: message, loading: false });
    }
  },

  addEmployee: async (data) => {
    set({ loading: true, error: null });
    try {
      const newEmp = await employeeAPI.create(data);
      set((state) => ({
        employees: [...state.employees, newEmp],
        loading: false,
      }));
      return newEmp;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add employee';
      set({ error: message, loading: false });
      return null;
    }
  },

  updateEmployee: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await employeeAPI.update(id, data);
      set((state) => ({
        employees: state.employees.map((emp) => (emp.id === id ? { ...emp, ...updated } : emp)),
        loading: false,
      }));
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update employee';
      set({ error: message, loading: false });
      return null;
    }
  },

  deleteEmployee: async (id) => {
    set({ loading: true, error: null });
    try {
      await employeeAPI.delete(id);
      set((state) => ({
        employees: state.employees.filter((emp) => emp.id !== id),
        loading: false,
      }));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete employee';
      set({ error: message, loading: false });
      return false;
    }
  },

  refreshEmployee: async (id) => {
    try {
      const updated = await employeeAPI.getById(id);
      if (updated) {
        set((state) => ({
          employees: state.employees.map((emp) => (emp.id === id ? { ...emp, ...updated } : emp)),
        }));
      }
    } catch {
      // Silently fail - not critical
    }
  },
}));
