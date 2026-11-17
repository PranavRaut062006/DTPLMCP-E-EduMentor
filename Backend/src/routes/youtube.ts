import express from 'express';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { authMiddleware as authenticateToken } from '../middleware/auth';
import { getDB, User, Content, Topic } from '../db';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const router = express.Router();

const getOAuth2Client = (user?: User | null, redirectUri?: string) => {
  const clientId = user?.youtube_client_id || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = user?.youtube_client_secret || process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/youtube/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured. Please save your Google Client ID and Client Secret in Settings -> YouTube Channel Integration.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
};

/**
 * POST /api/youtube/credentials
 * Saves the faculty member's Google OAuth credentials (client ID, client secret, channel name).
 */
router.post('/credentials', authenticateToken, async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const { clientId, clientSecret, channelName } = req.body;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Both Google Client ID and Google Client Secret are required.' });
    }

    const cleanClientId = clientId.trim();
    const cleanClientSecret = clientSecret.trim();
    const cleanChannelName = channelName ? channelName.trim() : undefined;

    const db = getDB();
    await db.collection<User>('users').updateOne(
      { id: user_id },
      {
        $set: {
          youtube_client_id: cleanClientId,
          youtube_client_secret: cleanClientSecret,
          youtube_channel_name: cleanChannelName,
        }
      }
    );

    // Update runtime env
    process.env.GOOGLE_CLIENT_ID = cleanClientId;
    process.env.GOOGLE_CLIENT_SECRET = cleanClientSecret;

    // Persist to Backend/.env
    try {
      const envPath = path.resolve(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('GOOGLE_CLIENT_ID=')) {
          envContent = envContent.replace(/GOOGLE_CLIENT_ID=.*/g, `GOOGLE_CLIENT_ID=${cleanClientId}`);
        } else {
          envContent += `\nGOOGLE_CLIENT_ID=${cleanClientId}`;
        }
        if (envContent.includes('GOOGLE_CLIENT_SECRET=')) {
          envContent = envContent.replace(/GOOGLE_CLIENT_SECRET=.*/g, `GOOGLE_CLIENT_SECRET=${cleanClientSecret}`);
        } else {
          envContent += `\nGOOGLE_CLIENT_SECRET=${cleanClientSecret}`;
        }
        fs.writeFileSync(envPath, envContent, 'utf8');
      }
    } catch (e) {
      console.warn('Could not update .env file:', e);
    }

    res.json({
      success: true,
      message: 'YouTube credentials saved successfully.',
    });
  } catch (error: any) {
    console.error('Error in /api/youtube/credentials:', error);
    res.status(500).json({ error: 'Failed to save YouTube credentials.' });
  }
});

/**
 * GET /api/youtube/status
 * Check if the authenticated faculty member has connected their YouTube account.
 */
router.get('/status', authenticateToken, async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const db = getDB();

    const user = await db.collection<User>('users').findOne({ id: user_id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasTokens = Boolean(user.youtube_tokens && user.youtube_tokens.access_token);
    const isConfigured = Boolean(
      (user.youtube_client_id && user.youtube_client_secret) ||
      (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    );

    res.json({
      connected: Boolean(user.youtube_connected && hasTokens),
      channelTitle: user.youtube_channel_title || user.youtube_channel_name || null,
      configured: isConfigured,
      clientId: user.youtube_client_id || (process.env.GOOGLE_CLIENT_ID ? 'Configured in .env' : null),
      channelName: user.youtube_channel_name || null,
    });
  } catch (error: any) {
    console.error('Error in /api/youtube/status:', error);
    res.status(500).json({ error: 'Failed to check YouTube connection status' });
  }
});

/**
 * GET /api/youtube/auth-url
 * Generates the Google OAuth 2.0 authorization URL for YouTube upload.
 */
router.get('/auth-url', authenticateToken, async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const topicId = req.query.topicId as string;

    const db = getDB();
    const user = await db.collection<User>('users').findOne({ id: user_id });
    const oauth2Client = getOAuth2Client(user);

    const state = JSON.stringify({
      userId: user_id,
      topicId: topicId || '',
    });

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: Buffer.from(state).toString('base64'),
    });

    res.json({ authUrl });
  } catch (error: any) {
    console.error('Error generating YouTube auth URL:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate YouTube authorization URL. Please configure Google OAuth credentials in Settings.'
    });
  }
});

/**
 * GET /api/youtube/callback
 * Google OAuth 2.0 callback endpoint.
 */
router.get('/callback', async (req: any, res: any) => {
  try {
    const { code, state, error: oauthError } = req.query;

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (oauthError) {
      console.warn('Google OAuth returned error:', oauthError);
      return res.redirect(`${frontendBaseUrl}/faculty/content?youtube_error=${encodeURIComponent(String(oauthError))}`);
    }

    if (!code || !state) {
      return res.status(400).send('Missing authorization code or state.');
    }

    let parsedState: { userId: string; topicId: string };
    try {
      parsedState = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
    } catch {
      return res.status(400).send('Invalid state parameter.');
    }

    const { userId, topicId } = parsedState;
    const db = getDB();
    const user = await db.collection<User>('users').findOne({ id: userId });

    const oauth2Client = getOAuth2Client(user);

    const { tokens } = await oauth2Client.getToken(String(code));
    oauth2Client.setCredentials(tokens);

    // Fetch channel info
    let channelTitle = user?.youtube_channel_name || 'Faculty YouTube Channel';
    try {
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
      const channelRes = await youtube.channels.list({
        part: ['snippet'],
        mine: true,
      });
      if (channelRes.data.items && channelRes.data.items.length > 0) {
        channelTitle = channelRes.data.items[0]?.snippet?.title || channelTitle;
      }
    } catch (e: any) {
      console.warn('Could not fetch YouTube channel title:', e.message);
    }

    await db.collection<User>('users').updateOne(
      { id: userId },
      {
        $set: {
          youtube_tokens: tokens as any,
          youtube_connected: true,
          youtube_channel_title: channelTitle,
        }
      }
    );

    const redirectPath = topicId ? `/faculty/content/${topicId}?youtube_connected=true` : `/faculty/settings?youtube_connected=true`;
    res.redirect(`${frontendBaseUrl}${redirectPath}`);

  } catch (error: any) {
    console.error('Error handling YouTube callback:', error);
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendBaseUrl}/faculty/settings?youtube_error=${encodeURIComponent(error.message || 'Authentication failed')}`);
  }
});

/**
 * POST /api/youtube/upload/:topicId
 * Uploads the already-generated MP4 video for a topic directly to the connected YouTube channel.
 */
router.post('/upload/:topicId', authenticateToken, async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const { topicId } = req.params;
    const { title, description, privacyStatus = 'unlisted' } = req.body;

    const db = getDB();

    const user = await db.collection<User>('users').findOne({ id: user_id });
    if (!user || !user.youtube_tokens || !user.youtube_connected) {
      return res.status(401).json({
        error: 'YouTube account not connected. Please connect your YouTube account in Settings or click Connect.'
      });
    }

    const content = await db.collection<Content>('content').findOne({ topic_id: topicId });
    if (!content || !content.video_url || content.video_status !== 'COMPLETED') {
      return res.status(404).json({
        error: 'No completed lecture video was found for this topic. Please generate the video first.'
      });
    }

    // Resolve local video file path
    const relativeVideoPath = content.video_url.replace(/^\/?videos\/?/, '');
    const videoFilePath = path.join(__dirname, '../../../public/videos', relativeVideoPath);

    if (!fs.existsSync(videoFilePath)) {
      return res.status(404).json({
        error: `Generated video file not found on disk at: ${relativeVideoPath}`
      });
    }

    const topic = await db.collection<Topic>('topics').findOne({ id: topicId });
    const topicTitle = topic?.title || 'Academic Lecture';

    const oauth2Client = getOAuth2Client(user);
    oauth2Client.setCredentials(user.youtube_tokens as any);

    // Save renewed tokens automatically
    oauth2Client.on('tokens', async (newTokens) => {
      console.log('[YouTube] Refreshed OAuth tokens for user', user_id);
      await db.collection<User>('users').updateOne(
        { id: user_id },
        {
          $set: {
            'youtube_tokens.access_token': newTokens.access_token,
            ...(newTokens.refresh_token ? { 'youtube_tokens.refresh_token': newTokens.refresh_token } : {}),
            ...(newTokens.expiry_date ? { 'youtube_tokens.expiry_date': newTokens.expiry_date } : {}),
          }
        }
      );
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const videoTitle = (title || `${topicTitle} — TeachAI Academic Lecture`).substring(0, 99);
    const videoDescription = description ||
      `Academic lecture on "${topicTitle}" created with TeachAI.\n\nGenerated with AI slide visual synchronization and faculty narration.`;

    const validPrivacy = ['private', 'unlisted', 'public'].includes(privacyStatus) ? privacyStatus : 'unlisted';

    console.log(`[YouTube] Starting upload for topic "${topicTitle}" (Privacy: ${validPrivacy})...`);

    const uploadRes = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: videoTitle,
          description: videoDescription,
          categoryId: '27', // Education
          tags: ['TeachAI', 'Education', 'Lecture', topicTitle],
        },
        status: {
          privacyStatus: validPrivacy,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoFilePath),
      },
    });

    const videoId = uploadRes.data.id;
    if (!videoId) {
      throw new Error('YouTube API did not return a valid video ID.');
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`[YouTube] Video uploaded successfully! Video ID: ${videoId} | URL: ${youtubeUrl}`);

    // Update Content in MongoDB
    await db.collection<Content>('content').updateOne(
      { topic_id: topicId },
      {
        $set: {
          youtube_url: youtubeUrl,
          youtube_video_id: videoId,
          youtube_uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
    );

    res.json({
      success: true,
      videoId,
      youtubeUrl,
      title: videoTitle,
      privacyStatus: validPrivacy,
    });

  } catch (error: any) {
    console.error('Error uploading video to YouTube:', error);
    res.status(500).json({
      error: error.message || 'Failed to upload video to YouTube. Check OAuth permissions or quotas.'
    });
  }
});

/**
 * POST /api/youtube/disconnect
 * Disconnects the faculty member's YouTube account.
 */
router.post('/disconnect', authenticateToken, async (req: any, res: any) => {
  try {
    const user_id = req.user.id;
    const db = getDB();

    await db.collection<User>('users').updateOne(
      { id: user_id },
      {
        $set: {
          youtube_tokens: undefined,
          youtube_connected: false,
          youtube_channel_title: undefined,
        }
      }
    );

    res.json({ success: true, message: 'YouTube account disconnected successfully.' });
  } catch (error: any) {
    console.error('Error disconnecting YouTube account:', error);
    res.status(500).json({ error: 'Failed to disconnect YouTube account.' });
  }
});

export default router;
