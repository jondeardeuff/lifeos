# External APIs Integration Guide

## Overview

This document covers all third-party API integrations for Life OS, including setup, usage patterns, and error handling.

## Banking Integration - Plaid

### Setup

```typescript
// config/plaid.ts
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
```

### Supported Account Types

- ✅ Checking accounts
- ✅ Credit cards
- ❌ Savings (future)
- ❌ Investment (future)

### Link Token Creation

```typescript
// services/plaid-service.ts
export async function createLinkToken(userId: string) {
  try {
    const response = await plaidClient.linkTokenCreate({
      client_name: 'Life OS',
      country_codes: ['US'],
      language: 'en',
      user: {
        client_user_id: userId,
      },
      products: ['transactions'],
      account_filters: {
        depository: {
          account_subtypes: ['checking'],
        },
        credit: {
          account_subtypes: ['credit card'],
        },
      },
      webhook: `${process.env.API_URL}/webhooks/plaid`,
    });
    
    return response.data.link_token;
  } catch (error) {
    logger.error('Plaid link token creation failed', { error, userId });
    throw new ExternalAPIError('PLAID_LINK_FAILED', 'Unable to connect to bank');
  }
}
```

### Transaction Sync

```typescript
export async function syncTransactions(
  accessToken: string,
  cursor?: string
): Promise<SyncResult> {
  try {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: cursor || '',
      count: 500,
    });
    
    const { added, modified, removed, next_cursor, has_more } = response.data;
    
    // Process transactions
    const processedTransactions = await Promise.all([
      ...added.map(tx => processPlaidTransaction(tx, 'added')),
      ...modified.map(tx => processPlaidTransaction(tx, 'modified')),
      ...removed.map(tx => processPlaidTransaction(tx, 'removed')),
    ]);
    
    return {
      transactions: processedTransactions,
      nextCursor: next_cursor,
      hasMore: has_more,
    };
  } catch (error) {
    handlePlaidError(error);
  }
}

function processPlaidTransaction(
  plaidTx: PlaidTransaction,
  action: 'added' | 'modified' | 'removed'
): Transaction {
  return {
    externalId: plaidTx.transaction_id,
    accountId: plaidTx.account_id,
    amount: plaidTx.amount * -1, // Plaid uses negative for expenses
    date: plaidTx.date,
    merchantName: plaidTx.merchant_name || plaidTx.name,
    category: mapPlaidCategory(plaidTx.category),
    pending: plaidTx.pending,
    description: plaidTx.name,
    action,
  };
}
```

### Webhook Handling

```typescript
// routes/webhooks/plaid.ts
export async function handlePlaidWebhook(req: Request, res: Response) {
  const { webhook_type, webhook_code, item_id } = req.body;
  
  switch (webhook_type) {
    case 'TRANSACTIONS':
      await handleTransactionWebhook(webhook_code, item_id);
      break;
    case 'ITEM':
      await handleItemWebhook(webhook_code, item_id);
      break;
    case 'ASSETS':
      // Handle asset reports if needed
      break;
  }
  
  res.status(200).json({ received: true });
}

async function handleTransactionWebhook(code: string, itemId: string) {
  switch (code) {
    case 'SYNC_UPDATES_AVAILABLE':
      // Queue transaction sync
      await queueJob('sync-transactions', { itemId });
      break;
    case 'RECURRING_TRANSACTIONS_UPDATE':
      // Update recurring transaction predictions
      await updateRecurringTransactions(itemId);
      break;
  }
}
```

### Error Handling

```typescript
function handlePlaidError(error: any): never {
  const plaidError = error.response?.data;
  
  switch (plaidError?.error_code) {
    case 'ITEM_LOGIN_REQUIRED':
      throw new ExternalAPIError(
        'BANK_REAUTH_REQUIRED',
        'Please reconnect your bank account',
        { retryable: false }
      );
    case 'RATE_LIMIT':
      throw new ExternalAPIError(
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
        { retryAfter: 60 }
      );
    case 'INSTITUTION_DOWN':
      throw new ExternalAPIError(
        'BANK_UNAVAILABLE',
        'Your bank is temporarily unavailable',
        { retryable: true }
      );
    default:
      logger.error('Plaid API error', { error: plaidError });
      throw new ExternalAPIError('PLAID_ERROR', 'Banking service error');
  }
}
```

## Voice Transcription - OpenAI Whisper

### Setup

```typescript
// config/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

### Audio Transcription

```typescript
// services/whisper-service.ts
export async function transcribeAudio(
  audioBuffer: Buffer,
  language: 'en' | 'es' = 'en'
): Promise<TranscriptionResult> {
  try {
    // Convert buffer to File object for API
    const audioFile = new File([audioBuffer], 'audio.webm', {
      type: 'audio/webm',
    });
    
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language,
      response_format: 'verbose_json',
      temperature: 0, // More deterministic results
    });
    
    return {
      text: response.text,
      language: response.language,
      duration: response.duration,
      segments: response.segments?.map(seg => ({
        text: seg.text,
        start: seg.start,
        end: seg.end,
        confidence: seg.confidence || 0.9,
      })),
    };
  } catch (error) {
    handleWhisperError(error);
  }
}

// Streaming transcription for real-time feedback
export async function transcribeStream(
  audioStream: ReadableStream,
  onPartial: (text: string) => void
): Promise<string> {
  const chunks: Uint8Array[] = [];
  const reader = audioStream.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      
      // Process chunks every 2 seconds for partial results
      if (chunks.length % 20 === 0) {
        const partialBuffer = Buffer.concat(chunks);
        const partial = await transcribeAudio(partialBuffer);
        onPartial(partial.text);
      }
    }
    
    const finalBuffer = Buffer.concat(chunks);
    const final = await transcribeAudio(finalBuffer);
    return final.text;
  } finally {
    reader.releaseLock();
  }
}
```

### Language Detection

```typescript
export async function detectLanguage(
  audioBuffer: Buffer
): Promise<'en' | 'es'> {
  // Use first 5 seconds for language detection
  const sampleBuffer = audioBuffer.slice(0, 5 * 16000 * 2); // 5s at 16kHz 16-bit
  
  const response = await openai.audio.transcriptions.create({
    file: new File([sampleBuffer], 'sample.webm'),
    model: 'whisper-1',
    response_format: 'verbose_json',
  });
  
  return response.language === 'spanish' ? 'es' : 'en';
}
```

### Error Handling

```typescript
function handleWhisperError(error: any): never {
  if (error.response?.status === 413) {
    throw new ExternalAPIError(
      'AUDIO_TOO_LARGE',
      'Recording is too long. Please keep recordings under 2 minutes.',
      { maxDuration: 120 }
    );
  }
  
  if (error.response?.status === 429) {
    throw new ExternalAPIError(
      'RATE_LIMITED',
      'Too many voice commands. Please wait a moment.',
      { retryAfter: 30 }
    );
  }
  
  if (error.code === 'ECONNABORTED') {
    throw new ExternalAPIError(
      'TRANSCRIPTION_TIMEOUT',
      'Voice processing took too long. Please try again.',
      { retryable: true }
    );
  }
  
  throw new ExternalAPIError(
    'TRANSCRIPTION_FAILED',
    'Could not process voice command'
  );
}
```

## SMS Notifications - Twilio

### Setup

```typescript
// config/twilio.ts
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export const twilioClient = twilio(accountSid, authToken);
export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
```

### Sending SMS

```typescript
// services/sms-service.ts
export async function sendSMS(
  to: string,
  message: string,
  options?: SMSOptions
): Promise<SMSResult> {
  try {
    // Validate US/Canada number
    if (!isValidNorthAmericanNumber(to)) {
      throw new ValidationError('Invalid phone number. US/Canada only.');
    }
    
    // Ensure message fits in SMS limits
    const truncatedMessage = truncateForSMS(message);
    
    const result = await twilioClient.messages.create({
      body: truncatedMessage,
      to,
      from: TWILIO_PHONE_NUMBER,
      statusCallback: `${process.env.API_URL}/webhooks/twilio/status`,
      ...(options?.mediaUrl && { mediaUrl: [options.mediaUrl] }),
    });
    
    // Log for compliance
    await logSMSActivity({
      messageId: result.sid,
      to: maskPhoneNumber(to),
      length: truncatedMessage.length,
      status: result.status,
    });
    
    return {
      messageId: result.sid,
      status: result.status,
      segmentCount: Math.ceil(truncatedMessage.length / 160),
    };
  } catch (error) {
    handleTwilioError(error);
  }
}

function isValidNorthAmericanNumber(phone: string): boolean {
  // Remove formatting and validate
  const cleaned = phone.replace(/\D/g, '');
  return /^1?[2-9]\d{9}$/.test(cleaned);
}

function truncateForSMS(message: string, maxLength = 1600): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength - 3) + '...';
}
```

### Opt-out Management

```typescript
export async function handleOptOut(phoneNumber: string, keyword: string) {
  const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT'];
  
  if (optOutKeywords.includes(keyword.toUpperCase())) {
    await db.userPreference.update({
      where: { phone: phoneNumber },
      data: { smsOptOut: true, smsOptOutDate: new Date() },
    });
    
    // Send confirmation
    await sendSMS(
      phoneNumber,
      'You have been unsubscribed from Life OS notifications. Reply START to resubscribe.'
    );
  }
}
```

### Status Webhooks

```typescript
// routes/webhooks/twilio.ts
export async function handleTwilioStatusWebhook(req: Request, res: Response) {
  const { MessageSid, MessageStatus, ErrorCode } = req.body;
  
  // Verify webhook signature
  if (!verifyTwilioSignature(req)) {
    return res.status(403).send('Forbidden');
  }
  
  await updateMessageStatus(MessageSid, MessageStatus, ErrorCode);
  
  if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
    await handleFailedMessage(MessageSid, ErrorCode);
  }
  
  res.status(200).send('OK');
}

function verifyTwilioSignature(req: Request): boolean {
  const signature = req.headers['x-twilio-signature'] as string;
  const url = `${process.env.API_URL}${req.originalUrl}`;
  
  return twilioClient.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    req.body
  );
}
```

## Email Service - SendGrid

### Setup

```typescript
// config/sendgrid.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const sendgrid = sgMail;
export const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@lifeos.app';
```

### Email Templates

```typescript
// services/email-service.ts
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: Record<string, any>
): Promise<void> {
  try {
    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: 'Life OS',
      },
      templateId: getTemplateId(template),
      dynamicTemplateData: {
        ...data,
        currentYear: new Date().getFullYear(),
        unsubscribeUrl: `${process.env.APP_URL}/unsubscribe?token=${generateUnsubscribeToken(to)}`,
      },
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    };
    
    await sendgrid.send(msg);
    
    // Log email activity
    await logEmailActivity({
      to,
      template,
      sentAt: new Date(),
    });
  } catch (error) {
    handleSendGridError(error);
  }
}

function getTemplateId(template: EmailTemplate): string {
  const templates = {
    [EmailTemplate.WELCOME]: process.env.SENDGRID_WELCOME_TEMPLATE,
    [EmailTemplate.TASK_REMINDER]: process.env.SENDGRID_TASK_REMINDER_TEMPLATE,
    [EmailTemplate.INVOICE]: process.env.SENDGRID_INVOICE_TEMPLATE,
    [EmailTemplate.WEEKLY_SUMMARY]: process.env.SENDGRID_WEEKLY_SUMMARY_TEMPLATE,
  };
  
  return templates[template]!;
}
```

### Email Parsing (Inbound)

```typescript
// routes/webhooks/sendgrid.ts
export async function handleInboundEmail(req: Request, res: Response) {
  const { from, to, subject, text, html, attachments } = req.body;
  
  // Extract user from email
  const user = await getUserByEmail(extractEmailAddress(to));
  if (!user) {
    return res.status(200).send('OK'); // Silently ignore
  }
  
  // Parse email for commands
  const command = parseEmailCommand(subject, text);
  
  if (command) {
    await processEmailCommand(user.id, command, {
      from,
      attachments: await processAttachments(attachments),
    });
  }
  
  res.status(200).send('OK');
}

function parseEmailCommand(subject: string, body: string): EmailCommand | null {
  // Check subject patterns
  if (subject.toLowerCase().startsWith('task:')) {
    return {
      type: 'CREATE_TASK',
      title: subject.substring(5).trim(),
      description: body,
    };
  }
  
  if (subject.toLowerCase().includes('expense')) {
    return {
      type: 'LOG_EXPENSE',
      data: parseExpenseFromEmail(body),
    };
  }
  
  return null;
}
```

## Calendar Integration APIs

### Google Calendar

```typescript
// services/google-calendar-service.ts
import { google } from 'googleapis';

export async function setupGoogleCalendar(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function syncGoogleEvents(
  calendar: any,
  syncToken?: string
): Promise<CalendarSyncResult> {
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      syncToken,
      maxResults: 100,
      showDeleted: true,
    });
    
    return {
      events: response.data.items.map(mapGoogleEvent),
      nextSyncToken: response.data.nextSyncToken,
    };
  } catch (error) {
    if (error.code === 410) {
      // Sync token expired, full sync needed
      return syncGoogleEvents(calendar);
    }
    throw error;
  }
}
```

## Rate Limiting Strategy

```typescript
// middleware/rate-limit.ts
const rateLimits = {
  plaid: {
    perMinute: 30,
    perHour: 300,
    perDay: 1000,
  },
  whisper: {
    perMinute: 10,
    perHour: 100,
    perDay: 500,
  },
  twilio: {
    perMinute: 60,
    perHour: 500,
    perDay: 5000,
  },
  sendgrid: {
    perMinute: 100,
    perHour: 1000,
    perDay: 10000,
  },
};

export function createRateLimiter(service: keyof typeof rateLimits) {
  const limits = rateLimits[service];
  
  return {
    check: async (key: string): Promise<boolean> => {
      const counts = await Promise.all([
        redis.incr(`${service}:${key}:minute`),
        redis.incr(`${service}:${key}:hour`),
        redis.incr(`${service}:${key}:day`),
      ]);
      
      // Set expiry on first increment
      if (counts[0] === 1) redis.expire(`${service}:${key}:minute`, 60);
      if (counts[1] === 1) redis.expire(`${service}:${key}:hour`, 3600);
      if (counts[2] === 1) redis.expire(`${service}:${key}:day`, 86400);
      
      return (
        counts[0] <= limits.perMinute &&
        counts[1] <= limits.perHour &&
        counts[2] <= limits.perDay
      );
    },
  };
}
```

## API Keys Management

```typescript
// Best practices for API key storage
interface APIConfig {
  service: string;
  keys: {
    production?: string;
    staging?: string;
    development?: string;
  };
  rotationSchedule: string;
  lastRotated: Date;
}

// Rotation reminder system
export async function checkAPIKeyRotation() {
  const configs: APIConfig[] = [
    {
      service: 'Plaid',
      keys: { /* encrypted */ },
      rotationSchedule: 'quarterly',
      lastRotated: new Date('2024-01-01'),
    },
    // ... other services
  ];
  
  for (const config of configs) {
    if (isRotationDue(config)) {
      await notifyAdminForRotation(config.service);
    }
  }
}
```

## Testing External APIs

```typescript
// tests/external-apis.test.ts
describe('External API Integration Tests', () => {
  beforeAll(() => {
    // Use sandbox/test environments
    process.env.PLAID_ENV = 'sandbox';
    process.env.TWILIO_TEST_MODE = 'true';
  });
  
  describe('Plaid Integration', () => {
    it('should handle rate limiting gracefully', async () => {
      // Mock rate limit response
      nock('https://sandbox.plaid.com')
        .post('/transactions/sync')
        .reply(429, { error_code: 'RATE_LIMIT' });
      
      await expect(syncTransactions('test-token'))
        .rejects
        .toThrow('Too many requests');
    });
  });
  
  describe('Whisper Integration', () => {
    it('should transcribe test audio', async () => {
      const testAudio = fs.readFileSync('tests/fixtures/test-audio.webm');
      const result = await transcribeAudio(Buffer.from(testAudio));
      
      expect(result.text).toContain('test phrase');
      expect(result.language).toBe('en');
    });
  });
});
```