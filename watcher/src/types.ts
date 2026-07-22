export interface TicketMessage {
  from: string;
  fromName: string | undefined;
  to: string;
  cc: string | undefined;
  subject: string;
  text: string;
  html: string | undefined;
  messageId: string | undefined;
  receivedAt: string;
}
