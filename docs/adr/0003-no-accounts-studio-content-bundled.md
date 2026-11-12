# No accounts; all Dancer data stays on the phone; studio Choreographies are bundled

There are no user accounts and no backend for Dancer data. Level, Plan, Attempts and onboarding answers (including aches, which are health-related) live in the browser's storage (IndexedDB) on the Dancer's phone. A Studio dancer's "this week's choreography from your teacher" is bundled with the app as content, not uploaded by a teacher.

We rejected a backend with teacher upload and student login because it is the largest single piece of work and would put personal and health-related data on a server, against the privacy stance of ADR 0001. Teacher-side sharing is a next step. The planned route is share links to video files that the app downloads and analyses on the device (poc-dance already supports this), which needs no server of our own. Consequence: data is lost if the browser storage is cleared, and a Dancer cannot move between devices.
