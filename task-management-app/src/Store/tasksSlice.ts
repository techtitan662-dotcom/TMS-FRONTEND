import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import type { Task } from '../Types/Types';
import { taskService } from '../Services/Task.services';
import type { RootState } from './store';

const tasksAdapter = createEntityAdapter<Task>();

type TasksStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface TasksState {
  status: TasksStatus;
  error: string | null;
  lastFetchedAt: number | null;
}

const loadCachedTasks = (): Task[] => {
  try {
    const raw = localStorage.getItem('tasks_cache');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
};

const initialState = tasksAdapter.setAll(
  tasksAdapter.getInitialState<TasksState>({
    status: 'idle',
    error: null,
    lastFetchedAt: null,
  }),
  loadCachedTasks()
);

const FETCH_TTL_MS = 60_000;

export const fetchTasks = createAsyncThunk<
  Task[],
  { force?: boolean } | void,
  { state: RootState }
>(
  'tasks/fetchTasks',
  async (_arg: { force?: boolean } | void) => {
    const response = await taskService.getAllTasks();

    if (!response?.success || !Array.isArray(response.data)) {
      throw new Error(response?.message || 'Failed to fetch tasks');
    }

    const incoming = response.data as Task[];

    // Normalize ids so downstream code can rely on `task.id`
    return incoming.map((t: any) => {
      const id = (t?.id || t?._id || '').toString();
      return {
        ...t,
        id: id || t?.id,
      } as Task;
    });
  },
  {
    condition: (arg, { getState }) => {
      const force = Boolean((arg as any)?.force);
      const state = getState();
      const tasks = state.tasks;

      if (force) return true;
      if (tasks.status === 'loading') return false;

      if (tasks.lastFetchedAt && Date.now() - tasks.lastFetchedAt < FETCH_TTL_MS) {
        return false;
      }

      return true;
    },
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    tasksReset: (state) => {
      tasksAdapter.removeAll(state);
      state.status = 'idle';
      state.error = null;
      state.lastFetchedAt = null;
    },
    taskAdded: (state, action: { payload: Task }) => {
      tasksAdapter.addOne(state, action.payload);
    },
    tasksAddedMany: (state, action: { payload: Task[] }) => {
      tasksAdapter.addMany(state, action.payload);
    },
    taskUpserted: (state, action: { payload: Task }) => {
      tasksAdapter.upsertOne(state, action.payload);
    },
    taskRemoved: (state, action: { payload: string }) => {
      tasksAdapter.removeOne(state, action.payload);
    },
    tasksSetAll: (state, action: { payload: Task[] }) => {
      tasksAdapter.setAll(state, action.payload);
      state.lastFetchedAt = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        tasksAdapter.setAll(state, action.payload);
        state.status = 'succeeded';
        state.lastFetchedAt = Date.now();
        try {
          localStorage.setItem('tasks_cache', JSON.stringify(action.payload));
        } catch {
          // ignore
        }
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch tasks';
      });
  },
});

export const { tasksReset, taskAdded, tasksAddedMany, taskUpserted, taskRemoved, tasksSetAll } = tasksSlice.actions;

export const tasksReducer = tasksSlice.reducer;

const selectTasksState = (state: RootState) => state.tasks;

export const {
  selectAll: selectAllTasks,
  selectById: selectTaskById,
  selectIds: selectTaskIds,
} = tasksAdapter.getSelectors(selectTasksState);

export const selectTasksStatus = (state: RootState) => state.tasks.status;
export const selectTasksError = (state: RootState) => state.tasks.error;
export const selectTasksLastFetchedAt = (state: RootState) => state.tasks.lastFetchedAt;
