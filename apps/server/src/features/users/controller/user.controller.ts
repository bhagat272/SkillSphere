import { Request, Response } from 'express';
import { userService } from '../service/user.service';
import { sendResponse } from '../../../shared/utils/response';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { getPagination } from '../../../shared/utils/pagination';

export class UserController {
  // GET /api/v1/users/:id
  getUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.id);
    sendResponse.success(res, { user });
  });

  // PUT /api/v1/users/profile
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.user!.userId, req.body);
    sendResponse.success(res, { user }, 'Profile updated successfully');
  });

  // POST /api/v1/users/avatar
  uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      sendResponse.badRequest(res, 'No file uploaded');
      return;
    }
    const user = await userService.uploadAvatar(
      req.user!.userId,
      req.file.buffer,
      req.file.mimetype
    );
    sendResponse.success(res, { user }, 'Avatar updated successfully');
  });

  // POST /api/v1/users/resume
  uploadResume = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      sendResponse.badRequest(res, 'No file uploaded');
      return;
    }
    const user = await userService.uploadResume(
      req.user!.userId,
      req.file.buffer,
      req.file.originalname
    );
    sendResponse.success(res, { user }, 'Resume uploaded successfully');
  });

  // POST /api/v1/users/skills
  addSkill = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.addSkill(req.user!.userId, req.body);
    sendResponse.success(res, { user }, 'Skill added');
  });

  // DELETE /api/v1/users/skills/:skillName
  removeSkill = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.removeSkill(req.user!.userId, req.params.skillName);
    sendResponse.success(res, { user }, 'Skill removed');
  });

  // POST /api/v1/users/:id/follow
  follow = asyncHandler(async (req: Request, res: Response) => {
    await userService.followUser(req.user!.userId, req.params.id);
    sendResponse.success(res, null, 'User followed successfully');
  });

  // DELETE /api/v1/users/:id/follow
  unfollow = asyncHandler(async (req: Request, res: Response) => {
    await userService.unfollowUser(req.user!.userId, req.params.id);
    sendResponse.success(res, null, 'User unfollowed successfully');
  });

  // GET /api/v1/users/search?q=...
  searchUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req);
    const { q, role } = req.query as { q: string; role?: string };
    const { users, total } = await userService.searchUsers(q, { role }, page, limit);
    sendResponse.paginated(res, users, total, page, limit);
  });

  // GET /api/v1/users/recommendations
  getRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const users = await userService.getRecommendations(req.user!.userId);
    sendResponse.success(res, { users });
  });
}

export const userController = new UserController();
