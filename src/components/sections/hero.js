import React, { useState, useEffect } from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import styled from 'styled-components';
import { navDelay, loaderDelay } from '@utils';
import { usePrefersReducedMotion } from '@hooks';
import { Link } from 'gatsby';

const StyledHeroSection = styled.section`
  ${({ theme }) => theme.mixins.flexCenter};
  flex-direction: column;
  align-items: flex-start;
  min-height: 100vh;
  height: 100vh;
  padding: 0;

  @media (max-height: 700px) and (min-width: 700px), (max-width: 360px) {
    height: auto;
    padding-top: var(--nav-height);
  }

  h1 {
    margin: 0 0 30px 4px;
    color: var(--green);
    font-family: var(--font-mono);
    font-size: clamp(var(--fz-sm), 5vw, var(--fz-md));
    font-weight: 400;

    @media (max-width: 480px) {
      margin: 0 0 20px 2px;
    }
  }

    p {
    margin: 20px 0 0;
    max-width: 620px;
  }

  .email-link {
    ${({ theme }) => theme.mixins.bigButton};
    margin-top: 50px;
  }

  h4 {
    margin-top: 5px;
    color: var(--slate);
    line-height: 0.9;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: clamp(30px, 6vw, 60px);
  }

.animated-text {
  display: inline-block;
  overflow: hidden;
  height: 0.84em;
  min-width: 220px;
  vertical-align: baseline;
  position: relative;
  color: var(--green);
}

.animated-text div {
  display: flex;
  flex-direction: column;
  height: 100%;
  animation: slideUp 6s infinite;
}

.animated-text div span {
  // padding: 0.25rem 0.5rem;
  white-space: nowrap;
}
@keyframes slideUp {
  0%, 33% { margin-top: 0; } /* First item */
  34%, 66% { margin-top: -0.86em; } /* Second item */
  67%, 100% { margin-top: -1.72em; } /* Third item */
}
  }
`;

const Hero = () => {
  const [isMounted, setIsMounted] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const timeout = setTimeout(() => setIsMounted(true), navDelay);
    return () => clearTimeout(timeout);
  }, []);

  const rotatingWords = ['Web', 'Blockchain', 'AI'];

  const one = <h1>Hi, my name is</h1>;
  const two = <h2 className="big-heading">Waheed Ahmed.</h2>;
  const three = (
    <h4 className="big-heading" style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
      I build things for the
      <span className="animated-text">
        <div>
          {rotatingWords.map((word, index) => (
            <span key={index}>{word}</span>
          ))}
        </div>
      </span>
    </h4>
  );

  const four = (
    <>
      <p>
        I’m a full-stack software engineer passionate about crafting high-performance web
        applications. I specialize in building scalable, user-centric solutions that blend
        innovation with seamless experiences.
        {/* <a href="https://upstatement.com/" target="_blank" rel="noreferrer">
          Upstatement
        </a>
        . */}
      </p>
    </>
  );

  const five = (
    <Link
      className="email-link"
      to="/#booking"
      // href="https://www.newline.co/courses/build-a-spotify-connected-app"
      // target="_blank"
      // rel="noreferrer"
    >
      Book a Free Consultation!
    </Link>
  );

  const items = [one, two, three, four, five];

  return (
    <StyledHeroSection>
      {prefersReducedMotion ? (
        <>
          {items.map((item, i) => (
            <div key={i}>{item}</div>
          ))}
        </>
      ) : (
        <TransitionGroup component={null}>
          {isMounted &&
            items.map((item, i) => (
              <CSSTransition key={i} classNames="fadeup" timeout={loaderDelay}>
                <div style={{ transitionDelay: `${i + 1}00ms` }}>{item}</div>
              </CSSTransition>
            ))}
        </TransitionGroup>
      )}
    </StyledHeroSection>
  );
};

export default Hero;
