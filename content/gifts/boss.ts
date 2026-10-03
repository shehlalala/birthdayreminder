import type { GiftGuide } from '../types';

// DRAFT sample used to verify static rendering in Phase 1. Real copy for
// every relation is written in Phase 8 for owner review.
export const bossGiftGuide: GiftGuide = {
  relation: 'boss',
  status: 'draft',
  updatedAt: '2026-10-03',
  title: 'Birthday gift ideas for your boss',
  description:
    'What to get your boss for their birthday: modest, professional gift ideas, group gift tips, and what to avoid.',
  answerSummary:
    'A good birthday gift for your boss is modest and impersonal: good coffee or tea, a quality notebook, or a desk plant. If the team gives a group gift, contribute to that instead of giving something on your own.',
  sections: [
    {
      heading: 'What should I get my boss for their birthday?',
      paragraphs: [
        'Keep it small and useful. Gifts to a manager are about acknowledgment, not impressing them, and an expensive gift can feel awkward for both of you.',
      ],
      items: [
        { title: 'Specialty coffee or tea', description: 'Easy to enjoy at work and suits almost anyone.' },
        { title: 'A quality notebook or pen', description: 'Useful every day without being personal.' },
        { title: 'A low-maintenance desk plant', description: 'A succulent or pothos brightens an office and survives neglect.' },
        { title: 'A book related to their interests', description: 'Only if you know what they like to read.' },
        { title: 'A handwritten card', description: 'On its own, a sincere card is often enough.' },
      ],
    },
    {
      heading: 'Should I give my boss a birthday gift on my own?',
      paragraphs: [
        'In most workplaces, a card is enough when you give on your own. A group gift from the team is more common and avoids any sense that you are seeking favor.',
      ],
    },
    {
      heading: 'What gifts should I avoid giving my boss?',
      items: [
        { title: 'Expensive items', description: 'They can create pressure or look like you want something in return.' },
        { title: 'Very personal gifts', description: 'Clothing, perfume and jewelry cross a professional line.' },
        { title: 'Alcohol', description: 'Only if you know they drink and your workplace culture allows it.' },
      ],
    },
  ],
  faqs: [
    {
      question: 'How much should I spend on a birthday gift for my boss?',
      answer: 'Keep it modest. For a group gift, a small contribution from each person is typical.',
    },
    {
      question: 'Is it okay to just give my boss a card?',
      answer: 'Yes. A sincere, handwritten card is appropriate in almost every workplace.',
    },
  ],
};
