/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'angular',
        releaseRules: [
          { type: 'refactor', release: 'patch' },
          { type: 'style', release: 'patch' },
          { type: 'feature', release: 'minor' },
          { type: 'perf', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'chore', release: 'patch' },
          { type: 'docs', release: 'patch' },
          { type: 'ci', release: 'patch' },
        ],
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
        },
      },
    ],
    '@semantic-release/release-notes-generator',
    '@semantic-release/gitlab',
    '@semantic-release/changelog',
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
    [
      '@semantic-release/git',
      {
        message:
          'chore(release): ${nextRelease.version} \n\n${nextRelease.notes}',
      },
    ],
  ],
};
