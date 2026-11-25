import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FitCard, Markdown } from './ChatPanel';

afterEach(cleanup);

describe('Markdown', () => {
  it('renders bullets, bold and italic without injecting HTML', () => {
    const { container } = render(
      <Markdown text={'Hi **there** and *you*\n- one\n- two <img src=x>'} />,
    );
    expect(container.querySelector('strong')).toHaveTextContent('there');
    expect(container.querySelector('em')).toHaveTextContent('you');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('FitCard', () => {
  it('shows verdict, matches, gaps, project buttons and a booking button', () => {
    render(
      <FitCard
        fit={{
          verdict: 'strong',
          summary: 's',
          matches: [{ requirement: 'React', evidence: 'micro frontends' }],
          gaps: [{ requirement: 'Go', note: 'adjacent' }],
          projectIds: ['zorx'],
        }}
        projectTitles={{ zorx: 'Zorx' }}
      />,
    );
    expect(screen.getByText('Strong fit')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zorx' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book a call' })).toBeInTheDocument();
  });
});
