// A release is named by the full commit it was built from. The build writes
// only such a name into the page, and the page reads only such a name, from
// its meta tag and from the deployment's version file alike.
export const releasePattern = /^[a-f0-9]{40}$/;
