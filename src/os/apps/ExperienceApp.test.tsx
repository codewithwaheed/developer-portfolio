import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Job } from '@/content/types';
import { ExperienceApp } from './ExperienceApp';

const job = (o: Partial<Job> & { company: string; title: string; range: string }): Job => ({
  slug: o.company,
  location: 'Lahore, PK',
  url: 'https://example.com',
  bullets: [],
  order: 1,
  ...o,
});

const jobs: Job[] = [
  job({
    company: '10Pearls',
    title: 'Staff Software Engineer',
    range: 'Jan 2023 - Present',
    bullets: ['Led micro frontends for high-traffic apps'],
  }),
  job({
    company: 'WebWrite',
    title: 'Full Stack Developer',
    range: 'Jan 2019 - Dec 2020',
    bullets: ['Shipped a CMS'],
  }),
];

const row = (company: string) =>
  screen.getAllByRole('button').find((b) => b.textContent?.includes(company))!;

afterEach(() => cleanup());

describe('<ExperienceApp>', () => {
  it('shows process names and status', () => {
    render(<ExperienceApp jobs={jobs} />);
    expect(row('10Pearls')).toHaveTextContent('10pearls.staff');
    expect(row('10Pearls')).toHaveTextContent('running');
    expect(row('WebWrite')).toHaveTextContent('webwrite.full');
    expect(row('WebWrite')).toHaveTextContent('exited 0');
  });

  it('expands a row to show bullets as log lines', async () => {
    const user = userEvent.setup();
    render(<ExperienceApp jobs={jobs} />);
    expect(row('10Pearls')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/micro frontends/)).toBeNull();
    await user.click(row('10Pearls'));
    expect(row('10Pearls')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/micro frontends/)).toBeVisible();
  });

  it('shows the promotion path for a role with several titles', async () => {
    const user = userEvent.setup();
    render(
      <ExperienceApp
        jobs={[
          {
            ...jobs[0],
            roles: [{ title: 'Staff Software Engineer' }, { title: 'Senior Software Engineer' }],
          },
        ]}
      />,
    );
    expect(screen.getByText('promoted')).toBeInTheDocument();
    await user.click(row('10Pearls'));
    expect(screen.getByText('Senior Software Engineer')).toBeVisible();
  });
});
