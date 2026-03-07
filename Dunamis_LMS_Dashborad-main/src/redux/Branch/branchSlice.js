import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Get all branches
export const fetchAllBranches = createAsyncThunk(
  "branch/fetchAll",
  async (_, thunkAPI) => {
    try {
      const res = await fetch(`${BASE_URL}/branch/get-all-branch`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch branches");
      }
      return data.branches;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Create a new branch
export const createBranch = createAsyncThunk(
  "branch/create",
  async (branchData, thunkAPI) => {
    try {
      // branchData should be a FormData instance
      const res = await fetch(`${BASE_URL}/branch/create`, {
        method: "POST",
        body: branchData, // pass FormData directly
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to create branch");
      }
      return data.branch;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Get a branch by ID
export const fetchBranchById = createAsyncThunk(
  "branch/fetchById",
  async (id, thunkAPI) => {
    try {
      const res = await fetch(`${BASE_URL}/branch/${id}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch branch");
      }
      return data.branch;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Get branch managers
export const fetchBranchManagers = createAsyncThunk(
  "branch/fetchManagers",
  async (_, thunkAPI) => {
    try {
      const res = await fetch(`${BASE_URL}/branch/managers`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch branch managers");
      }
      return data.managers; // Assuming the response contains managers data
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Update a branch
export const updateBranch = createAsyncThunk(
  "branch/update",
  async ({ id, branchData }, thunkAPI) => {
    try {
      const res = await fetch(`${BASE_URL}/branch/${id}`, {
        method: "PUT",
        body: branchData,
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update branch");
      }
      return data.branch; // Assuming the response contains the updated branch
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Delete a branch
export const deleteBranch = createAsyncThunk(
  "branch/delete",
  async (id, thunkAPI) => {
    try {
      const res = await fetch(`${BASE_URL}/branch/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to delete branch");
      }
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

const branchSlice = createSlice({
  name: "branch",
  initialState: {
    loading: false,
    error: null,
    listStatus: "idle",
    branches: [],
    managers: [],
    branch: null,
    selectedBranch: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // Fetch All Branches
    builder
      .addCase(fetchAllBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.listStatus = "loading";
      })
      .addCase(fetchAllBranches.fulfilled, (state, action) => {
        state.loading = false;
        state.listStatus = "succeeded";
        state.branches = action.payload;
      })
      .addCase(fetchAllBranches.rejected, (state, action) => {
        state.loading = false;
        state.listStatus = "failed";
        state.error = action.payload || "Failed to fetch branches";
      })
      // Create Branch
      .addCase(createBranch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBranch.fulfilled, (state, action) => {
        state.loading = false;
        state.branch = action.payload;
        state.branches.push(action.payload); // Add the newly created branch
      })
      .addCase(createBranch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create branch";
      })
      // Fetch Branch Managers
      .addCase(fetchBranchManagers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranchManagers.fulfilled, (state, action) => {
        state.loading = false;
        state.managers = action.payload;
      })
      .addCase(fetchBranchManagers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch branch managers";
      })
      // Update Branch
      .addCase(updateBranch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBranch.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.branches.findIndex(
          (branch) => branch._id === action.payload._id
        );
        if (index !== -1) {
          state.branches[index] = action.payload; // Update the branch in the state
        }
        if (state.selectedBranch?._id === action.payload._id) {
          state.selectedBranch = action.payload;
        }
      })
      .addCase(updateBranch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update branch";
      })
      // Delete Branch
      .addCase(deleteBranch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBranch.fulfilled, (state, action) => {
        state.loading = false;
        state.branches = state.branches.filter(
          (branch) => branch._id !== action.payload
        ); // Remove the deleted branch
      })
      .addCase(deleteBranch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete branch";
      })
      .addCase(fetchBranchById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranchById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedBranch = action.payload; 
      })
      .addCase(fetchBranchById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch branch";
      });
  },
});

export default branchSlice.reducer;
