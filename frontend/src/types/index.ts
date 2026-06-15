export type Role = 'USER' | 'ADMIN';
export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MENTION' | 'BOOKMARK' | 'REPLY';

export interface UserProfile {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  website: string | null;
  location: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  isVerified: boolean;
  createdAt: string;
  profile: UserProfile | null;
  _count?: {
    posts: number;
    followers: number;
    following: number;
  };
  isFollowing?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  profile: Pick<UserProfile, 'displayName' | 'avatarUrl'> | null;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  postCount?: number;
}

export interface PostAuthor {
  id: string;
  username: string;
  profile: Pick<UserProfile, 'displayName' | 'avatarUrl' | 'bio'> | null;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string;
  contentJson?: Record<string, unknown>;
  coverImage: string | null;
  status: PostStatus;
  publishedAt: string | null;
  readingTime: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  allowComments: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  tags: Array<{ tag: Tag }>;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface CommentAuthor {
  id: string;
  username: string;
  profile: Pick<UserProfile, 'displayName' | 'avatarUrl'> | null;
}

export interface Comment {
  id: string;
  content: string;
  isEdited: boolean;
  likeCount: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  replies?: Comment[];
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId: string | null;
  resourceUrl: string | null;
  isRead: boolean;
  createdAt: string;
  trigger: {
    username: string;
    profile: Pick<UserProfile, 'displayName' | 'avatarUrl'> | null;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: PaginationMeta;
}

export interface DashboardStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
}

export interface SearchResults {
  posts?: Post[];
  users?: User[];
  tags?: Tag[];
}
