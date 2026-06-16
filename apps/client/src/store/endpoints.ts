import {
  IConversation,
  IJob,
  IMessage,
  INotification,
  IPayment,
  IPost,
  ISubscription,
  IUser,
} from '@skillsphere/shared';
import { apiSlice } from './apiSlice';

export type ApiEnvelope<T = null> = {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
  errors?: { field: string; message: string }[];
};

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = LoginPayload & {
  firstName: string;
  lastName: string;
  role: 'user' | 'recruiter';
};
export type AuthResult = { user: IUser; accessToken: string };
export type SkillPayload = { name: string; level: 'beginner' | 'intermediate' | 'expert' };
export type ProfilePayload = Partial<IUser['profile']>;
export type JobPayload = {
  title: string;
  description: string;
  company: string;
  location: string;
  isRemote: boolean;
  jobType: IJob['jobType'];
  skills: string[];
  salary?: { min?: number; max?: number; currency: string };
};
export type PlatformStats = {
  metrics: {
    totalUsers: number;
    premiumUsers: number;
    recruiters: number;
    totalPosts: number;
    totalJobs: number;
    totalMessages: number;
    totalRevenue: number;
    totalTransactions: number;
  };
  userGrowth: { month: string; users: number }[];
};

export const unwrapList = <T>(response?: ApiEnvelope<T[]>): T[] => response?.data ?? [];
export const unwrapMeta = (response?: ApiEnvelope<unknown>) => response?.meta;

export const extendedApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiEnvelope<AuthResult>, LoginPayload>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    register: builder.mutation<ApiEnvelope<{ message: string }>, RegisterPayload>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    forgotPassword: builder.mutation<ApiEnvelope, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation<ApiEnvelope, { token: string; password: string }>({
      query: ({ token, password }) => ({
        url: `/auth/reset-password/${token}`,
        method: 'POST',
        body: { password },
      }),
    }),
    verifyEmail: builder.query<ApiEnvelope, string>({
      query: (token) => `/auth/verify-email/${token}`,
    }),
    getMe: builder.query<ApiEnvelope<{ user: IUser }>, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    logoutSession: builder.mutation<ApiEnvelope, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['User'],
    }),
    updateProfile: builder.mutation<ApiEnvelope<{ user: IUser }>, ProfilePayload>({
      query: (body) => ({ url: '/users/profile', method: 'PUT', body }),
      invalidatesTags: ['User'],
    }),
    uploadAvatar: builder.mutation<ApiEnvelope<{ user: IUser }>, File>({
      query: (file) => {
        const body = new FormData();
        body.append('avatar', file);
        return { url: '/users/avatar', method: 'POST', body };
      },
      invalidatesTags: ['User'],
    }),
    uploadResume: builder.mutation<ApiEnvelope<{ user: IUser }>, File>({
      query: (file) => {
        const body = new FormData();
        body.append('resume', file);
        return { url: '/users/resume', method: 'POST', body };
      },
      invalidatesTags: ['User'],
    }),
    addSkill: builder.mutation<ApiEnvelope<{ user: IUser }>, SkillPayload>({
      query: (body) => ({ url: '/users/skills', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    removeSkill: builder.mutation<ApiEnvelope<{ user: IUser }>, string>({
      query: (skillName) => ({ url: `/users/skills/${encodeURIComponent(skillName)}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    searchUsers: builder.query<ApiEnvelope<IUser[]>, { q?: string; role?: string; page?: number; limit?: number }>({
      query: (params) => ({ url: '/users/search', params }),
      providesTags: ['User'],
    }),
    getRecommendations: builder.query<ApiEnvelope<{ users: IUser[] }>, void>({
      query: () => '/users/recommendations',
      providesTags: ['User'],
    }),
    followUser: builder.mutation<ApiEnvelope, string>({
      query: (id) => ({ url: `/users/${id}/follow`, method: 'POST' }),
      invalidatesTags: ['User'],
    }),
    getFeed: builder.query<ApiEnvelope<IPost[]>, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/posts', params }),
      providesTags: ['Post'],
    }),
    getSavedPosts: builder.query<ApiEnvelope<IPost[]>, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/posts/saved', params }),
      providesTags: ['Post'],
    }),
    getTrendingPosts: builder.query<ApiEnvelope<{ posts: IPost[] }>, void>({
      query: () => '/posts/trending',
      providesTags: ['Post'],
    }),
    createPost: builder.mutation<ApiEnvelope<{ post: IPost }>, { content: string; tags?: string[]; visibility?: string }>({
      query: (body) => ({ url: '/posts', method: 'POST', body }),
      invalidatesTags: ['Post'],
    }),
    togglePostLike: builder.mutation<ApiEnvelope<{ liked: boolean; likesCount: number }>, string>({
      query: (id) => ({ url: `/posts/${id}/like`, method: 'POST' }),
      invalidatesTags: ['Post'],
    }),
    togglePostSave: builder.mutation<ApiEnvelope<{ saved: boolean }>, string>({
      query: (id) => ({ url: `/posts/${id}/save`, method: 'POST' }),
      invalidatesTags: ['Post'],
    }),
    addComment: builder.mutation<ApiEnvelope, { postId: string; content: string; parentComment?: string }>({
      query: ({ postId, ...body }) => ({ url: `/posts/${postId}/comments`, method: 'POST', body }),
      invalidatesTags: ['Comment', 'Post'],
    }),
    getJobs: builder.query<ApiEnvelope<IJob[]>, { page?: number; limit?: number; q?: string; location?: string; isRemote?: boolean; jobType?: string; skills?: string }>({
      query: (params) => ({ url: '/jobs', params }),
      providesTags: ['Job'],
    }),
    createJob: builder.mutation<ApiEnvelope<{ job: IJob }>, JobPayload>({
      query: (body) => ({ url: '/jobs', method: 'POST', body }),
      invalidatesTags: ['Job'],
    }),
    applyToJob: builder.mutation<ApiEnvelope<{ job: IJob }>, { id: string; coverLetter?: string }>({
      query: ({ id, coverLetter }) => ({ url: `/jobs/${id}/apply`, method: 'POST', body: { coverLetter } }),
      invalidatesTags: ['Job'],
    }),
    toggleSaveJob: builder.mutation<ApiEnvelope<{ saved: boolean }>, string>({
      query: (id) => ({ url: `/jobs/${id}/save`, method: 'POST' }),
      invalidatesTags: ['Job'],
    }),
    getCandidateDashboard: builder.query<ApiEnvelope<{ jobs: IJob[] }>, void>({
      query: () => '/jobs/candidate/dashboard',
      providesTags: ['Job'],
    }),
    getRecruiterDashboard: builder.query<ApiEnvelope<{ jobs: IJob[] }>, void>({
      query: () => '/jobs/recruiter/dashboard',
      providesTags: ['Job'],
    }),
    getJobRecommendations: builder.query<ApiEnvelope<{ jobs: IJob[] }>, void>({
      query: () => '/jobs/recommendations',
      providesTags: ['Job'],
    }),
    getConversations: builder.query<ApiEnvelope<{ conversations: IConversation[] }>, void>({
      query: () => '/chat/conversations',
      providesTags: ['Conversation'],
    }),
    getMessages: builder.query<ApiEnvelope<IMessage[]>, { conversationId: string; page?: number; limit?: number }>({
      query: ({ conversationId, ...params }) => ({ url: `/chat/conversations/${conversationId}/messages`, params }),
      providesTags: ['Message'],
    }),
    sendMessage: builder.mutation<ApiEnvelope<{ message: IMessage }>, { conversationId: string; content: string; type?: string; fileUrl?: string }>({
      query: ({ conversationId, ...body }) => ({ url: `/chat/conversations/${conversationId}/messages`, method: 'POST', body }),
      invalidatesTags: ['Conversation', 'Message'],
    }),
    getNotifications: builder.query<ApiEnvelope<INotification[]>, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/notifications', params }),
      providesTags: ['Notification'],
    }),
    getUnreadCount: builder.query<ApiEnvelope<{ count: number }>, void>({
      query: () => '/notifications/unread',
      providesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation<ApiEnvelope, void>({
      query: () => ({ url: '/notifications/mark-all-read', method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
    analyzeResume: builder.mutation<ApiEnvelope<Record<string, unknown>>, File>({
      query: (file) => {
        const body = new FormData();
        body.append('resume', file);
        return { url: '/ai/analyze-resume', method: 'POST', body };
      },
    }),
    generateProfileSummary: builder.mutation<ApiEnvelope<{ summary: string }>, void>({
      query: () => ({ url: '/ai/profile-summary', method: 'POST' }),
    }),
    recommendSkills: builder.query<ApiEnvelope<{ recommendations: string[] }>, void>({
      query: () => '/ai/recommend-skills',
    }),
    matchJob: builder.mutation<ApiEnvelope<Record<string, unknown>>, string>({
      query: (jobId) => ({ url: `/ai/match-job/${jobId}`, method: 'POST' }),
    }),
    generatePost: builder.mutation<ApiEnvelope<{ postContent: string }>, { prompt: string; tone?: string }>({
      query: (body) => ({ url: '/ai/generate-post', method: 'POST', body }),
    }),
    getSubscription: builder.query<ApiEnvelope<{ subscription: ISubscription | null }>, void>({
      query: () => '/payments/subscription',
      providesTags: ['Subscription'],
    }),
    getBillingHistory: builder.query<ApiEnvelope<{ history: IPayment[] }>, void>({
      query: () => '/payments/billing-history',
      providesTags: ['Subscription'],
    }),
    createCheckout: builder.mutation<ApiEnvelope<{ url: string; isSimulated: boolean }>, { plan: 'premium' | 'pro' }>({
      query: (body) => ({ url: '/payments/create-checkout', method: 'POST', body }),
    }),
    simulatePaymentSuccess: builder.mutation<ApiEnvelope, { plan: 'premium' | 'pro' }>({
      query: (body) => ({ url: '/payments/simulate-success', method: 'POST', body }),
      invalidatesTags: ['User', 'Subscription'],
    }),
    getPlatformStats: builder.query<ApiEnvelope<PlatformStats>, void>({
      query: () => '/admin/stats',
      providesTags: ['User', 'Post', 'Job', 'Subscription'],
    }),
    listAdminUsers: builder.query<ApiEnvelope<IUser[]>, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/admin/users', params }),
      providesTags: ['User'],
    }),
    toggleUserStatus: builder.mutation<ApiEnvelope, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({ url: `/admin/users/${id}/status`, method: 'PATCH', body: { isActive } }),
      invalidatesTags: ['User'],
    }),
    listModerationFeed: builder.query<ApiEnvelope<IPost[]>, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/admin/moderation/feed', params }),
      providesTags: ['Post'],
    }),
  }),
});

export const {
  useAddCommentMutation,
  useAddSkillMutation,
  useAnalyzeResumeMutation,
  useApplyToJobMutation,
  useCreateCheckoutMutation,
  useCreateJobMutation,
  useCreatePostMutation,
  useFollowUserMutation,
  useForgotPasswordMutation,
  useGeneratePostMutation,
  useGenerateProfileSummaryMutation,
  useGetBillingHistoryQuery,
  useGetCandidateDashboardQuery,
  useGetConversationsQuery,
  useGetFeedQuery,
  useGetJobRecommendationsQuery,
  useGetJobsQuery,
  useGetMeQuery,
  useGetMessagesQuery,
  useGetNotificationsQuery,
  useGetPlatformStatsQuery,
  useGetRecruiterDashboardQuery,
  useGetRecommendationsQuery,
  useGetSavedPostsQuery,
  useGetSubscriptionQuery,
  useGetTrendingPostsQuery,
  useGetUnreadCountQuery,
  useListAdminUsersQuery,
  useListModerationFeedQuery,
  useLoginMutation,
  useLogoutSessionMutation,
  useMarkAllNotificationsReadMutation,
  useMatchJobMutation,
  useRecommendSkillsQuery,
  useRegisterMutation,
  useRemoveSkillMutation,
  useResetPasswordMutation,
  useSearchUsersQuery,
  useSendMessageMutation,
  useSimulatePaymentSuccessMutation,
  useTogglePostLikeMutation,
  useTogglePostSaveMutation,
  useToggleSaveJobMutation,
  useToggleUserStatusMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useUploadResumeMutation,
  useVerifyEmailQuery,
} = extendedApi;
