# Accessibility audit

The recorded rendered checks found and fixed accessible-name mismatches on
listing save buttons and the media link, and a wrongly named service-grid DIV.
The [final 11-route/state record](mfalujo23/release-evidence/browser/axe-after-fixes-final.json)
retains the actual passing states. These are automated rendered checks, not a
complete WCAG certification.

Keyboard evidence covers Tab/Shift+Tab, Enter/Space, visible focus, booking
errors and focus return. Responsive observations cover the recorded widths;
they do not establish every viewport or assistive technology.

See [the detailed audit](mfalujo23/security-and-accessibility-audit.md),
[home navigation](mfalujo23/release-evidence/browser/home-keyboard-navigation.json)
and [booking messages](mfalujo23/release-evidence/browser/booking-messages-final.json).
The [new local listing checks](mfalujo23/evidence/listings-browser-review.json)
record zero axe violations and zero incomplete rules on the sample listings,
approved example listings and fictional sponsor destination. Keyboard controls,
filter/reset states and visible focus were checked. At 320 pixels, the inherited
body minimum width caused overflow; removing that one rule resolved it. The
final 320/375/768/1280 viewport checks found no horizontal overflow, with one,
two and three listing columns at 375/768/1280. These were viewport checks, not
new zoom tests. Screen-reader testing and the required human review remain
incomplete. No 400% zoom result is claimed.
