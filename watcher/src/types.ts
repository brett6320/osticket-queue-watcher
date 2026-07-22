export interface TicketMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string | undefined;
  messageId: string | undefined;
  receivedAt: string;
}
