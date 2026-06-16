import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout } from './authSlice';

// Base Query with authentication headers
const baseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any).auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Re-authentication Wrapper for Automatic Token Refresh (JWT rotation)
// Interview note: "How do you handle JWT expiry in a modern SPA?"
// → We catch 401 errors, execute a request to /auth/refresh-token using the HttpOnly cookie,
//   update the Redux store with the new access token, and replay the original request.
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to get a new access token
    const refreshResult = await baseQuery(
      {
        url: '/auth/refresh-token',
        method: 'POST',
      },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      const { accessToken } = (refreshResult.data as { data?: { accessToken: string } }).data ?? {};
      if (!accessToken) {
        api.dispatch(logout());
        return result;
      }
      
      // Fetch user info to ensure we keep the state complete
      const meResult = await baseQuery(
        {
          url: '/auth/me',
          method: 'GET',
          headers: { authorization: `Bearer ${accessToken}` }
        },
        api,
        extraOptions
      );

      const user = (meResult.data as any)?.data?.user;
      if (user) {
        // Update store with new credentials
        api.dispatch(setCredentials({ user, accessToken }));
        // Retry the initial request
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
      }
    } else {
      // Refresh failed — clear local session
      api.dispatch(logout());
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Post',
    'Comment',
    'Job',
    'Conversation',
    'Message',
    'Notification',
    'Subscription',
  ],
  endpoints: () => ({}),
});
