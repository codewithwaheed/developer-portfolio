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

describe('Markdown (rich)', () => {
  it('renders headings, numbered lists, code and safe links only', () => {
    const { container } = render(
      <Markdown
        text={
          '## Title\n1. one\n2. two\n\nUse `npm run dev` and [site](https://a.dev) not [bad](javascript:alert(1))\n```\ncode here\n```'
        }
      />,
    );
    expect(container.querySelector('ol')?.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('p code')).toHaveTextContent('npm run dev');
    expect(container.querySelector('pre')).toHaveTextContent('code here');
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://a.dev');
  });
});
