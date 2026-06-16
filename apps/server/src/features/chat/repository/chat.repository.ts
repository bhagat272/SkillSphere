import mongoose from 'mongoose';
import { Conversation, Message, IConversationDocument, IMessageDocument } from '../../../models/Chat';

export class ChatRepository {
  async getConversations(userId: string): Promise<IConversationDocument[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return Conversation.find({ participants: userObjectId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'profile.firstName profile.lastName profile.avatar profile.headline role lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'profile.firstName profile.lastName profile.avatar',
        },
      })
      .exec();
  }

  async findOrCreateConversation(
    participantA: string,
    participantB: string
  ): Promise<IConversationDocument> {
    const pA = new mongoose.Types.ObjectId(participantA);
    const pB = new mongoose.Types.ObjectId(participantB);

    // Find direct conversation between pA and pB
    let conversation = await Conversation.findOne({
      participants: { $all: [pA, pB] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [pA, pB],
        unreadCount: new Map([
          [participantA, 0],
          [participantB, 0],
        ]),
      });
      await conversation.save();
    }

    return conversation.populate('participants', 'profile.firstName profile.lastName profile.avatar profile.headline role lastSeen');
  }

  async getMessages(
    conversationId: string,
    skip: number,
    limit: number
  ): Promise<{ messages: IMessageDocument[]; total: number }> {
    const convId = new mongoose.Types.ObjectId(conversationId);
    const [messages, total] = await Promise.all([
      Message.find({ conversation: convId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'profile.firstName profile.lastName profile.avatar profile.headline role')
        .exec(),
      Message.countDocuments({ conversation: convId }),
    ]);

    return { messages, total };
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    fileUrl?: string
  ): Promise<IMessageDocument> {
    const message = new Message({
      conversation: new mongoose.Types.ObjectId(conversationId),
      sender: new mongoose.Types.ObjectId(senderId),
      content,
      type,
      fileUrl,
      readBy: [{ user: new mongoose.Types.ObjectId(senderId), readAt: new Date() }],
    });

    const saved = await message.save();

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: saved._id,
      lastMessageAt: new Date(),
    });

    return saved.populate('sender', 'profile.firstName profile.lastName profile.avatar');
  }
}

export const chatRepository = new ChatRepository();
