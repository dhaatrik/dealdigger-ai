// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';

import PriceHistoryModal from '../../components/PriceHistoryModal';
import { Deal, PriceDataPoint } from '../../types';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockDeal: Deal = {
  id: 'deal-123',
  title: 'Test Deal',
  description: 'A test deal description',
  originalPrice: '$100',
  discountedPrice: '$80',
  merchant: 'TestMerchant',
  category: 'TestCategory',
};

const mockPriceHistory: PriceDataPoint[] = [
  { date: '2023-01-01', price: 90 },
  { date: '2023-01-02', price: 80 },
];

describe('PriceHistoryModal', () => {
  it('should render prediction based on deal id length', () => {
    // mockDeal id is "deal-123" length 8 (even -> 0.6 -> likely to remain stable)
    const { unmount } = render(
      <PriceHistoryModal
        deal={mockDeal}
        priceHistory={mockPriceHistory}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/likely to remain stable/i)).toBeDefined();
    unmount();

    // Now test with an odd length id
    const oddDeal = { ...mockDeal, id: 'deal-12' }; // length 7 (odd -> 0.4 -> showing good value)
    render(
      <PriceHistoryModal
        deal={oddDeal}
        priceHistory={mockPriceHistory}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/showing good value/i)).toBeDefined();
  });
});
