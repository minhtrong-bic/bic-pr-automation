const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require('@octokit/rest');

const AUTO_PREFIX = '[AUTO]';

const octokit = new Octokit({auth: core.getInput('GITHUB_TOKEN')});
async function execute()
{
    try {
        const headBranch = github.context.payload.pull_request.head.ref;
        const targetBranch = github.context.payload.pull_request.base.ref;
        const title = github.context.payload.pull_request.title;

        const downStreamPromise = autoCreatePRsToDownStreamBranches(title, headBranch, targetBranch);
        const upStreamPromise = autoCreatePRsToUpStreamBranches(title, headBranch, targetBranch);
        await Promise.all([downStreamPromise, upStreamPromise]);
    } catch (error) {
        core.setFailed(error.message);
    }
}

function autoCreatePRsToDownStreamBranches(prTitle, headBranch, targetBranch) {
    if (targetBranch === 'master' || targetBranch.indexOf('release') !== -1) {
        return autoCreatePR(prTitle, headBranch, 'staging');
    } else if (targetBranch === 'staging') {
        return autoCreatePR(prTitle, headBranch, 'develop');
    }
}

function autoCreatePRsToUpStreamBranches(prTitle, headBranch, targetBranch) {
    console.log(github.context.actor);
    console.log(github.context.payload.pull_request);
    if (prTitle.indexOf(AUTO_PREFIX) === 0) {
        return;
    }

    if (targetBranch === 'develop') {
        return autoCreatePR(prTitle, headBranch, 'staging');
    }
}
function autoCreatePR(prTitle, headBranch, downstreamBranch) {
    return new Promise((resolve, reject) => {
        octokit.repos.compareCommits({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            base: downstreamBranch,
            head: headBranch,
        }).then(comparison => {
            if (comparison.data.files.length > 0) {
                console.log('There are files that have changed between the base branch and the specified branch.');
                comparison.data.files.forEach(file => console.log(file.filename));
                octokit.pulls.create({
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                    title: '[AUTO] ' + prTitle,
                    head: headBranch,
                    base: downstreamBranch,
                    body: 'Auto created',
                }).then((response) => {
                    const pr = response.data;
                    octokit.issues.addLabels({
                        owner: github.context.repo.owner,
                        repo: github.context.repo.repo,
                        issue_number: pr.number,
                        labels: ['auto', downstreamBranch],
                    }).then();
                    resolve();
                }).catch(error => reject(error));
            } else {
                resolve();
            }
        }).catch(error => reject(error));
    });

}

execute().then();