import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { srConfig } from '@config';
import sr from '@utils/sr';
import { usePrefersReducedMotion } from '@hooks';
const IframeContainer = styled.div`
  width: 100%;
  height: 700px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Booking = () => {
  const revealContainer = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    sr.reveal(revealContainer.current, srConfig());
  }, []);

  return (
    <section id="booking" ref={revealContainer}>
      <h2 className="numbered-heading overline">Let’s Build Something Great!</h2>
      <h2 className="title">Book a Free Consultation</h2>
      <p>
        Have an exciting idea or need an estimate for your project? Feel free to book a meeting and
        let’s discuss how we can bring it to life in 20-minutes strategy session with me
      </p>
      <IframeContainer>
        <iframe
          title="Google Calendar Appointment Scheduling"
          src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ00pizUVju44r6wK5Z2N1KsOKUiaPGlGGKCRnDURhVfzbPRXQOagMK4cdg5Txt3ym1VQWn5qlMd?gv=true"
          style={{ border: 0, backgroundColor: 'white' }}
          width="100%"
          height="600"
          frameBorder="0"
        />
      </IframeContainer>
    </section>
  );
};

export default Booking;
