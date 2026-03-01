import { Message } from '../types';

export const mockMessages: Message[] = [
  {
    id: '1',
    text: 'Based on analysis of the last 3 weeks, you may be getting close to burnout. I suggest reducing your training by 20%.',
    timestamp: new Date(),
    sender: 'ai',
  },
];

export const mockMessagesWithPlan: Message[] = [
  {
    id: '1',
    text: 'Based on analysis of the last 3 weeks, you may be getting close to burnout. I suggest reducing your training by 20%.',
    timestamp: new Date(),
    sender: 'ai',
  },
  {
    id: '2',
    text: "Here's my suggested training for next week:",
    timestamp: new Date(),
    sender: 'ai',
  },
];
