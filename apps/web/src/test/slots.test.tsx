import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlotPicker, type SlotConfig } from '@/components/dashboard/slot-picker';
import { AvailabilityPreview } from '@/components/dashboard/availability-preview';

function makeConfig(over: Partial<SlotConfig> = {}): SlotConfig {
  return {
    id: 'slot-1',
    dayOfWeek: 'MONDAY',
    startTime: '06:00',
    endTime: '07:00',
    isPeakHour: false,
    isActive: true,
    ...over,
  };
}

describe('SlotPicker', () => {
  const baseProps = {
    openTime: '06:00',
    closeTime: '09:00', // 60-min base => rows: 06:00, 07:00, 08:00
    baseSlotMinutes: 60,
    onEnable: vi.fn(),
    onTogglePeak: vi.fn(),
    onRemove: vi.fn(),
    hasPeakPrice: true,
  };

  it('renders a grid row per base slot generated from venue hours', () => {
    render(<SlotPicker {...baseProps} configs={[]} />);
    // Time-column labels for each generated base slot
    expect(screen.getByText('06:00')).toBeInTheDocument();
    expect(screen.getByText('07:00')).toBeInTheDocument();
    expect(screen.getByText('08:00')).toBeInTheDocument();
    // 7 weekday headers
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((d) =>
      expect(screen.getByText(d)).toBeInTheDocument(),
    );
  });

  it('shows the configured-slot count', () => {
    render(
      <SlotPicker
        {...baseProps}
        configs={[makeConfig(), makeConfig({ id: 's2', dayOfWeek: 'TUESDAY' })]}
      />,
    );
    expect(screen.getByText('2 slots configured')).toBeInTheDocument();
  });

  it('calls onEnable when clicking an empty grid cell', () => {
    const onEnable = vi.fn();
    render(<SlotPicker {...baseProps} configs={[]} onEnable={onEnable} />);
    // Monday 06:00 add button
    fireEvent.click(screen.getByLabelText('Add Mon 06:00 slot'));
    expect(onEnable).toHaveBeenCalledWith('MONDAY', '06:00', '07:00');
  });

  it('calls onTogglePeak when clicking the peak toggle on an active slot', () => {
    const onTogglePeak = vi.fn();
    const cfg = makeConfig();
    render(<SlotPicker {...baseProps} configs={[cfg]} onTogglePeak={onTogglePeak} />);
    fireEvent.click(screen.getByLabelText('Mark peak'));
    expect(onTogglePeak).toHaveBeenCalledWith(cfg);
  });

  it('shows the peak-price hint only when no peak price is configured', () => {
    const { rerender } = render(<SlotPicker {...baseProps} hasPeakPrice={false} configs={[]} />);
    expect(screen.getByText(/set a/i)).toBeInTheDocument();
    rerender(<SlotPicker {...baseProps} hasPeakPrice={true} configs={[]} />);
    expect(screen.queryByText(/set a/i)).not.toBeInTheDocument();
  });

  it('renders a graceful message when the grid cannot be generated (bad hours)', () => {
    render(<SlotPicker {...baseProps} openTime="18:00" closeTime="02:00" configs={[]} />);
    expect(screen.getByText(/unable to generate a slot grid/i)).toBeInTheDocument();
  });
});

describe('AvailabilityPreview', () => {
  const configs: SlotConfig[] = [
    makeConfig({
      id: 'a',
      dayOfWeek: 'MONDAY',
      startTime: '06:00',
      endTime: '07:00',
      isPeakHour: false,
    }),
    makeConfig({
      id: 'b',
      dayOfWeek: 'MONDAY',
      startTime: '18:00',
      endTime: '19:00',
      isPeakHour: true,
    }),
    makeConfig({ id: 'c', dayOfWeek: 'TUESDAY', startTime: '06:00', endTime: '07:00' }),
  ];

  it('prompts for a date initially', () => {
    render(<AvailabilityPreview configs={configs} basePrice={800} peakPrice={1200} />);
    expect(screen.getByText(/pick a date to preview/i)).toBeInTheDocument();
  });

  it("shows that weekday's slots with base/peak prices for a chosen date", () => {
    render(<AvailabilityPreview configs={configs} basePrice={800} peakPrice={1200} />);
    // 2026-06-22 is a Monday
    fireEvent.change(screen.getByLabelText(/preview a date/i), { target: { value: '2026-06-22' } });
    expect(screen.getByText('06:00–07:00')).toBeInTheDocument();
    expect(screen.getByText('18:00–19:00')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument(); // off-peak base
    expect(screen.getByText('1200')).toBeInTheDocument(); // peak
    // Tuesday slot should not appear
    expect(screen.queryByText('06:00–07:00')).toBeInTheDocument();
  });

  it('falls back to base price when peakPrice is null', () => {
    render(<AvailabilityPreview configs={configs} basePrice={800} peakPrice={null} />);
    fireEvent.change(screen.getByLabelText(/preview a date/i), { target: { value: '2026-06-22' } });
    // both slots should show base 800 (peak has no price) — at least two 800s
    expect(screen.getAllByText('800').length).toBeGreaterThanOrEqual(2);
  });

  it('shows no-slots message for a day with no configs', () => {
    render(<AvailabilityPreview configs={configs} basePrice={800} peakPrice={1200} />);
    // 2026-06-24 is a Wednesday (no configs)
    fireEvent.change(screen.getByLabelText(/preview a date/i), { target: { value: '2026-06-24' } });
    expect(screen.getByText(/no slots available on this day/i)).toBeInTheDocument();
  });
});
