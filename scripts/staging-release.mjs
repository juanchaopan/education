// A release is named by the full SHA of the main commit it was built from.
export const releaseRevision = /^[a-f0-9]{40}$/;

export function validateRelease(settings) {
  const origin = new URL(settings.origin);
  if (origin.protocol !== 'https:' || origin.origin !== settings.origin)
    throw new Error('An exact HTTPS staging origin is required');
  if (!releaseRevision.test(settings.revision)) throw new Error('A full release SHA is required');
  if (!/^prj_[\w]+$/.test(settings.projectId) || !/^team_[\w]+$/.test(settings.teamId))
    throw new Error('Staging project and team IDs are required');
  return origin.hostname;
}

async function waitForBuild(options, id) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const deployment = await options.api('GET', `/v13/deployments/${id}`);
    if (deployment.projectId !== options.projectId)
      throw new Error('Candidate belongs to another project');
    if (deployment.readyState === 'READY') {
      if (!/^[a-z0-9-]+\.vercel\.app$/.test(deployment.url))
        throw new Error('Invalid candidate hostname');
      return `https://${deployment.url}`;
    }
    if (['ERROR', 'CANCELED'].includes(deployment.readyState))
      throw new Error('Candidate build failed');
    await options.wait(5000);
  }
  throw new Error('Candidate build timed out');
}

export async function releaseStaging(options) {
  const alias = validateRelease(options);
  const project = await options.api('GET', `/v9/projects/${options.projectId}`);
  if (project.name !== 'education-staging' || project.nodeVersion !== '24.x')
    throw new Error('A dedicated staging project on Node 24 is required');
  await options.stillCurrent();
  const candidate = await options.api('POST', '/v13/deployments', {
    name: 'education-staging',
    target: 'staging',
    project: options.projectId,
    files: options.files,
    env: {
      ...options.runtimeEnv,
      APP_ORIGIN: options.origin,
      REGISTRATION_ENABLED: 'true',
      STAGING_DATABASE: 'true',
    },
    build: { env: { RELEASE_SHA: options.revision } },
    meta: { educationRevision: options.revision, educationEnvironment: 'staging' },
  });
  if (!/^dpl_[\w]+$/.test(candidate.id)) throw new Error('Invalid candidate deployment ID');
  let measurements;
  try {
    const url = await waitForBuild(options, candidate.id);
    await options.migrate();
    measurements = await options.smoke(url, options.origin, options.revision);
    await options.stillCurrent();
  } catch (error) {
    // The stable alias has not been changed; remove only this failed candidate.
    try {
      await options.api('DELETE', `/v13/deployments/${candidate.id}`);
    } catch {
      throw new Error('Release failed; candidate cleanup also failed', { cause: error });
    }
    throw error;
  }
  // A timeout during promotion has an unknown result: never delete a possibly live candidate.
  await options.api('POST', `/v2/deployments/${candidate.id}/aliases`, { alias });
  const active = await options.api('GET', `/v4/aliases/${alias}`);
  if (active.deploymentId !== candidate.id || active.projectId !== options.projectId) {
    throw new Error(
      'Staging alias promotion could not be verified; inspect the provider before retrying',
    );
  }
  return {
    origin: options.origin,
    revision: options.revision,
    deploymentId: candidate.id,
    measurements,
  };
}
