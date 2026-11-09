// A release is named by the full commit it was built from. The server reports
// it in /version.json, the build writes it into the page, and an open page
// compares the two; each accepts only a name of this form.
export const releaseRevision = /^[a-f0-9]{40}$/;
