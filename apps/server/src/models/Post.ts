import mongoose, { Document, Schema } from 'mongoose';

// ─── Post Model ───────────────────────────────────────────────────────────────
// Schema Design: comments are a separate collection (not embedded) because:
//   - Posts can have thousands of comments (unbounded array anti-pattern avoided)
//   - We need to query/paginate comments independently
//   - Separate collection allows efficient index-based lookup by postId

export type PostVisibility = 'public' | 'connections' | 'private';

export interface IPost {
  author: mongoose.Types.ObjectId;
  content: string;
  images: string[];
  likes: mongoose.Types.ObjectId[];
  savedBy: mongoose.Types.ObjectId[];
  commentsCount: number;
  sharesCount: number;
  tags: string[];
  visibility: PostVisibility;
  isAIGenerated: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPostDocument extends IPost, Document {}

const postSchema = new Schema<IPostDocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 3000,
      trim: true,
    },
    images: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    savedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    tags: [{ type: String, lowercase: true, trim: true }],
    visibility: {
      type: String,
      enum: ['public', 'connections', 'private'],
      default: 'public',
    },
    isAIGenerated: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
postSchema.index({ author: 1, createdAt: -1 }); // User's posts feed
postSchema.index({ createdAt: -1, visibility: 1 }); // Public feed (compound)
postSchema.index({ tags: 1 }); // Tag-based queries
postSchema.index({ likes: 1 }); // Trending: sort by likes length
postSchema.index({ content: 'text', tags: 'text' }); // Full-text search

// ─── Virtuals ─────────────────────────────────────────────────────────────────
postSchema.virtual('likesCount').get(function () {
  return this.likes.length;
});

postSchema.virtual('isLiked').get(function () {
  return false; // Computed per-request via service layer
});

export const Post = mongoose.model<IPostDocument>('Post', postSchema);
