export interface Channel {
  id: string;
  type: 'whatsapp' | 'instagram';
  externalId: string;
  status: string;
  config: { aiAutoReply?: boolean; [k: string]: unknown };
  createdAt: string;
}

export interface Conversation {
  id: string;
  channelId: string;
  channelType: 'whatsapp' | 'instagram';
  contactExternalId: string;
  contactName: string | null;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  summary: string | null;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | null;
  nextAction: string | null;
  analyzedAt: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  sender: 'contact' | 'ai' | 'human';
  body: string | null;
  mediaUrl: string | null;
  messageType: string;
  createdAt: string;
}
