import { FormEvent, ReactNode, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  Bell,
  BriefcaseBusiness,
  Check,
  CreditCard,
  Heart,
  Home,
  Loader2,
  LogOut,
  MessageSquareText,
  Moon,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { IJob, IPost, IUser } from '@skillsphere/shared';
import { AppDispatch, RootState } from '../store/store';
import { logout, setCredentials, setInitialized, updateUser } from '../store/authSlice';
import {
  ApiEnvelope,
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
  useGetRecommendationsQuery,
  useGetSubscriptionQuery,
  useGetTrendingPostsQuery,
  useGetUnreadCountQuery,
  useListAdminUsersQuery,
  useListModerationFeedQuery,
  useLoginMutation,
  useLogoutSessionMutation,
  useMarkAllNotificationsReadMutation,
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
} from '../store/endpoints';
import { useSocket } from '../hooks/useSocket';

const navItems = [
  { to: '/', label: 'Feed', icon: Home },
  { to: '/network', label: 'Network', icon: Users },
  { to: '/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { to: '/chat', label: 'Chat', icon: MessageSquareText },
  { to: '/ai', label: 'AI', icon: Sparkles },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
];

const demoPosts = [
  'Built refresh token rotation with device-aware sessions, suspicious reuse detection, Redis-backed verification, and HttpOnly cookies.',
  'Designed MongoDB schemas for a professional network: embedded profile data, indexed feed queries, job applications, and aggregation dashboards.',
  'Integrated Socket.io chat patterns with typing events, read receipts, presence, and queued notification fan-out.',
];

const demoJobs: IJob[] = [
  {
    _id: 'demo-job-1',
    postedBy: 'demo',
    title: 'Full Stack Developer',
    description: 'Own MERN SaaS features across React, Node.js, MongoDB, Socket.io, Stripe, and AI workflows.',
    company: 'SeedStage Labs',
    location: 'Remote',
    isRemote: true,
    jobType: 'full-time',
    salary: { min: 1200, max: 2800, currency: 'USD' },
    skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'Socket.io'],
    status: 'active',
    applications: [],
    views: 128,
    savedBy: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.accessToken);
  const initialized = useSelector((state: RootState) => state.auth.isInitialized);
  const { data, isError, isFetching } = useGetMeQuery(undefined, { skip: initialized && !token });

  useEffect(() => {
    if (data?.data?.user && token) {
      dispatch(updateUser(data.data.user));
      dispatch(setInitialized(true));
    } else if (isError || (!isFetching && !token)) {
      dispatch(setInitialized(true));
    }
  }, [data, dispatch, isError, isFetching, token]);

  if (!initialized && isFetching) {
    return <FullPageLoader />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { isAuthenticated, user, isInitialized } = useSelector((state: RootState) => state.auth);
  if (!isInitialized) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles?.length && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

function Shell() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: unread } = useGetUnreadCountQuery();
  const [logoutSession] = useLogoutSessionMutation();
  useSocket();

  const doLogout = async () => {
    await logoutSession().catch(() => undefined);
    dispatch(logout());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-slate-800 bg-slate-950 px-5 py-6 lg:block">
        <Brand />
        <nav className="mt-8 space-y-1">
          {navItems.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-6 left-5 right-5 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="truncate text-sm font-medium">{displayName(user)}</p>
          <p className="mt-1 text-xs text-slate-400">{user?.role ?? 'user'} · {user?.subscriptionTier ?? 'free'}</p>
          <button onClick={doLogout} className="mt-3 inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur lg:px-8">
          <div className="lg:hidden"><Brand compact /></div>
          <div className="hidden w-full max-w-xl items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-400 lg:flex">
            <Search size={17} />
            <span className="text-sm">Search people, posts, jobs, skills</span>
          </div>
          <div className="flex items-center gap-2">
            <IconButton label="Theme"><Moon size={17} /></IconButton>
            <NavLink to="/notifications" className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-800 text-slate-300">
              <Bell size={17} />
              {!!unread?.data?.count && <span className="absolute -right-1 -top-1 rounded-full bg-cyan-400 px-1.5 text-[10px] font-bold text-slate-950">{unread.data.count}</span>}
            </NavLink>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/ai" element={<AIStudioPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-800 bg-slate-950 lg:hidden">
          {navItems.slice(0, 5).map((item) => (
            <NavLink key={item.to} to={item.to} className="grid place-items-center py-3 text-xs text-slate-400">
              <item.icon size={18} />
              <span className="mt-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
}

function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [login, state] = useLoginMutation();
  const [form, setForm] = useState({ email: '', password: '' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await login(form).unwrap();
    if (response.data) {
      dispatch(setCredentials(response.data));
      navigate('/');
    }
  };

  return (
    <AuthLayout title="Welcome Back" aside="Login to manage your network, jobs, AI tools, billing, and dashboard workflows.">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <TextField label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
        <SubmitButton loading={state.isLoading}>Login</SubmitButton>
        <FormError error={state.error} />
      </form>
      <div className="mt-5 flex justify-between text-sm text-slate-400">
        <NavLink to="/register" className="hover:text-white">Create account</NavLink>
        <NavLink to="/forgot-password" className="hover:text-white">Forgot password</NavLink>
      </div>
    </AuthLayout>
  );
}

function RegisterPage() {
  const [register, state] = useRegisterMutation();
  const [done, setDone] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'user' as 'user' | 'recruiter' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await register(form).unwrap();
    setDone(response.message);
  };

  return (
    <AuthLayout title="Create Account" aside="Register as a candidate or recruiter. Email verification is queued by the backend.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="First name" value={form.firstName} onChange={(firstName) => setForm({ ...form, firstName })} />
          <TextField label="Last name" value={form.lastName} onChange={(lastName) => setForm({ ...form, lastName })} />
        </div>
        <TextField label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <TextField label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
        <Segmented
          value={form.role}
          options={[['user', 'Candidate'], ['recruiter', 'Recruiter']]}
          onChange={(role) => setForm({ ...form, role: role as 'user' | 'recruiter' })}
        />
        <SubmitButton loading={state.isLoading}>Register</SubmitButton>
        <FormSuccess message={done} />
        <FormError error={state.error} />
      </form>
      <NavLink to="/login" className="mt-5 block text-sm text-slate-400 hover:text-white">Already have an account?</NavLink>
    </AuthLayout>
  );
}

function ForgotPasswordPage() {
  const [forgot, state] = useForgotPasswordMutation();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await forgot({ email }).unwrap();
    setDone(response.message);
  };
  return (
    <AuthLayout title="Reset Access" aside="Request a secure password reset link. The backend hides whether the email exists.">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Email" type="email" value={email} onChange={setEmail} />
        <SubmitButton loading={state.isLoading}>Send Reset Link</SubmitButton>
        <FormSuccess message={done} />
        <FormError error={state.error} />
      </form>
    </AuthLayout>
  );
}

function ResetPasswordPage() {
  const { token = '' } = useParams();
  const [reset, state] = useResetPasswordMutation();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await reset({ token, password }).unwrap();
    setDone(response.message);
  };
  return (
    <AuthLayout title="Set New Password" aside="Reset tokens are short-lived and revoke existing sessions after success.">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="New password" type="password" value={password} onChange={setPassword} />
        <SubmitButton loading={state.isLoading}>Reset Password</SubmitButton>
        <FormSuccess message={done} />
        <FormError error={state.error} />
      </form>
    </AuthLayout>
  );
}

function VerifyEmailPage() {
  const { token = '' } = useParams();
  const { data, isLoading, isError } = useVerifyEmailQuery(token);
  return (
    <AuthLayout title="Email Verification" aside="Verification confirms account ownership before login is allowed.">
      <StatusBox loading={isLoading} error={isError ? 'Verification link is invalid or expired.' : undefined}>
        {data?.message ?? 'Email verified successfully.'}
      </StatusBox>
      <NavLink to="/login" className="mt-5 inline-flex rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Go to login</NavLink>
    </AuthLayout>
  );
}

function FeedPage() {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('');
  const [tags, setTags] = useState('mern,saas');
  const feed = useGetFeedQuery({ page, limit: 8 });
  const trending = useGetTrendingPostsQuery();
  const [createPost, createState] = useCreatePostMutation();
  const posts = feed.data?.data ?? [];
  const trendingPosts = trending.data?.data?.posts ?? [];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    await createPost({ content: draft, tags: splitCsv(tags), visibility: 'public' }).unwrap();
    setDraft('');
  };

  return (
    <Page title="Professional Feed" eyebrow="Posts, reactions, comments, saves, trending">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <Panel>
            <form onSubmit={submit}>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-28 w-full resize-none rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm outline-none focus:border-cyan-400" placeholder="Share a build update, hiring note, or project milestone" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <input value={tags} onChange={(event) => setTags(event.target.value)} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="tags" />
                <SubmitButton loading={createState.isLoading} compact><Send size={15} /> Publish</SubmitButton>
              </div>
            </form>
          </Panel>
          <AsyncBlock loading={feed.isLoading} error={feed.isError} empty={!posts.length}>
            {(posts.length ? posts : demoPosts.map((content, index) => mockPost(content, index))).map((post) => <PostCard key={post._id} post={post} />)}
          </AsyncBlock>
          {feed.data?.meta?.hasNextPage && <button onClick={() => setPage(page + 1)} className="w-full rounded-lg border border-slate-800 py-3 text-sm">Load more</button>}
        </section>
        <aside className="space-y-4">
          <Panel title="Trending">
            {(trendingPosts.length ? trendingPosts : demoPosts.map((content, index) => mockPost(content, index))).slice(0, 4).map((post) => (
              <div key={post._id} className="border-b border-slate-800 py-3 last:border-0">
                <p className="line-clamp-2 text-sm text-slate-200">{post.content}</p>
                <p className="mt-1 text-xs text-slate-500">{post.likesCount ?? post.likes.length} reactions</p>
              </div>
            ))}
          </Panel>
          <Panel title="Feed Architecture">
            <Metric label="Pagination" value={feed.data?.meta?.totalPages ?? 1} />
            <Metric label="Cache tags" value="Post, Comment" />
            <Metric label="Actions" value="Like, Save, Comment" />
          </Panel>
        </aside>
      </div>
    </Page>
  );
}

function PostCard({ post }: { post: IPost }) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [toggleLike] = useTogglePostLikeMutation();
  const [toggleSave] = useTogglePostSaveMutation();
  const [addComment, commentState] = useAddCommentMutation();

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;
    await addComment({ postId: post._id, content: comment }).unwrap();
    setComment('');
  };

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start gap-3">
        <Avatar user={typeof post.author === 'object' ? post.author : undefined} />
        <div>
          <p className="font-semibold">{typeof post.author === 'object' ? displayName(post.author) : 'SkillSphere Member'}</p>
          <p className="text-xs text-slate-500">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-200">{post.content}</p>
      <TagList tags={post.tags} />
      <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300">
        <ActionButton onClick={() => toggleLike(post._id)}><Heart size={16} /> {post.likesCount ?? post.likes.length}</ActionButton>
        <ActionButton onClick={() => setCommentOpen(!commentOpen)}><MessageSquareText size={16} /> {post.commentsCount}</ActionButton>
        <ActionButton onClick={() => toggleSave(post._id)}><Check size={16} /> Save</ActionButton>
      </div>
      {commentOpen && (
        <form onSubmit={submitComment} className="mt-4 flex gap-2">
          <input value={comment} onChange={(event) => setComment(event.target.value)} className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="Add a comment" />
          <button disabled={commentState.isLoading} className="rounded-lg bg-cyan-400 px-3 text-slate-950"><Send size={16} /></button>
        </form>
      )}
    </article>
  );
}

function NetworkPage() {
  const [query, setQuery] = useState('');
  const search = useSearchUsersQuery({ q: query, page: 1, limit: 12 }, { skip: query.length < 2 });
  const recommendations = useGetRecommendationsQuery();
  const [followUser] = useFollowUserMutation();
  const people = query.length >= 2 ? search.data?.data ?? [] : recommendations.data?.data?.users ?? [];

  return (
    <Page title="Network" eyebrow="Search, recommendations, follow graph">
      <div className="mb-5 flex gap-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-400" placeholder="Search by name, role, or email" />
      </div>
      <AsyncBlock loading={search.isFetching || recommendations.isLoading} error={search.isError || recommendations.isError} empty={!people.length}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {people.map((person) => (
            <Panel key={person._id}>
              <Avatar user={person} size="lg" />
              <p className="mt-4 font-semibold">{displayName(person)}</p>
              <p className="mt-1 text-sm text-slate-400">{person.profile.headline ?? person.role}</p>
              <p className="mt-3 text-xs text-slate-500">{person.skills.slice(0, 3).map((skill) => skill.name).join(', ') || 'Skills pending'}</p>
              <button onClick={() => followUser(person._id)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2 text-sm"><UserPlus size={16} /> Follow</button>
            </Panel>
          ))}
        </div>
      </AsyncBlock>
    </Page>
  );
}

function JobsPage() {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const jobsQuery = useGetJobsQuery({ page: 1, limit: 20, q: query || undefined });
  const recommended = useGetJobRecommendationsQuery();
  const candidate = useGetCandidateDashboardQuery();
  const jobs = jobsQuery.data?.data ?? [];
  const visibleJobs = jobs.length ? jobs : demoJobs;

  return (
    <Page title="Job Marketplace" eyebrow="Recruiter posting, candidate applications, saved jobs">
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-72 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-400" placeholder="Search jobs" />
        <button onClick={() => setShowCreate(!showCreate)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"><Plus size={16} /> Post Job</button>
      </div>
      {showCreate && <CreateJobPanel onClose={() => setShowCreate(false)} />}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          <AsyncBlock loading={jobsQuery.isLoading} error={jobsQuery.isError} empty={!visibleJobs.length}>
            {visibleJobs.map((job) => <JobCard key={job._id} job={job} />)}
          </AsyncBlock>
        </section>
        <aside className="space-y-4">
          <Panel title="Candidate Pipeline">
            <Metric label="Applied jobs" value={candidate.data?.data?.jobs?.length ?? 0} />
            <Metric label="Recommended" value={recommended.data?.data?.jobs?.length ?? 0} />
            <Metric label="Search results" value={jobsQuery.data?.meta?.total ?? visibleJobs.length} />
          </Panel>
          <Panel title="Recommended Roles">
            {(recommended.data?.data?.jobs ?? []).slice(0, 4).map((job) => <p key={job._id} className="border-b border-slate-800 py-2 text-sm last:border-0">{job.title}</p>)}
          </Panel>
        </aside>
      </div>
    </Page>
  );
}

function CreateJobPanel({ onClose }: { onClose: () => void }) {
  const [createJob, state] = useCreateJobMutation();
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: 'Remote',
    description: '',
    jobType: 'full-time' as IJob['jobType'],
    isRemote: true,
    skills: 'React,Node.js,MongoDB,TypeScript',
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createJob({ ...form, skills: splitCsv(form.skills), salary: { currency: 'USD' } }).unwrap();
    onClose();
  };
  return (
    <Panel title="Create Job">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <TextField label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
        <TextField label="Company" value={form.company} onChange={(company) => setForm({ ...form, company })} />
        <TextField label="Location" value={form.location} onChange={(location) => setForm({ ...form, location })} />
        <TextField label="Skills" value={form.skills} onChange={(skills) => setForm({ ...form, skills })} />
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-24 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm outline-none md:col-span-2" placeholder="Description" />
        <div className="md:col-span-2"><SubmitButton loading={state.isLoading}>Create Job</SubmitButton></div>
        <FormError error={state.error} />
      </form>
    </Panel>
  );
}

function JobCard({ job }: { job: IJob }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [applyToJob, applyState] = useApplyToJobMutation();
  const [toggleSave] = useToggleSaveJobMutation();
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{job.title}</p>
          <p className="text-sm text-slate-400">{job.company} · {job.location} · {job.jobType}</p>
        </div>
        <button onClick={() => toggleSave(job._id)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Save</button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{job.description}</p>
      <TagList tags={job.skills} />
      <form onSubmit={(event) => { event.preventDefault(); applyToJob({ id: job._id, coverLetter }); }} className="mt-4 flex gap-2">
        <input value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="Short cover letter" />
        <button disabled={applyState.isLoading} className="rounded-lg bg-cyan-400 px-3 text-sm font-semibold text-slate-950">Apply</button>
      </form>
    </article>
  );
}

function ChatPage() {
  const conversations = useGetConversationsQuery();
  const firstConversation = conversations.data?.data?.conversations?.[0];
  const [selected, setSelected] = useState<string | undefined>(firstConversation?._id);
  useEffect(() => {
    if (!selected && firstConversation?._id) setSelected(firstConversation._id);
  }, [firstConversation, selected]);
  const messages = useGetMessagesQuery({ conversationId: selected ?? '', page: 1, limit: 30 }, { skip: !selected });
  const [sendMessage, sendState] = useSendMessageMutation();
  const [content, setContent] = useState('');
  const { socket } = useSocket();

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !content.trim()) return;
    socket?.emit('typing:stop', { conversationId: selected });
    await sendMessage({ conversationId: selected, content }).unwrap();
    setContent('');
  };

  return (
    <Page title="Real-Time Chat" eyebrow="Conversations, messages, typing, presence-ready socket hook">
      <div className="grid min-h-[640px] overflow-hidden rounded-lg border border-slate-800 bg-slate-900 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-800 p-4 lg:border-b-0 lg:border-r">
          {(conversations.data?.data?.conversations ?? []).map((conversation) => (
            <button key={conversation._id} onClick={() => setSelected(conversation._id)} className={`mb-2 block w-full rounded-lg p-3 text-left ${selected === conversation._id ? 'bg-slate-800' : 'bg-slate-950'}`}>
              <p className="text-sm font-medium">{conversation.participants.map(displayName).join(', ')}</p>
              <p className="text-xs text-slate-500">{new Date(conversation.lastMessageAt).toLocaleString()}</p>
            </button>
          ))}
          {!conversations.data?.data?.conversations?.length && <EmptyState title="No conversations yet" text="Start one from a user profile or seed chat data in the backend." />}
        </aside>
        <section className="flex flex-col">
          <div className="border-b border-slate-800 p-4">
            <p className="font-semibold">Conversation</p>
            <p className="text-xs text-emerald-300">Socket connected: {socket?.connected ? 'yes' : 'ready'}</p>
          </div>
          <div className="flex-1 space-y-3 p-5">
            {(messages.data?.data ?? []).map((message) => <Bubble key={message._id} mine={false}>{message.content}</Bubble>)}
            {!messages.data?.data?.length && <Bubble mine={false}>Messages will appear here once a conversation exists.</Bubble>}
          </div>
          <form onSubmit={send} className="border-t border-slate-800 p-4">
            <div className="flex gap-2">
              <input value={content} onChange={(event) => setContent(event.target.value)} className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="Type a message" />
              <button disabled={sendState.isLoading || !selected} className="rounded-lg bg-cyan-400 px-3 text-slate-950"><Send size={17} /></button>
            </div>
          </form>
        </section>
      </div>
    </Page>
  );
}

function AIStudioPage() {
  const [prompt, setPrompt] = useState('How I built a production MERN auth system');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [generatePost, postState] = useGeneratePostMutation();
  const [generateSummary, summaryState] = useGenerateProfileSummaryMutation();
  const [analyzeResume, resumeState] = useAnalyzeResumeMutation();
  const skills = useRecommendSkillsQuery();

  return (
    <Page title="AI Studio" eyebrow="Resume analyzer, profile summary, skills, job matching, post generation">
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Post Generator">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-28 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm outline-none" />
          <button onClick={() => generatePost({ prompt, tone: 'professional' })} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Generate</button>
          <ResultBox loading={postState.isLoading}>{postState.data?.data?.postContent}</ResultBox>
        </Panel>
        <Panel title="Profile Summary">
          <button onClick={() => generateSummary()} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950">Generate Summary</button>
          <ResultBox loading={summaryState.isLoading}>{summaryState.data?.data?.summary}</ResultBox>
        </Panel>
        <Panel title="Resume Analyzer">
          <FileInput accept="application/pdf" onChange={setResumeFile} />
          <button disabled={!resumeFile} onClick={() => resumeFile && analyzeResume(resumeFile)} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Analyze Resume</button>
          <ResultBox loading={resumeState.isLoading}>{resumeState.data ? JSON.stringify(resumeState.data.data, null, 2) : undefined}</ResultBox>
        </Panel>
        <Panel title="Skill Recommendations">
          <div className="flex flex-wrap gap-2">
            {(skills.data?.data?.recommendations ?? ['Docker', 'CI/CD', 'System Design', 'Testing']).map((skill) => <span key={skill} className="rounded-md bg-slate-800 px-2 py-1 text-xs text-cyan-200">{skill}</span>)}
          </div>
        </Panel>
      </div>
    </Page>
  );
}

function BillingPage() {
  const subscription = useGetSubscriptionQuery();
  const history = useGetBillingHistoryQuery();
  const [checkout, checkoutState] = useCreateCheckoutMutation();
  const [simulate] = useSimulatePaymentSuccessMutation();
  const plans = [
    { id: 'premium' as const, price: '$19', label: 'Premium', features: ['AI profile tools', 'Saved jobs', 'Advanced analytics'] },
    { id: 'pro' as const, price: '$49', label: 'Pro', features: ['Recruiter analytics', 'Priority AI matching', 'Team-ready workflows'] },
  ];

  const startCheckout = async (plan: 'premium' | 'pro') => {
    const response = await checkout({ plan }).unwrap();
    if (response.data?.isSimulated) {
      await simulate({ plan }).unwrap();
    } else if (response.data?.url) {
      window.location.href = response.data.url;
    }
  };

  return (
    <Page title="Billing" eyebrow="Stripe checkout, simulated development payments, history">
      <div className="grid gap-5 lg:grid-cols-2">
        {plans.map((plan) => (
          <Panel key={plan.id} title={plan.label}>
            <p className="text-4xl font-semibold">{plan.price}<span className="text-sm text-slate-400"> / month</span></p>
            <div className="mt-5 space-y-2">
              {plan.features.map((feature) => <p key={feature} className="flex items-center gap-2 text-sm text-slate-300"><Check size={16} className="text-cyan-300" /> {feature}</p>)}
            </div>
            <button onClick={() => startCheckout(plan.id)} disabled={checkoutState.isLoading} className="mt-5 w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Upgrade</button>
          </Panel>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Current Subscription">
          <Metric label="Plan" value={subscription.data?.data?.subscription?.plan ?? 'free'} />
          <Metric label="Status" value={subscription.data?.data?.subscription?.status ?? 'inactive'} />
        </Panel>
        <Panel title="Payment History">
          {(history.data?.data?.history ?? []).map((payment) => <Metric key={payment._id} label={payment.description} value={`${payment.currency.toUpperCase()} ${payment.amount}`} />)}
          {!history.data?.data?.history?.length && <EmptyState title="No payments" text="Checkout history will appear after the first upgrade." />}
        </Panel>
      </div>
    </Page>
  );
}

function NotificationsPage() {
  const notifications = useGetNotificationsQuery({ page: 1, limit: 30 });
  const [markAll] = useMarkAllNotificationsReadMutation();
  return (
    <Page title="Notifications" eyebrow="Queued and real-time notification center" action={<button onClick={() => markAll()} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Mark all read</button>}>
      <Panel>
        <AsyncBlock loading={notifications.isLoading} error={notifications.isError} empty={!notifications.data?.data?.length}>
          {(notifications.data?.data ?? []).map((item) => (
            <div key={item._id} className="border-b border-slate-800 py-4 last:border-0">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-slate-400">{item.message}</p>
            </div>
          ))}
        </AsyncBlock>
      </Panel>
    </Page>
  );
}

function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [profile, setProfile] = useState({
    firstName: user?.profile.firstName ?? '',
    lastName: user?.profile.lastName ?? '',
    headline: user?.profile.headline ?? '',
    bio: user?.profile.bio ?? '',
    location: user?.profile.location ?? '',
  });
  const [skill, setSkill] = useState({ name: '', level: 'intermediate' as const });
  const [updateProfileMutation, updateState] = useUpdateProfileMutation();
  const [addSkillMutation] = useAddSkillMutation();
  const [removeSkill] = useRemoveSkillMutation();
  const [uploadAvatar] = useUploadAvatarMutation();
  const [uploadResume] = useUploadResumeMutation();

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const response = await updateProfileMutation(profile).unwrap();
    if (response.data?.user) dispatch(updateUser(response.data.user));
  };
  const addSkill = async (event: FormEvent) => {
    event.preventDefault();
    if (!skill.name.trim()) return;
    const response = await addSkillMutation(skill).unwrap();
    if (response.data?.user) dispatch(updateUser(response.data.user));
    setSkill({ name: '', level: 'intermediate' });
  };

  return (
    <Page title="Profile" eyebrow="Completion, skills, portfolio, resume, uploads">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Panel title="Public Profile">
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <Avatar user={user ?? undefined} size="xl" />
            <div>
              <p className="text-xl font-semibold">{displayName(user)}</p>
              <p className="text-sm text-slate-400">{user?.profile.headline ?? 'Headline pending'}</p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="grid gap-3 md:grid-cols-2">
            <TextField label="First name" value={profile.firstName} onChange={(firstName) => setProfile({ ...profile, firstName })} />
            <TextField label="Last name" value={profile.lastName} onChange={(lastName) => setProfile({ ...profile, lastName })} />
            <TextField label="Headline" value={profile.headline} onChange={(headline) => setProfile({ ...profile, headline })} />
            <TextField label="Location" value={profile.location} onChange={(location) => setProfile({ ...profile, location })} />
            <textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} className="min-h-28 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm outline-none md:col-span-2" placeholder="Bio" />
            <div className="md:col-span-2"><SubmitButton loading={updateState.isLoading}>Save Profile</SubmitButton></div>
          </form>
        </Panel>
        <aside className="space-y-5">
          <Panel title="Completion">
            <p className="text-4xl font-semibold">{user?.profileCompletion ?? 0}%</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400" style={{ width: `${user?.profileCompletion ?? 0}%` }} /></div>
          </Panel>
          <Panel title="Uploads">
            <FileInput accept="image/*" onChange={(file) => uploadAvatar(file)} label="Avatar" />
            <div className="mt-3"><FileInput accept="application/pdf" onChange={(file) => uploadResume(file)} label="Resume PDF" /></div>
          </Panel>
        </aside>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Skills">
          <form onSubmit={addSkill} className="flex gap-2">
            <input value={skill.name} onChange={(event) => setSkill({ ...skill, name: event.target.value })} className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none" placeholder="Add skill" />
            <button className="rounded-lg bg-cyan-400 px-3 text-sm font-semibold text-slate-950">Add</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {(user?.skills ?? []).map((item) => (
              <button key={item.name} onClick={() => removeSkill(item.name)} className="rounded-md bg-slate-800 px-2 py-1 text-xs text-cyan-200">{item.name} · {item.level}</button>
            ))}
          </div>
        </Panel>
        <Panel title="Portfolio">
          {(user?.portfolio ?? []).map((item) => <Metric key={item.title} label={item.title} value={item.tags.join(', ')} />)}
          {!user?.portfolio?.length && <EmptyState title="Portfolio is empty" text="Backend model supports portfolio items; add a form next when expanding project CRUD." />}
        </Panel>
      </div>
    </Page>
  );
}

function AdminPage() {
  const stats = useGetPlatformStatsQuery();
  const users = useListAdminUsersQuery({ page: 1, limit: 10 });
  const moderation = useListModerationFeedQuery({ page: 1, limit: 10 });
  const [toggleStatus] = useToggleUserStatusMutation();
  const metrics = stats.data?.data?.metrics;

  return (
    <Page title="Admin Dashboard" eyebrow="Analytics, moderation, users, subscriptions">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Users" value={metrics?.totalUsers ?? 0} />
        <Stat label="Premium" value={metrics?.premiumUsers ?? 0} />
        <Stat label="Jobs" value={metrics?.totalJobs ?? 0} />
        <Stat label="Revenue" value={`$${Math.round((metrics?.totalRevenue ?? 0) / 100)}`} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Users">
          {(users.data?.data ?? []).map((user) => (
            <div key={user._id} className="flex items-center justify-between border-b border-slate-800 py-3 last:border-0">
              <div>
                <p className="text-sm font-medium">{displayName(user)}</p>
                <p className="text-xs text-slate-500">{user.email} · {user.role}</p>
              </div>
              <button onClick={() => toggleStatus({ id: user._id, isActive: !user.isActive })} className="rounded-lg border border-slate-700 px-3 py-1 text-xs">{user.isActive ? 'Suspend' : 'Activate'}</button>
            </div>
          ))}
        </Panel>
        <Panel title="Moderation">
          {(moderation.data?.data ?? []).map((post) => <Metric key={post._id} label={post.content.slice(0, 48)} value={post.commentsCount} />)}
          {!moderation.data?.data?.length && <EmptyState title="No moderation items" text="Flagged or high-engagement posts appear here." />}
        </Panel>
      </div>
    </Page>
  );
}

function Page({ title, eyebrow, action, children }: { title: string; eyebrow: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:px-8 lg:pb-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-cyan-300">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function AuthLayout({ title, aside, children }: { title: string; aside: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-slate-950 text-slate-100 lg:grid-cols-[1fr_480px]">
      <section className="hidden bg-slate-900 p-10 lg:flex lg:flex-col lg:justify-between">
        <Brand />
        <div>
          <h1 className="text-5xl font-semibold tracking-normal">SkillSphere AI</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">{aside}</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-5">
        <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-400 text-slate-950"><Sparkles size={21} /></div>
      {!compact && <div><p className="text-lg font-semibold">SkillSphere AI</p><p className="text-xs text-slate-400">MERN SaaS portfolio</p></div>}
    </div>
  );
}

function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">{title && <h2 className="mb-4 text-base font-semibold">{title}</h2>}{children}</section>;
}

function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm text-slate-300">{label}<input required value={value} type={type} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400" /></label>;
}

function SubmitButton({ loading, compact, children }: { loading?: boolean; compact?: boolean; children: ReactNode }) {
  return <button disabled={loading} className={`inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-400 font-semibold text-slate-950 disabled:opacity-60 ${compact ? 'px-3 py-2 text-sm' : 'w-full px-4 py-2.5 text-sm'}`}>{loading && <Loader2 className="animate-spin" size={16} />}{children}</button>;
}

function Segmented({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-950 p-1">{options.map(([id, label]) => <button type="button" key={id} onClick={() => onChange(id)} className={`rounded-md px-3 py-2 text-sm ${value === id ? 'bg-cyan-400 text-slate-950' : 'text-slate-400'}`}>{label}</button>)}</div>;
}

function FileInput({ accept, onChange, label = 'Upload' }: { accept: string; onChange: (file: File) => void; label?: string }) {
  return <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-300 hover:border-cyan-400"><Upload size={16} /> {label}<input type="file" accept={accept} className="hidden" onChange={(event) => event.target.files?.[0] && onChange(event.target.files[0])} /></label>;
}

function AsyncBlock({ loading, error, empty, children }: { loading?: boolean; error?: boolean; empty?: boolean; children: ReactNode }) {
  if (loading) return <Panel><Loader2 className="animate-spin text-cyan-300" /></Panel>;
  if (error) return <EmptyState title="Unable to load" text="Check authentication, backend services, or network configuration." />;
  if (empty) return <EmptyState title="Nothing here yet" text="Create data or seed the backend to populate this view." />;
  return <>{children}</>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-center"><p className="font-semibold">{title}</p><p className="mt-2 text-sm text-slate-400">{text}</p></div>;
}

function StatusBox({ loading, error, children }: { loading?: boolean; error?: string; children: ReactNode }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm">{loading ? 'Loading...' : error ?? children}</div>;
}

function ResultBox({ loading, children }: { loading?: boolean; children?: ReactNode }) {
  return <pre className="mt-4 min-h-28 whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-sm text-slate-300">{loading ? 'Generating...' : children ?? 'Result will appear here.'}</pre>;
}

function FormError({ error }: { error: unknown }) {
  const message = (error as { data?: ApiEnvelope })?.data?.message;
  return message ? <p className="text-sm text-rose-300">{message}</p> : null;
}

function FormSuccess({ message }: { message: string }) {
  return message ? <p className="text-sm text-emerald-300">{message}</p> : null;
}

function IconButton({ label, children }: { label: string; children: ReactNode }) {
  return <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-800 text-slate-300" aria-label={label}>{children}</button>;
}

function ActionButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-3 py-1.5 hover:border-cyan-400">{children}</button>;
}

function Metric({ label, value }: { label: ReactNode; value: ReactNode }) {
  return <div className="flex items-center justify-between border-b border-slate-800 py-3 last:border-0"><span className="text-sm text-slate-400">{label}</span><span className="text-sm font-semibold text-slate-100">{value}</span></div>;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <Panel><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></Panel>;
}

function Avatar({ user, size = 'md' }: { user?: IUser; size?: 'md' | 'lg' | 'xl' }) {
  const classes = size === 'xl' ? 'h-24 w-24 text-2xl' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-sm';
  return <div className={`${classes} grid shrink-0 place-items-center rounded-lg bg-cyan-400/20 font-semibold text-cyan-200`}>{displayName(user).slice(0, 1)}</div>;
}

function TagList({ tags }: { tags: string[] }) {
  return <div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="rounded-md bg-slate-800 px-2 py-1 text-xs text-cyan-200">#{tag}</span>)}</div>;
}

function Bubble({ mine, children }: { mine: boolean; children: ReactNode }) {
  return <div className={`max-w-xl rounded-lg px-4 py-3 text-sm ${mine ? 'ml-auto bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-100'}`}>{children}</div>;
}

function FullPageLoader() {
  return <div className="grid min-h-screen place-items-center bg-slate-950 text-cyan-300"><Loader2 className="animate-spin" /></div>;
}

function displayName(user?: IUser | null) {
  if (!user) return 'SkillSphere Member';
  return user.fullName || `${user.profile.firstName} ${user.profile.lastName}`.trim() || user.email;
}

function splitCsv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function mockPost(content: string, index: number): IPost {
  return {
    _id: `demo-post-${index}`,
    author: 'demo',
    content,
    images: [],
    likes: [],
    savedBy: [],
    commentsCount: 3 + index,
    sharesCount: 2,
    tags: ['mern', 'production', 'portfolio'],
    visibility: 'public',
    isAIGenerated: false,
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    likesCount: 24 + index,
  };
}

function AppRoutes() {
  return (
    <AuthBootstrap>
      <Routes>
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/*" element={<ProtectedRoute><Shell /></ProtectedRoute>} />
      </Routes>
    </AuthBootstrap>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
