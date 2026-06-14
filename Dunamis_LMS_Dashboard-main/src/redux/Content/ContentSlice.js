import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getStoredToken } from "../../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Admin-only mutations on the backend; send the bearer token.
const authHeader = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Fetch all content
export const fetchAllContent = createAsyncThunk(
  "content/fetchAllContent",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/content/get-all-content`);
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Fetch content by ID
export const fetchContentById = createAsyncThunk(
  "content/fetchContentById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/content/${id}`);
      return response.data.content;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Create content
export const createContent = createAsyncThunk(
  "content/createContent",
  async (contentData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/content/create`,
        contentData,
        { headers: authHeader() }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Update content
export const updateContent = createAsyncThunk(
  "content/updateContent",
  async ({ id, contentData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/content/${id}`,
        contentData,
        { headers: authHeader() }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Delete content
export const deleteContent = createAsyncThunk(
  "content/deleteContent",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}/content/${id}`, { headers: authHeader() });
      return id; // Return the id to update the state after deletion
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Add module to content
export const addModuleToContent = createAsyncThunk(
  "content/addModuleToContent",
  async ({ id, moduleData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/content/${id}/add-module`,
        moduleData,
        { headers: authHeader() }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Add lesson to module
export const addLessonToModule = createAsyncThunk(
  "content/addLessonToModule",
  async ({ id, moduleId, lessonData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/content/${id}/${moduleId}/add-lesson`,
        lessonData,
        { headers: authHeader() }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Add topic to lesson
export const addTopicToLesson = createAsyncThunk(
  "content/addTopicToLesson",
  async ({ id, moduleId, lessonId, topicData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/content/${id}/${moduleId}/${lessonId}/add-topic`,
        topicData,
        { headers: authHeader() }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const contentSlice = createSlice({
  name: "content",
  initialState: {
    contentList: [],
    content: null,
    loading: false,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      // Fetch all content
      .addCase(fetchAllContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllContent.fulfilled, (state, action) => {
        state.loading = false;
        state.contentList = action.payload.contents;
      })

      .addCase(fetchAllContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch content by ID
      .addCase(fetchContentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContentById.fulfilled, (state, action) => {
        state.loading = false;
        state.content = action.payload; 
      })
      .addCase(fetchContentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Create content
      .addCase(createContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContent.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.content) {
          state.contentList.unshift(action.payload.content);
        }
      })
      .addCase(createContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Update content
      .addCase(updateContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContent.fulfilled, (state, action) => {
        state.loading = false;
        const updatedContent = action.payload?.content;
        if (!updatedContent) return;
        const index = state.contentList.findIndex(
          (content) => content._id === updatedContent._id
        );
        if (index >= 0) {
          state.contentList[index] = updatedContent;
        }
        if (state.content?._id === updatedContent._id) {
          state.content = updatedContent;
        }
      })
      .addCase(updateContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Delete content
      .addCase(deleteContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteContent.fulfilled, (state, action) => {
        state.loading = false;
        state.contentList = state.contentList.filter(
          (content) => content._id !== action.payload
        );
        if (state.content?._id === action.payload) {
          state.content = null;
        }
      })
      .addCase(deleteContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Add module to content
      .addCase(addModuleToContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addModuleToContent.fulfilled, (state, action) => {
        state.loading = false;
        if (state.content) {
          state.content.modules.push(action.payload); // Add module to selected content
        }
      })
      .addCase(addModuleToContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Add lesson to module
      .addCase(addLessonToModule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addLessonToModule.fulfilled, (state, action) => {
        state.loading = false;
        const module = state.content?.modules.find(
          (mod) => mod.id === action.payload.moduleId
        );
        if (module) {
          module.lessons.push(action.payload); // Add lesson to module
        }
      })
      .addCase(addLessonToModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Add topic to lesson
      .addCase(addTopicToLesson.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTopicToLesson.fulfilled, (state, action) => {
        state.loading = false;
        const lesson = state.content?.modules
          .flatMap((module) => module.lessons)
          .find((lesson) => lesson.id === action.payload.lessonId);

        if (lesson) {
          lesson.topics.push(action.payload); // Add topic to lesson
        }
      })
      .addCase(addTopicToLesson.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default contentSlice.reducer;
