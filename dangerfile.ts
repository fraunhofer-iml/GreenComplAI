// Parts of this Dangerfile are based on example code from the Danger JS documentation:
// https://danger.systems/js/guides/getting_started.html
// MIT License

import { danger, markdown, warn } from 'danger';

// ENFORCE LOCKFILE UP TO DATE
const packagesChanged = danger.git.modified_files.includes('package.json');
const lockfileChanged = [
  'yarn.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  'bun.lockb',
].some((file) => danger.git.modified_files.includes(file));

if (packagesChanged && !lockfileChanged) {
  const message = 'Changes were made to package.json, but not to pnpm-lock.yml';
  const idea = 'Perhaps you need to run `pnpm install`?';
  warn(`${message} - <i>${idea}</i>`);
}

// ENCOURAGE SMALLER MRs
const bigPRThreshold = 50;
if (danger.gitlab.mr.changes_count.length > bigPRThreshold) {
  warn(':exclamation: Big MR (' + danger.gitlab.mr.changes_count.length + ')');
  markdown(
    '> (' +
      danger.gitlab.mr.changes_count.length +
      ') : Merge request size seems relatively large. If merge request contains multiple changes, split each into separate MR will helps faster, easier review.'
  );
}

if (!danger.gitlab.mr.assignee) {
  const method = danger.gitlab.mr.title.includes('WIP') ? warn : fail;
  method(
    'This merge request needs an assignee, and optionally include any reviewers.'
  );
}

if (danger.gitlab.mr.description.length < 10) {
  fail('This merge request needs a description.');
}

// Check for Merge Request Description if it only contains Resolves/Related to Issue fail
if (danger.gitlab.mr.description.match(/(Resolves) \D+-\d+/)) {
  fail(
    'Merge Request Description should not only contain Resolves/Related to Issue'
  );
}
