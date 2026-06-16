import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import { logger } from './logger';

// ─── Cloudinary Configuration ─────────────────────────────────────────────────
// Cloudinary handles all file uploads (resumes, avatars, portfolio images).
// Files are stored in organized folders per type for easy CDN management.

export function initCloudinary(): void {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    logger.warn('⚠️  Cloudinary credentials not configured — file uploads will be disabled');
    return;
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  logger.info('✅ Cloudinary initialized');
}

export { cloudinary };

// ─── Cloudinary Upload Folders ────────────────────────────────────────────────
export const cloudinaryFolders = {
  avatars: 'skillsphere/avatars',
  resumes: 'skillsphere/resumes',
  portfolio: 'skillsphere/portfolio',
  posts: 'skillsphere/posts',
};
