import { chatRepository } from '../repository/chat.repository';
import { Conversation, IConversationDocument, IMessageDocument } from '../../../models/Chat';
import { AppError } from '../../../shared/utils/asyncHandler';
import mongoose from 'mongoose';

export class ChatService {
  async getConversations(userId: string): Promise<IConversationDocument[]> {
    return chatRepository.getConversations(userId);
  }

  async getOrCreateConversation(
    userId: string,
    targetUserId: string
  ): Promise<IConversationDocument> {
    if (userId === targetUserId) {
      throw new AppError('You cannot start a conversation with yourself', 400);
    }
    return chatRepository.findOrCreateConversation(userId, targetUserId);
  }

  async getMessages(
    userId: string,
    conversationId: string,
    page: number,
    limit: number
  ): Promise<{ messages: IMessageDocument[]; total: number }> {
    // Security: Check if user is participant of conversation
    const conversation = await Conversation.findOne({
      _id: new mongoose.Types.ObjectId(conversationId),
      participants: new mongoose.Types.ObjectId(userId),
    });

    if (!conversation) {
      throw new AppError('Conversation not found or access denied', 403);
    }

    const skip = (page - 1) * limit;
    return chatRepository.getMessages(conversationId, skip, limit);
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    fileUrl?: string
  ): Promise<IMessageDocument> {
    // Security: Check if user is participant of conversation
    const conversation = await Conversation.findOne({
      _id: new mongoose.Types.ObjectId(conversationId),
      participants: new mongoose.Types.ObjectId(userId),
    });

    if (!conversation) {
      throw new AppError('Conversation not found or access denied', 403);
    }

    return chatRepository.createMessage(conversationId, userId, content, type, fileUrl);
  }
}

export const chatService = new ChatService();
