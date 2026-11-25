export const siteConfig: {
  name: string;
  title: string;
  url: string;
  email: string;
  socials: { name: string; url: string }[];
  homeTimezone: { label: string; tz: string };
  clientTimezones: { label: string; tz: string }[];
  availability: 'open' | 'busy';
  bookingUrl: string;
} = {
  name: 'Waheed Ahmed',
  title: 'Staff Software Engineer',
  url: 'https://codewithwaheed.com',
  email: 'codewithwaheed2@gmail.com',
  socials: [
    { name: 'GitHub', url: 'https://github.com/codewithwaheed' },
    { name: 'Linkedin', url: 'https://www.linkedin.com/in/codewithwaheed' },
    { name: 'Instagram', url: 'https://www.instagram.com/wah_eed' },
    { name: 'Medium', url: 'https://medium.com/@codewithwaheed' },
    { name: 'Leetcode', url: 'https://leetcode.com/u/codewithwaheed/' },
  ],
  homeTimezone: { label: 'LHR', tz: 'Asia/Karachi' },
  clientTimezones: [
    { label: 'NYC', tz: 'America/New_York' },
    { label: 'LON', tz: 'Europe/London' },
  ],
  availability: 'open',
  bookingUrl:
    'https://calendar.google.com/calendar/appointments/schedules/AcZssZ00pizUVju44r6wK5Z2N1KsOKUiaPGlGGKCRnDURhVfzbPRXQOagMK4cdg5Txt3ym1VQWn5qlMd?gv=true',
};
