import { Request, Response } from 'express';
import { chatService } from '../service/chat.service';
import { sendResponse } from '../../../shared/utils/response';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { getPagination } from '../../../shared/utils/pagination';

export class ChatController {
  // GET /api/v1/chat/conversations
  getConversations = asyncHandler(async (req: Request, res: Response) => {
    const conversations = await chatService.getConversations(req.user!.userId);
    sendResponse.success(res, { conversations });
  });

  // POST /api/v1/chat/conversations
  getOrCreateConversation = asyncHandler(async (req: Request, res: Response) => {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      sendResponse.badRequest(res, 'Target user ID is required');
      return;
    }
    const conversation = await chatService.getOrCreateConversation(
      req.user!.userId,
      targetUserId
    );
    sendResponse.success(res, { conversation });
  });

  // GET /api/v1/chat/conversations/:id/messages
  getMessages = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPagination(req);
    const { messages, total } = await chatService.getMessages(
      req.user!.userId,
      req.params.id,
      page,
      limit
    );
    sendResponse.paginated(res, messages, total, page, limit);
  });

  // POST /api/v1/chat/conversations/:id/messages
  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const { content, type, fileUrl } = req.body;
    if (!content) {
      sendResponse.badRequest(res, 'Content is required');
      return;
    }
    const message = await chatService.sendMessage(
      req.user!.userId,
      req.params.id,
      content,
      type,
      fileUrl
    );
    sendResponse.success(res, { message }, 'Message sent successfully');
  });
}

export const chatController = new ChatController();
