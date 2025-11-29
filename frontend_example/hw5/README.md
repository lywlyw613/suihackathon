# X-Clone

A Twitter/X clone built with Next.js, featuring OAuth authentication, real-time updates with Pusher, and a full social media experience.

## Deployed Link

**Deployed on Vercel:** https://hw5-sage.vercel.app

## Registration Key

Currently registration is open (no registration key required).

> Note: To restrict registration, set `REG_KEY` in your `.env` file and update this section.

## Features

### Basic Features ✅

#### 🔐 Authentication
- **OAuth Login**
  - Google OAuth integration
  - GitHub OAuth integration
  - Facebook OAuth (optional)
- **UserID System**
  - Custom userID registration (3-20 characters, alphanumeric and underscore)
  - Direct userID login (bypasses OAuth flow)
  - UserID uniqueness validation
- **Session Management**
  - NextAuth.js session handling
  - 30-minute idle timeout with automatic logout
  - Session persistence across page reloads

#### 🔥 Main Menu (Sidebar)
- **Navigation**
  - Home feed link
  - Notifications page (with unread count badge)
  - Profile page link
  - Post creation button (bright background)
- **Custom Design**
  - Custom main menu icon (X logo)
  - Custom SVG icons for each menu item
  - Post button with bright background
  - Other buttons with hover highlight effect
- **User Profile Section**
  - User avatar and name display
  - UserID display
  - Click to show logout option
  - Responsive design (desktop sidebar + mobile bottom nav)

#### ✖️ Profile Page
- **Profile Display**
  - User name (from OAuth provider)
  - Number of posts count
  - Back to Home arrow button
  - Customizable banner image (click to zoom)
  - Customizable avatar image (left-aligned at bottom of banner, click to zoom)
  - UserID display (@userID)
  - Bio with line breaks and clickable links
  - Following/Followers count (clickable to show lists)
- **Profile Tabs**
  - **Posts**: User's own posts (not reposts)
  - **Reposts**: Posts that user has reposted
  - **Likes**: Posts user has liked (private, only visible to owner)
- **Edit Profile**
  - Edit bio, avatar, and banner
  - Avatar and banner image upload via Cloudinary
  - Real-time avatar updates across the app
- **View Other Users**
  - Read-only profile view
  - Follow/Unfollow button
  - View their posts and reposts
  - Cannot see their likes

#### 📝 Post Creation
- **Post Modal**
  - Modal-based post composer
  - Character counter with smart counting
  - Media upload (images and videos)
  - Draft saving functionality
- **Character Limit System**
  - 280 character limit (enforced, cannot exceed)
  - Links count as 23 characters each
  - Hashtags (#hashtag) don't count toward limit
  - Mentions (@mention) don't count toward limit
  - Automatic link detection and hyperlink creation
- **Draft Management**
  - Save draft when closing modal (if content exists)
  - View saved drafts list
  - Load draft into composer
  - Delete drafts with custom confirmation modal
- **Post Actions**
  - Post button publishes the post
  - Close button (X) shows save/discard confirmation
  - Success toast notification after posting
  - Auto-close modal after successful post

#### 📖 Feed & Post Reading
- **Feed Tabs**
  - **All**: All posts from all users (newest first)
  - **Following**: Posts from users you follow (newest first)
- **Inline Post Composer**
  - Expandable textarea in feed
  - Same character limit and validation
  - Real-time character counting
- **Post Display**
  - Author avatar and name
  - Relative time display (e.g., "2 hours ago")
  - Full post content
  - Media embeds (images, videos, YouTube)
  - Interaction counts (comments, reposts, likes)
- **Post Interactions**
  - **Comment**: Click to view post and add recursive comments
  - **Repost**: Toggle repost (green when active)
  - **Like**: Toggle like (red when active)
  - **Delete**: Delete own posts (custom confirmation modal)
- **Recursive Comments**
  - Click post to view post detail page
  - Post displayed at top, comments below
  - Click comment to view comment detail page
  - Comment displayed at top, its replies below
  - Back button navigates to parent post or home
  - Infinite nesting support

#### 🤼 Real-time Updates (Pusher)
- **Live Interactions**
  - Like count updates in real-time
  - Comment count updates in real-time
  - Repost count updates in real-time
  - New post notifications
  - Post deletion updates
  - Follower/following count updates
- **Non-intrusive UX**
  - Own actions update immediately
  - Other users' actions show notification banner
  - Click notification to apply updates and scroll to top
  - Smooth scroll animations

### Advanced Features ✅

#### 🔔 Notifications System
- **Notification Badge**
  - Real-time unread count badge in sidebar
  - Updates automatically when new notifications arrive
  - Shows "9+" for counts over 9
- **Notification Page**
  - List of all notifications (likes, reposts, comments)
  - Click notification to view related post
  - Mark notifications as read
  - Real-time updates via Pusher
- **Notification Types**
  - Like notifications (when someone likes your post)
  - Repost notifications (when someone reposts your post)
  - Comment notifications (when someone comments on your post)

#### 📢 New Post Notice
- **Smart Notification System**
  - Shows notification banner when other users post new content
  - Displays count of new posts
  - Click to view new posts with smooth scroll to top
  - Own posts appear immediately without notification
  - Smooth scroll animation for own posts

#### 🖼️ Media Support
- **Image Upload**
  - Upload images via Cloudinary
  - Multiple images per post (grid layout)
  - Image preview before posting
  - Click image to view full-size modal
  - Image modal shows post content below image
- **Video Upload**
  - Upload videos via Cloudinary
  - Video playback controls
  - Video preview before posting
- **Automatic Media Embeds**
  - YouTube links automatically embed as video player
  - Image URLs automatically display as images
  - Video URLs automatically display as video player
- **Profile Media**
  - Avatar image upload and display
  - Banner image upload and display
  - Click to zoom for avatar and banner
  - Real-time avatar updates across all posts

#### 📱 Mobile Responsive Design
- **Mobile Layout**
  - Bottom navigation bar (mobile only)
  - Top bar with logo and user avatar (mobile only)
  - Full-width content on mobile
  - Desktop sidebar (hidden on mobile)
- **Responsive Components**
  - All pages adapt to screen size
  - Touch-friendly buttons and interactions
  - Optimized spacing and typography
  - Sticky headers with proper mobile positioning

#### ✨ Enhanced UX Features
- **Smooth Animations**
  - Smooth scroll to top when viewing new posts
  - Fade-in/fade-out animations for notifications
  - Hover effects on interactive elements
- **Custom UI Components**
  - Custom modals (no browser native dialogs)
  - Custom confirmation dialogs
  - Toast notifications
  - Loading states with skeleton screens
- **Real-time Count Updates**
  - Follower/following counts update in real-time
  - Post interaction counts update in real-time
  - Notification counts update in real-time
- **Session Management**
  - 30-minute idle timeout
  - Activity tracking (mouse, keyboard, scroll)
  - Automatic session extension on activity
  - Automatic logout on timeout

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Authentication:** NextAuth.js
- **Database:** MongoDB with Prisma ORM
- **Real-time:** Pusher
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- MongoDB database
- OAuth credentials (Google, GitHub, Facebook)
- Pusher account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd hw5
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="mongodb://user:password@localhost:27017/xclone?authSource=admin"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

FACEBOOK_CLIENT_ID="your-facebook-client-id"
FACEBOOK_CLIENT_SECRET="your-facebook-client-secret"

# Pusher
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="your-pusher-cluster"
NEXT_PUBLIC_PUSHER_KEY="your-pusher-key"
NEXT_PUBLIC_PUSHER_CLUSTER="your-pusher-cluster"

# Cloudinary (for media uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# Registration Key (optional)
REG_KEY="your-registration-key"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

### 系統架構圖

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer (Next.js 14)              │
│  React Components | Tailwind CSS | TypeScript            │
└───────────────────────────┬───────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────┐
│                    API Layer                                │
│  RESTful APIs | NextAuth.js | Server Actions              │
└─────────┬───────────────────────┬─────────────────────────┘
          │                       │
┌─────────▼──────────┐  ┌─────────▼──────────┐
│   Database Layer   │  │  Real-time Layer    │
│  MongoDB + Prisma  │  │      Pusher         │
└────────────────────┘  └─────────────────────┘
          │
┌─────────▼──────────┐
│   Media Storage     │
│    Cloudinary       │
└─────────────────────┘
          │
┌─────────▼──────────┐
│   Deployment        │
│      Vercel         │
└─────────────────────┘
```

### 主要技術棧

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: MongoDB with Prisma ORM
- **Real-time**: Pusher
- **Media**: Cloudinary
- **Deployment**: Vercel

## Project Structure

```
hw5/
├── app/
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── profile/          # Profile pages
│   ├── post/             # Post detail pages
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
├── lib/                  # Utility functions
├── prisma/               # Database schema
├── types/                # TypeScript types
└── public/               # Static assets
```

## API Routes

- `GET /api/posts` - Get posts feed
- `POST /api/posts` - Create a post
- `GET /api/posts/[id]` - Get post details
- `DELETE /api/posts/[id]` - Delete a post
- `POST /api/posts/[id]/like` - Like a post
- `DELETE /api/posts/[id]/like` - Unlike a post
- `POST /api/posts/[id]/repost` - Repost
- `DELETE /api/posts/[id]/repost` - Unrepost
- `GET /api/users/[userID]` - Get user profile
- `PATCH /api/users/[userID]` - Update user profile
- `GET /api/users/[userID]/posts` - Get user's posts
- `GET /api/users/[userID]/likes` - Get user's liked posts
- `POST /api/users/[userID]/follow` - Follow user
- `DELETE /api/users/[userID]/follow` - Unfollow user

## Security Notes

- All API routes require authentication
- Users can only edit their own profiles
- Users can only delete their own posts
- Likes are private (only visible to the user)
- Registration key can be required (set REG_KEY in env)

## License

MIT License

