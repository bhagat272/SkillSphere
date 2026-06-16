import { Award, FileSearch, Link as LinkIcon, UserRoundCheck } from 'lucide-react';

const skills = ['React Native', 'React.js', 'Node.js', 'Express.js', 'MongoDB', 'Redux Toolkit', 'Socket.io', 'Stripe'];
const profileCards = [
  { title: 'Resume Analyzer', text: 'Upload PDF resumes and receive ATS-focused feedback.', Icon: FileSearch },
  { title: 'Portfolio Manager', text: 'Showcase projects with tags, links, media, and impact.', Icon: Award },
  { title: 'Social Proof', text: 'Followers, endorsements, posts, and recruiter signals.', Icon: UserRoundCheck },
];

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className="h-24 w-24 rounded-lg bg-cyan-400/20" />
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-semibold">Associate Software Engineer</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Full-stack developer focused on React Native, React.js, Node.js, Express.js, MongoDB, Redux, Socket.io, Stripe, Firebase, and REST APIs.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((skill) => <span key={skill} className="rounded-md bg-slate-800 px-2 py-1 text-xs text-cyan-200">{skill}</span>)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 p-4 text-center">
            <p className="text-3xl font-semibold">87%</p>
            <p className="text-xs text-slate-400">Profile complete</p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {profileCards.map(({ title, text, Icon }) => (
          <section key={title} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <Icon className="text-cyan-300" size={22} />
            <p className="mt-4 font-semibold">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
          </section>
        ))}
      </div>
      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-2">
          <LinkIcon className="text-cyan-300" size={18} />
          <h2 className="font-semibold">Portfolio Highlights</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {['Real-time chat platform', 'Recruiter analytics dashboard', 'Stripe subscription flow', 'AI profile generator'].map((item) => (
            <div key={item} className="rounded-lg bg-slate-950 p-4 text-sm text-slate-300">{item}</div>
          ))}
        </div>
      </section>
    </div>
  );
}
