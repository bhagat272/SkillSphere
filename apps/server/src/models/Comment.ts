import mongoose, { Document, Schema } from 'mongoose';

export interface IComment {
  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  parentComment?: mongoose.Types.ObjectId; // null = top-level, set = reply
  likes: mongoose.Types.ObjectId[];
  repliesCount: number;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommentDocument extends IComment, Document {}

const commentSchema = new Schema<ICommentDocument>(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 1000, trim: true },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    repliesCount: { type: Number, default: 0 },
    isEdited: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

commentSchema.index({ post: 1, parentComment: 1, createdAt: -1 });
commentSchema.virtual('likesCount').get(function () {
  return this.likes.length;
});

export const Comment = mongoose.model<ICommentDocument>('Comment', commentSchema);
